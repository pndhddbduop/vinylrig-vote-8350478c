"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";

export function Navigation() {
  const pathname = usePathname();
  const { address } = useWallet();

  const isActive = (path: string) => {
    if (path === "/sessions") {
      return pathname === "/sessions" || pathname?.startsWith("/vote") || pathname?.startsWith("/results");
    }
    return pathname === path;
  };

  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-heading font-bold text-primary hover:opacity-80 transition-opacity">
            🎵 VinylRig Vote
          </Link>
          <div className="flex gap-6 items-center">
            <Link
              href="/sessions"
              className={`px-4 py-2 transition-colors ${
                isActive("/sessions")
                  ? "text-foreground font-medium border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sessions
            </Link>
            <Link
              href="/create-session"
              className={`px-4 py-2 transition-colors ${
                isActive("/create-session")
                  ? "text-foreground font-medium border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create
            </Link>
            {address && (
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                <span className="text-sm font-mono text-muted-foreground">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

