"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { getToken, clearToken, getUser, type User } from "@/lib/api";

const adminNavItems = [
  { href: "/repos", label: "repos" },
  { href: "/users", label: "users" },
  { href: "/logs", label: "logs" },
];

const userNavItems = [
  { href: "/repos", label: "my repos" },
  { href: "/keys", label: "my keys" },
  { href: "/logs", label: "my logs" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const navItems = useMemo(() => {
    return user?.isAdmin ? adminNavItems : userNavItems;
  }, [user?.isAdmin]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    setIsAuthenticated(!!getToken());
    setUser(getUser());
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    router.push("/");
  };

  const isLoginPage = pathname === "/";

  return (
    <>
      <header className="flex items-center justify-between border-b border-border/50 bg-[rgba(18,18,18,0.8)] px-6 py-4 glass-subtle">
        <Link href={isAuthenticated ? "/repos" : "/"} className="text-foreground hover:text-foreground transition-colors">
          <span className="text-lg font-bold tracking-tight">
            <span className="underline decoration-2 underline-offset-[3px]">un</span>forgit<span className="text-foreground/40">.remote</span>
          </span>
        </Link>

        {!isLoginPage && isAuthenticated && (
          <>
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-7">
              <nav className="flex items-center gap-7">
                {navItems.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative text-sm transition-colors",
                        active
                          ? "text-foreground"
                          : "text-foreground/50 hover:text-foreground"
                      )}
                    >
                      {item.label}
                      {active && (
                        <span className="absolute -bottom-1 left-0 right-0 h-px bg-foreground/70 rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </nav>
              {user && user.avatarUrl && (
                <Link
                  href="/settings"
                  className="rounded-full ring-2 ring-transparent transition-all hover:ring-foreground/30"
                  title="Settings"
                >
                  <Image
                    src={user.avatarUrl}
                    alt={user.githubLogin}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-foreground/50 transition-colors hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                logout
              </button>
            </div>

            {/* Mobile: hamburger */}
            <div className="flex md:hidden items-center gap-3">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="text-foreground/70 hover:text-foreground transition-colors p-1"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </>
        )}
      </header>

      {/* Mobile menu panel */}
      {mobileOpen && !isLoginPage && isAuthenticated && (
        <div className="md:hidden border-b border-border/50 bg-[rgba(18,18,18,0.95)] backdrop-blur-xl px-6 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "text-foreground bg-white/10"
                    : "text-foreground/50 hover:text-foreground hover:bg-white/5"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
              pathname === "/settings"
                ? "text-foreground bg-white/10"
                : "text-foreground/50 hover:text-foreground hover:bg-white/5"
            )}
          >
            <Settings className="h-4 w-4" />
            settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-foreground/50 transition-colors hover:text-foreground hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            logout
          </button>
        </div>
      )}
    </>
  );
}
