"use client";

import { useEffect, useState } from "react";
import { Github } from "lucide-react";

export function Footer() {
  const [repo, setRepo] = useState<{ orgId: string; repoId: string } | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.config?.remote?.orgId && data.config?.remote?.repoId) {
          setRepo({
            orgId: data.config.remote.orgId,
            repoId: data.config.remote.repoId,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="flex h-10 items-center justify-between border-t border-border/30 bg-[rgba(18,18,18,0.6)] px-6">
      <span className="text-[11px] text-muted-foreground/50">unforgit</span>
      {repo && (
        <a
          href={`https://github.com/${repo.orgId}/${repo.repoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          <Github className="h-3 w-3" />
          <span>{repo.orgId}/{repo.repoId}</span>
        </a>
      )}
    </footer>
  );
}
