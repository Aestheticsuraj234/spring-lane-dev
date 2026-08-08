import { Link } from "react-router-dom";
import { Leaf, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string;
    image?: string | null;
  };
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-dotted border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-dotted border-primary/40 bg-accent">
              <Leaf className="h-4 w-4 text-primary" />
            </span>
            <span>Spring Lane</span>
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/apps/new">
                <Plus className="h-4 w-4" />
                New app
              </Link>
            </Button>
            {user ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {user.image ? (
                  <img
                    src={user.image}
                    alt=""
                    className="h-7 w-7 rounded-full border border-dotted border-border"
                  />
                ) : null}
                <span className="hidden sm:inline">{user.name ?? user.email}</span>
                <Button variant="ghost" size="icon" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
