import type { User } from "./api";

export interface AdminAuthState {
  hydrated: boolean;
  isAuthenticated: boolean;
  user: User | null;
}

export function getAdminAuthState(
  hydrated: boolean,
  token: string | null,
  userJson: string | null,
): AdminAuthState {
  if (!hydrated || !token) {
    return { hydrated, isAuthenticated: false, user: null };
  }

  return {
    hydrated: true,
    isAuthenticated: true,
    user: userJson ? (JSON.parse(userJson) as User) : null,
  };
}