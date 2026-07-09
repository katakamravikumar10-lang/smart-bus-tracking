import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSession, useRole } from "@/lib/auth-hooks";
import { supabase } from "@/integrations/supabase/client";
import {
  Bus,
  Route as RouteIcon,
  Users,
  Megaphone,
  LayoutDashboard,
  Settings as SettingsIcon,
  User as UserIcon,
  FileText,
  MessageSquareWarning,
  Bell,
  LifeBuoy,
  Info,
} from "lucide-react";

type SearchItem = {
  id: string;
  label: string;
  hint?: string;
  onSelect: () => void;
  icon: React.ComponentType<{ className?: string }>;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    buses: SearchItem[];
    routes: SearchItem[];
    people: SearchItem[];
  }>({ buses: [], routes: [], people: [] });
  const { user } = useSession();
  const { role } = useRole(user);
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    const q = query.trim();
    let cancelled = false;
    (async () => {
      const isAdmin = role === "admin";
      const [busRes, routeRes, peopleRes] = await Promise.all([
        supabase
          .from("buses")
          .select("id,bus_number,status")
          .ilike("bus_number", q ? `%${q}%` : "%")
          .limit(6),
        supabase
          .from("routes")
          .select("id,name,description")
          .ilike("name", q ? `%${q}%` : "%")
          .limit(6),
        isAdmin
          ? supabase
              .from("profiles")
              .select("id,full_name,email")
              .or(q ? `full_name.ilike.%${q}%,email.ilike.%${q}%` : "full_name.not.is.null")
              .limit(6)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
      ]);
      if (cancelled) return;
      const close = () => setOpen(false);
      setResults({
        buses: (busRes.data ?? []).map((b) => ({
          id: `bus-${b.id}`,
          label: `Bus ${b.bus_number}`,
          hint: b.status,
          icon: Bus,
          onSelect: () => {
            navigate({ to: "/dashboard" });
            close();
          },
        })),
        routes: (routeRes.data ?? []).map((r) => ({
          id: `route-${r.id}`,
          label: r.name,
          hint: r.description ?? undefined,
          icon: RouteIcon,
          onSelect: () => {
            navigate({ to: "/dashboard" });
            close();
          },
        })),
        people: (peopleRes.data ?? []).map((p) => ({
          id: `person-${p.id}`,
          label: p.full_name ?? p.email ?? "Unnamed",
          hint: p.email ?? undefined,
          icon: UserIcon,
          onSelect: () => {
            navigate({ to: "/dashboard" });
            close();
          },
        })),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, query, user, role, navigate]);

  const close = () => setOpen(false);
  const go = (to: "/dashboard" | "/profile" | "/settings" | "/help" | "/about" | "/notifications") => () => {
    navigate({ to });
    close();
  };

  const pages: SearchItem[] = [
    { id: "p-dash", label: "Dashboard", icon: LayoutDashboard, onSelect: go("/dashboard") },
    { id: "p-notif", label: "Notifications", icon: Bell, onSelect: go("/notifications") },
    { id: "p-prof", label: "Profile", icon: UserIcon, onSelect: go("/profile") },
    { id: "p-set", label: "Settings", icon: SettingsIcon, onSelect: go("/settings") },
    { id: "p-help", label: "Help & Support", icon: LifeBuoy, onSelect: go("/help") },
    { id: "p-about", label: "About", icon: Info, onSelect: go("/about") },
  ];

  const adminPages: SearchItem[] =
    role === "admin"
      ? [
          { id: "a-buses", label: "Manage Buses", hint: "Admin", icon: Bus, onSelect: go("/dashboard") },
          { id: "a-routes", label: "Manage Routes", hint: "Admin", icon: RouteIcon, onSelect: go("/dashboard") },
          { id: "a-drivers", label: "Manage Drivers", hint: "Admin", icon: Users, onSelect: go("/dashboard") },
          { id: "a-announce", label: "Announcements", hint: "Admin", icon: Megaphone, onSelect: go("/dashboard") },
          { id: "a-trips", label: "Trip History", hint: "Admin", icon: FileText, onSelect: go("/dashboard") },
          { id: "a-reports", label: "Reports & Feedback", hint: "Admin", icon: MessageSquareWarning, onSelect: go("/dashboard") },
        ]
      : [];

  if (!user) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search buses, routes, pages…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem key={p.id} onSelect={p.onSelect} value={p.label}>
              <p.icon className="mr-2 h-4 w-4" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {adminPages.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Admin">
              {adminPages.map((p) => (
                <CommandItem key={p.id} onSelect={p.onSelect} value={p.label}>
                  <p.icon className="mr-2 h-4 w-4" />
                  {p.label}
                  {p.hint && <span className="ml-auto text-xs text-muted-foreground">{p.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {results.buses.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Buses">
              {results.buses.map((it) => (
                <CommandItem key={it.id} onSelect={it.onSelect} value={it.label}>
                  <it.icon className="mr-2 h-4 w-4" />
                  {it.label}
                  {it.hint && <span className="ml-auto text-xs text-muted-foreground">{it.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {results.routes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Routes">
              {results.routes.map((it) => (
                <CommandItem key={it.id} onSelect={it.onSelect} value={it.label}>
                  <it.icon className="mr-2 h-4 w-4" />
                  {it.label}
                  {it.hint && <span className="ml-auto truncate text-xs text-muted-foreground">{it.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {role === "admin" && results.people.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="People">
              {results.people.map((it) => (
                <CommandItem key={it.id} onSelect={it.onSelect} value={it.label}>
                  <it.icon className="mr-2 h-4 w-4" />
                  {it.label}
                  {it.hint && <span className="ml-auto truncate text-xs text-muted-foreground">{it.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}