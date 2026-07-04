import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Notif = {
  id: string;
  title: string;
  body: string;
  is_emergency: boolean;
  read_at: string | null;
  created_at: string;
};

export function NotificationsBell({ user }: { user: User }) {
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    supabase
      .from("notifications")
      .select("id,title,body,is_emergency,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setItems((data as Notif[]) ?? []));

    const ch = supabase
      .channel("notif-" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notif;
          setItems((prev) => [n, ...prev].slice(0, 30));
          toast(n.title, {
            description: n.body,
            className: n.is_emergency ? "border-destructive" : undefined,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user.id]);

  const unread = items.filter((i) => !i.read_at).length;

  async function markAllRead() {
    if (!unread) return;
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    setItems((prev) => prev.map((i) => (i.read_at ? i : { ...i, read_at: new Date().toISOString() })));
  }

  return (
    <Popover onOpenChange={(o) => o && markAllRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-medium">Notifications</div>
          {unread > 0 && (
            <button className="text-xs text-muted-foreground hover:underline" onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No notifications yet.</div>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              className={`border-b px-3 py-2 last:border-b-0 ${n.read_at ? "" : "bg-accent/10"} ${
                n.is_emergency ? "border-l-2 border-l-destructive" : ""
              }`}
            >
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-muted-foreground">{n.body}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}