import type {
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { SignJWT, jwtVerify } from "jose";
import { RemoteStore } from "@unforgit/db";

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubRepo {
  id: number;
  full_name: string;
  owner: {
    login: string;
  };
  name: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

interface CallbackQuery {
  code: string;
  state?: string;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("JWT_SECRET or ADMIN_PASSWORD environment variable is required");
  }
  return new TextEncoder().encode(secret);
}

async function createUserToken(user: {
  id: string;
  githubId: number;
  githubLogin: string;
  isAdmin: boolean;
}): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({
    sub: user.id,
    githubId: user.githubId,
    githubLogin: user.githubLogin,
    isAdmin: user.isAdmin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyUserToken(
  token: string
): Promise<{ id: string; githubId: number; githubLogin: string; isAdmin: boolean } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.sub as string,
      githubId: payload.githubId as number,
      githubLogin: payload.githubLogin as string,
      isAdmin: payload.isAdmin as boolean,
    };
  } catch {
    return null;
  }
}

async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth not configured");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return data.access_token;
}

async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub user");
  }

  return response.json();
}

async function getGitHubUserRepos(accessToken: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      break;
    }

    const pageRepos: GitHubRepo[] = await response.json();
    if (pageRepos.length === 0) break;

    repos.push(...pageRepos);

    if (pageRepos.length < perPage) break;
    page++;
  }

  return repos;
}

function getPermissionLevel(
  permissions?: GitHubRepo["permissions"]
): "admin" | "write" | "read" {
  if (!permissions) return "read";
  if (permissions.admin) return "admin";
  if (permissions.push) return "write";
  return "read";
}

export const authRoutes: FastifyPluginAsync<{ store: RemoteStore }> = async (
  app,
  { store }
) => {
  app.get("/v1/auth/github", async (_request, reply) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL;

    if (!clientId) {
      return reply.status(503).send({
        error: "Service Unavailable",
        message: "GitHub OAuth is not configured",
      });
    }

    const state = crypto.randomUUID();
    const scope = "read:user,user:email,repo";

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", state);
    if (callbackUrl) {
      authUrl.searchParams.set("redirect_uri", callbackUrl);
    }

    return reply.redirect(authUrl.toString());
  });

  app.get<{ Querystring: CallbackQuery }>(
    "/v1/auth/github/callback",
    async (request, reply) => {
      const { code } = request.query;

      if (!code) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Missing code parameter",
        });
      }

      try {
        const accessToken = await exchangeCodeForToken(code);
        const githubUser = await getGitHubUser(accessToken);
        const githubRepos = await getGitHubUserRepos(accessToken);

        const user = await store.upsertUser({
          githubId: githubUser.id,
          githubLogin: githubUser.login,
          name: githubUser.name,
          email: githubUser.email,
          avatarUrl: githubUser.avatar_url,
        });

        for (const repo of githubRepos) {
          const permission = getPermissionLevel(repo.permissions);
          await store.upsertRepoAccess({
            userId: user.id,
            orgId: repo.owner.login,
            repoId: repo.name,
            permission,
          });
        }

        const token = await createUserToken({
          id: user.id,
          githubId: user.githubId,
          githubLogin: user.githubLogin,
          isAdmin: user.isAdmin,
        });

        const adminUrl = process.env.ADMIN_DASHBOARD_URL || "http://localhost:3939";
        return reply.redirect(`${adminUrl}/auth/callback?token=${token}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        app.log.error(`GitHub OAuth error: ${message}`);

        const adminUrl = process.env.ADMIN_DASHBOARD_URL || "http://localhost:3939";
        return reply.redirect(`${adminUrl}/auth/callback?error=${encodeURIComponent(message)}`);
      }
    }
  );

  app.get("/v1/auth/me", async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Missing Authorization header",
      });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid Authorization header format",
      });
    }

    const payload = await verifyUserToken(token);

    if (!payload) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    const user = await store.getUserById(payload.id);

    if (!user) {
      return reply.status(404).send({
        error: "Not Found",
        message: "User not found",
      });
    }

    const repoAccess = await store.getUserRepoAccess(user.id);

    return reply.send({
      id: user.id,
      githubId: user.githubId,
      githubLogin: user.githubLogin,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
      repos: repoAccess.map((r) => ({
        orgId: r.orgId,
        repoId: r.repoId,
        permission: r.permission,
      })),
    });
  });

  app.post("/v1/auth/logout", async (_request, reply) => {
    return reply.send({ success: true });
  });

  app.delete("/v1/auth/delete-account", async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Missing Authorization header",
      });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid Authorization header format",
      });
    }

    const payload = await verifyUserToken(token);

    if (!payload) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    const user = await store.getUserById(payload.id);

    if (!user) {
      return reply.status(404).send({
        error: "Not Found",
        message: "User not found",
      });
    }

    await store.deleteUser(user.id);

    return reply.send({ success: true, message: "Account deleted successfully" });
  });
};
