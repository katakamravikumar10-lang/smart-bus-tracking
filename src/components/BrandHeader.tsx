import { Link, useNavigate } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useSession } from "@/lib/auth-hooks";

export function BrandHeader({ subtitle, showSignOut = true }: { subtitle?: string; showSignOut?: boolean }) {
  const navigate = useNavigate();
  const { user } = useSession();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Narayana Bus Tracker" width={40} height={40} className="rounded" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-primary">Narayana Engineering College</div>
            <div className="text-xs text-muted-foreground">{subtitle ?? "Smart Bus Tracking · Gudur"}</div>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          {user && <NotificationsBell user={user} />}
          {showSignOut && (
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}