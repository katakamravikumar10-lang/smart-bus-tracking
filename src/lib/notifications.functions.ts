import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type EventType =
  | "trip_started"
  | "trip_completed"
  | "approaching_stop"
  | "reached_stop"
  | "delayed"
  | "sos";

type EmitInput = {
  busId: string;
  type: EventType;
  stopName?: string | null;
  distanceM?: number | null;
  message?: string | null;
};

function buildMessage(
  input: EmitInput,
  busNumber: string,
  boardingStop: string | null,
): { title: string; body: string; isEmergency: boolean } {
  const stop = input.stopName ?? boardingStop ?? "your stop";
  switch (input.type) {
    case "trip_started":
      return {
        title: `Bus ${busNumber} has started`,
        body: `Driver started the trip. Track live location in the app.`,
        isEmergency: false,
      };
    case "approaching_stop":
      return {
        title: `Bus ${busNumber} approaching ${stop}`,
        body: `About 500 metres away — please be ready at ${stop}.`,
        isEmergency: false,
      };
    case "reached_stop":
      return {
        title: `Bus ${busNumber} has reached ${stop}`,
        body: `The bus is now at ${stop}.`,
        isEmergency: false,
      };
    case "delayed":
      return {
        title: `Bus ${busNumber} is delayed`,
        body: input.message ?? `Your bus is running behind schedule.`,
        isEmergency: false,
      };
    case "sos":
      return {
        title: `🚨 Emergency · Bus ${busNumber}`,
        body: input.message ?? `Driver has flagged an emergency.`,
        isEmergency: true,
      };
    case "trip_completed":
      return {
        title: `Bus ${busNumber} trip completed`,
        body: `The bus has finished its route.`,
        isEmergency: false,
      };
  }
}

export const emitBusNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: EmitInput) => {
    if (!input || typeof input.busId !== "string" || !input.busId)
      throw new Error("busId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify caller is the assigned driver OR an admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) {
      const { data: assign } = await supabaseAdmin
        .from("driver_assignments")
        .select("bus_id")
        .eq("driver_id", context.userId)
        .eq("bus_id", data.busId)
        .eq("active", true)
        .maybeSingle();
      if (!assign) throw new Error("Forbidden: not assigned to this bus");
    }

    const { data: bus } = await supabaseAdmin
      .from("buses")
      .select("id,bus_number")
      .eq("id", data.busId)
      .maybeSingle();
    if (!bus) throw new Error("Bus not found");

    // Find recipients (students + faculty registered to this bus)
    let q = supabaseAdmin
      .from("student_assignments")
      .select("user_id,boarding_stop")
      .eq("bus_id", data.busId);
    // For proximity/reached events, only notify people at that stop
    if ((data.type === "approaching_stop" || data.type === "reached_stop") && data.stopName) {
      q = q.eq("boarding_stop", data.stopName);
    }
    const { data: recipients } = await q;
    if (!recipients || recipients.length === 0) return { ok: true, sent: 0 };

    const rows = recipients.map((r) => {
      const msg = buildMessage(data, bus.bus_number, r.boarding_stop);
      return {
        user_id: r.user_id,
        bus_id: data.busId,
        type: data.type,
        title: msg.title,
        body: msg.body,
        is_emergency: msg.isEmergency,
      };
    });

    const { error } = await supabaseAdmin.from("notifications").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, sent: rows.length };
  });