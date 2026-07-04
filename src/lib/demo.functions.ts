import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================
// Demo Mode server functions — seed and clear demo data.
// Admin-only. All demo rows are marked with `is_demo = true`
// so real production data is never touched by clearDemo().
// ============================================================

const PW = {
  admin: "Admin@123",
  driver: "Driver@123",
  faculty: "Faculty@123",
  student: "Student@123",
} as const;

type Role = "admin" | "driver" | "faculty" | "student";

type DemoAccount = {
  email: string;
  password: string;
  role: Role;
  full_name: string;
  phone?: string;
  roll_no?: string;
  department?: string;
};

const ACCOUNTS: DemoAccount[] = [
  { email: "admin@nec.demo", password: PW.admin, role: "admin", full_name: "Demo Admin", phone: "+91 90000 00001" },
  { email: "driver1@nec.demo", password: PW.driver, role: "driver", full_name: "Ramesh Kumar", phone: "+91 90000 10001" },
  { email: "driver2@nec.demo", password: PW.driver, role: "driver", full_name: "Suresh Reddy", phone: "+91 90000 10002" },
  { email: "driver3@nec.demo", password: PW.driver, role: "driver", full_name: "Venkatesh Naidu", phone: "+91 90000 10003" },
  { email: "faculty1@nec.demo", password: PW.faculty, role: "faculty", full_name: "Dr. Priya Sharma", phone: "+91 90000 20001", department: "CSE" },
  { email: "faculty2@nec.demo", password: PW.faculty, role: "faculty", full_name: "Prof. Anand Rao", phone: "+91 90000 20002", department: "ECE" },
  { email: "student1@nec.demo", password: PW.student, role: "student", full_name: "Arjun Reddy", phone: "+91 90000 30001", roll_no: "22CS001", department: "CSE" },
  { email: "student2@nec.demo", password: PW.student, role: "student", full_name: "Divya Priya", phone: "+91 90000 30002", roll_no: "22CS002", department: "CSE" },
  { email: "student3@nec.demo", password: PW.student, role: "student", full_name: "Kiran Kumar", phone: "+91 90000 30003", roll_no: "22EC010", department: "ECE" },
  { email: "student4@nec.demo", password: PW.student, role: "student", full_name: "Meghana S.", phone: "+91 90000 30004", roll_no: "22ME021", department: "MECH" },
  { email: "student5@nec.demo", password: PW.student, role: "student", full_name: "Rahul Varma", phone: "+91 90000 30005", roll_no: "22EE015", department: "EEE" },
];

// Realistic routes near Narayana Engineering College, Gudur
const COLLEGE = { name: "NEC Main Gate", lat: 14.1497, lng: 79.8447 };

const ROUTES = [
  {
    name: "R1 · Gudur Town — NEC",
    description: "Gudur Bus Stand → Railway Station → RTC Depot → College",
    stops: [
      { name: "Gudur Bus Stand", lat: 14.1503, lng: 79.8506 },
      { name: "Gudur Railway Station", lat: 14.1467, lng: 79.8564 },
      { name: "RTC Depot", lat: 14.1478, lng: 79.8489 },
      { name: "Balaji Nagar", lat: 14.1489, lng: 79.8460 },
      COLLEGE,
    ],
  },
  {
    name: "R2 · Nellore — NEC",
    description: "Nellore Trunk Rd → Kovur → Manubolu → College",
    stops: [
      { name: "Nellore Bypass", lat: 14.4426, lng: 79.9865 },
      { name: "Kovur Junction", lat: 14.4931, lng: 79.8927 },
      { name: "Manubolu", lat: 14.2650, lng: 79.8817 },
      { name: "Chillakur", lat: 14.1930, lng: 80.0090 },
      COLLEGE,
    ],
  },
  {
    name: "R3 · Naidupeta — NEC",
    description: "Naidupeta → Sullurpeta → Venkatagiri → College",
    stops: [
      { name: "Naidupeta Bus Stand", lat: 13.9110, lng: 79.9075 },
      { name: "Venkatagiri", lat: 13.9673, lng: 79.5820 },
      { name: "Kota", lat: 14.0257, lng: 80.0068 },
      { name: "Vakadu", lat: 14.0620, lng: 80.0331 },
      COLLEGE,
    ],
  },
];

const BUS_DEFS = [
  { bus_number: "NEC-01", capacity: 45, routeIdx: 0, status: "running" },
  { bus_number: "NEC-02", capacity: 45, routeIdx: 0, status: "running" },
  { bus_number: "NEC-03", capacity: 50, routeIdx: 1, status: "running" },
  { bus_number: "NEC-04", capacity: 50, routeIdx: 1, status: "delayed" },
  { bus_number: "NEC-05", capacity: 40, routeIdx: 2, status: "running" },
  { bus_number: "NEC-06", capacity: 40, routeIdx: 2, status: "idle" },
  { bus_number: "NEC-07", capacity: 45, routeIdx: 0, status: "idle" },
  { bus_number: "NEC-08", capacity: 45, routeIdx: 1, status: "idle" },
  { bus_number: "NEC-09", capacity: 50, routeIdx: 2, status: "maintenance" },
  { bus_number: "NEC-10", capacity: 50, routeIdx: 0, status: "idle" },
] as const;

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch existing users (small dataset — one page is enough)
    const existing = new Map<string, string>(); // email -> id
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      data.users.forEach((u) => u.email && existing.set(u.email.toLowerCase(), u.id));
      if (data.users.length < 200) break;
      page++;
    }

    // 2. Create missing demo users
    const accountIds: Record<string, string> = {};
    for (const a of ACCOUNTS) {
      const key = a.email.toLowerCase();
      let id = existing.get(key);
      if (!id) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: a.email,
          password: a.password,
          email_confirm: true,
          user_metadata: {
            full_name: a.full_name,
            phone: a.phone ?? null,
            roll_no: a.roll_no ?? null,
            department: a.department ?? null,
            role: a.role === "admin" ? "student" : a.role, // admin cannot self-assign; upgraded below
          },
        });
        if (error) throw new Error(`createUser(${a.email}): ${error.message}`);
        id = data.user!.id;
      }
      accountIds[a.email] = id;

      // Ensure profile marked as demo
      await supabaseAdmin.from("profiles").upsert({
        id,
        email: a.email,
        full_name: a.full_name,
        phone: a.phone ?? null,
        roll_no: a.roll_no ?? null,
        department: a.department ?? null,
        is_demo: true,
      });

      // Ensure correct role
      await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
      await supabaseAdmin.from("user_roles").insert({ user_id: id, role: a.role });
    }

    // 3. Routes — upsert by name so re-seeding is idempotent
    const routeIds: string[] = [];
    for (const r of ROUTES) {
      const { data: existingRoute } = await supabaseAdmin
        .from("routes").select("id").eq("name", r.name).maybeSingle();
      if (existingRoute) {
        await supabaseAdmin.from("routes").update({
          description: r.description,
          stops: r.stops.map((s, i) => ({ ...s, order: i })),
          is_demo: true,
          active: true,
        }).eq("id", existingRoute.id);
        routeIds.push(existingRoute.id);
      } else {
        const { data, error } = await supabaseAdmin.from("routes").insert({
          name: r.name,
          description: r.description,
          stops: r.stops.map((s, i) => ({ ...s, order: i })),
          is_demo: true,
        }).select("id").single();
        if (error) throw new Error(`route ${r.name}: ${error.message}`);
        routeIds.push(data.id);
      }
    }

    // 4. Buses
    const busIds: Record<string, string> = {};
    for (const b of BUS_DEFS) {
      const { data: existingBus } = await supabaseAdmin
        .from("buses").select("id").eq("bus_number", b.bus_number).maybeSingle();
      const payload = {
        bus_number: b.bus_number,
        capacity: b.capacity,
        route_id: routeIds[b.routeIdx],
        status: b.status as any,
        is_demo: true,
        active: true,
      };
      if (existingBus) {
        await supabaseAdmin.from("buses").update(payload).eq("id", existingBus.id);
        busIds[b.bus_number] = existingBus.id;
      } else {
        const { data, error } = await supabaseAdmin.from("buses").insert(payload).select("id").single();
        if (error) throw new Error(`bus ${b.bus_number}: ${error.message}`);
        busIds[b.bus_number] = data.id;
      }
    }

    // 5. Driver assignments — driver1→NEC-01, driver2→NEC-03, driver3→NEC-05
    const driverMap = [
      { email: "driver1@nec.demo", bus: "NEC-01" },
      { email: "driver2@nec.demo", bus: "NEC-03" },
      { email: "driver3@nec.demo", bus: "NEC-05" },
    ];
    for (const dm of driverMap) {
      const driverId = accountIds[dm.email];
      const busId = busIds[dm.bus];
      await supabaseAdmin.from("driver_assignments").update({ active: false }).eq("driver_id", driverId);
      await supabaseAdmin.from("driver_assignments").upsert(
        { driver_id: driverId, bus_id: busId, active: true },
        { onConflict: "driver_id,bus_id" },
      );
    }

    // 6. Student assignments
    const studentMap = [
      { email: "student1@nec.demo", bus: "NEC-01", stop: "Gudur Bus Stand" },
      { email: "student2@nec.demo", bus: "NEC-01", stop: "Gudur Railway Station" },
      { email: "student3@nec.demo", bus: "NEC-03", stop: "Kovur Junction" },
      { email: "student4@nec.demo", bus: "NEC-05", stop: "Naidupeta Bus Stand" },
      { email: "student5@nec.demo", bus: "NEC-05", stop: "Venkatagiri" },
    ];
    for (const sm of studentMap) {
      await supabaseAdmin.from("student_assignments").upsert(
        { user_id: accountIds[sm.email], bus_id: busIds[sm.bus], boarding_stop: sm.stop },
        { onConflict: "user_id" },
      );
    }

    // 7. Seed live bus_locations at first stop of each route
    for (const b of BUS_DEFS) {
      const first = ROUTES[b.routeIdx].stops[0];
      await supabaseAdmin.from("bus_locations").upsert({
        bus_id: busIds[b.bus_number],
        lat: first.lat,
        lng: first.lng,
        speed: 0,
        heading: 0,
      });
    }

    // 8. Sample announcements
    const adminId = accountIds["admin@nec.demo"];
    await supabaseAdmin.from("announcements").insert([
      { title: "Welcome to NEC Bus Tracker", body: "Live tracking is now available for all buses.", created_by: adminId, is_demo: true },
      { title: "Route R2 delayed", body: "Bus NEC-04 is running 15 minutes late due to traffic.", created_by: adminId, is_demo: true },
      { title: "Holiday notice", body: "No transport service on Sunday. Regular schedule resumes Monday.", created_by: adminId, is_demo: true },
    ]);

    // 9. Sample historic trips (last 3 days)
    const now = Date.now();
    const trips: Array<{
      bus_id: string;
      driver_id: string;
      started_at: string;
      ended_at: string;
      status: "completed";
      is_demo: boolean;
    }> = [];
    for (let d = 1; d <= 3; d++) {
      for (const dm of driverMap) {
        const start = new Date(now - d * 24 * 3600 * 1000 - 8 * 3600 * 1000);
        const end = new Date(start.getTime() + 90 * 60 * 1000);
        trips.push({
          bus_id: busIds[dm.bus],
          driver_id: accountIds[dm.email],
          started_at: start.toISOString(),
          ended_at: end.toISOString(),
          status: "completed",
          is_demo: true,
        });
      }
    }
    if (trips.length) await supabaseAdmin.from("trips").insert(trips);

    return { ok: true, accounts: ACCOUNTS.length, buses: BUS_DEFS.length, routes: ROUTES.length };
  });

export const clearDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Order matters: rows referencing users/buses first, then users, then buses/routes.
    await supabaseAdmin.from("announcements").delete().eq("is_demo", true);
    await supabaseAdmin.from("trips").delete().eq("is_demo", true);

    // Get demo user ids
    const { data: demoProfiles } = await supabaseAdmin
      .from("profiles").select("id").eq("is_demo", true);
    const demoUserIds = (demoProfiles ?? []).map((p) => p.id);

    // Get demo bus ids (cascades: bus_locations, driver_assignments, student_assignments, trips)
    const { data: demoBuses } = await supabaseAdmin
      .from("buses").select("id").eq("is_demo", true);
    const demoBusIds = (demoBuses ?? []).map((b) => b.id);

    if (demoBusIds.length) {
      await supabaseAdmin.from("bus_locations").delete().in("bus_id", demoBusIds);
      await supabaseAdmin.from("driver_assignments").delete().in("bus_id", demoBusIds);
      await supabaseAdmin.from("student_assignments").delete().in("bus_id", demoBusIds);
      await supabaseAdmin.from("buses").delete().in("id", demoBusIds);
    }

    await supabaseAdmin.from("routes").delete().eq("is_demo", true);

    // Delete demo users (this cascades to profiles + user_roles)
    for (const uid of demoUserIds) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
    }

    return { ok: true, removedUsers: demoUserIds.length, removedBuses: demoBusIds.length };
  });