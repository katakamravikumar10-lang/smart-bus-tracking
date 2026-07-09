import { Link, useNavigate } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useSession, useProfile } from "@/lib/auth-hooks";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarUrl, avatarInitials } from "@/lib/avatar";

export function BrandHeader({ subtitle, showSignOut = true }: { subtitle?: string; showSignOut?: boolean }) {
  const navigate = useNavigate();
  const { user } = useSession();
  const profile = useProfile(user);
  const avatarUrl = useAvatarUrl(profile?.avatar_url);
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
          <ThemeToggle />
          {user && showSignOut && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.full_name ?? "Account"} />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {avatarInitials(profile?.full_name ?? user.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  <div className="text-sm font-medium">{profile?.full_name ?? "Account"}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                  <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}