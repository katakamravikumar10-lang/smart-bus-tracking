import type { ReactNode } from "react";

// Client-side required env vars. Server-only secrets (SUPABASE_SERVICE_ROLE_KEY,
// SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY without VITE_ prefix) are validated at
// use-time in server functions and are intentionally NOT listed here — they
// must never be referenced from client code.
const REQUIRED_CLIENT_ENV: { key: string; description: string }[] = [
  {
    key: "VITE_SUPABASE_URL",
    description: "Supabase project URL (public). Required for auth and database access.",
  },
  {
    key: "VITE_SUPABASE_PUBLISHABLE_KEY",
    description: "Supabase publishable/anon key. Required for the browser Supabase client.",
  },
  {
    key: "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY",
    description: "Google Maps JavaScript API key. Required to render live bus maps.",
  },
  {
    key: "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID",
    description: "Google Maps tracking channel ID used with the Maps script tag.",
  },
];

export type MissingEnv = { key: string; description: string };

export function getMissingClientEnv(): MissingEnv[] {
  const env = import.meta.env as Record<string, string | undefined>;
  return REQUIRED_CLIENT_ENV.filter(({ key }) => {
    const v = env[key];
    return v === undefined || v === null || String(v).trim() === "";
  });
}

export function EnvCheckScreen({ missing }: { missing: MissingEnv[] }): ReactNode {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "#0b1220",
        color: "#e5e7eb",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 640,
          width: "100%",
          background: "#111827",
          border: "1px solid #1f2937",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#f59e0b",
            }}
          />
          <strong style={{ fontSize: 14, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Developer notice · Setup incomplete
          </strong>
        </div>
        <h1 style={{ fontSize: 22, margin: "6px 0 8px", color: "#f9fafb" }}>
          Missing required environment variables
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: "#cbd5e1", margin: 0 }}>
          The application couldn't start because the following variables are not set. Add them to
          your local <code>.env</code> file (see <code>.env.example</code>) or to your Vercel
          project settings, then reload.
        </p>

        <ul style={{ marginTop: 16, paddingLeft: 0, listStyle: "none" }}>
          {missing.map((m) => (
            <li
              key={m.key}
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 8,
              }}
            >
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#fbbf24" }}>
                {m.key}
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{m.description}</div>
            </li>
          ))}
        </ul>

        <p style={{ fontSize: 12, color: "#64748b", marginTop: 16 }}>
          Values are read from <code>import.meta.env</code> at build time. No secret values are
          shown here — only the names of missing variables.
        </p>
      </div>
    </div>
  );
}