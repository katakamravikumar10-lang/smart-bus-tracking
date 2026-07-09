import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, LayoutDashboard, User as UserIcon, Settings as SettingsIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { avatarInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type MobileNavDrawerProps = {
  userEmail: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: UserIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

/**
 * Slide-in nav drawer for small screens. Uses shadcn Sheet (Radix) so focus
 * trap, Esc-to-close, and outside-click handling are correct.
 */
export function MobileNavDrawer({ userEmail, fullName, avatarUrl }: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          className="sm:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border/60 p-4 text-left">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? "Account"} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {avatarInitials(fullName ?? userEmail ?? "U")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-sm">
                {fullName ?? "Account"}
              </SheetTitle>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-2" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              activeProps={{ "data-active": "true" } as never}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                "data-[active=true]:bg-accent data-[active=true]:text-accent-foreground",
              )}
            >
              <l.icon className="h-4 w-4" aria-hidden="true" />
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={signOut}
            className="mt-2 flex min-h-11 items-center gap-3 rounded-lg border-t border-border/60 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}