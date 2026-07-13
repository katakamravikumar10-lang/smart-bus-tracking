# Administrator Manual — Smart Bus Tracking System

**Institution:** Narayana Engineering College
**Audience:** System administrators, IT staff

## 1. Overview
The Admin Dashboard is the control center for the Smart Bus Tracking System. Administrators manage users, buses, routes, drivers, announcements, analytics, and system settings.

## 2. Signing In
1. Open the deployed URL (e.g. `https://bus.narayanaengg.edu.in`).
2. Click **Sign In** and enter your admin email + password.
3. If leaked-password protection is enabled, weak or breached passwords are rejected.
4. Admin sessions time out automatically after inactivity.

## 3. Dashboard Sections
| Tab | Purpose |
|-----|---------|
| Overview | KPI cards: students, faculty, buses, drivers, active/delayed buses, trip counts. |
| Buses | Create, edit, delete buses. Assign registration numbers, capacity. |
| Routes | Manage routes with stops, timings, geofences. |
| Drivers | Add drivers, assign to buses, view performance. |
| Students / Faculty | Manage passenger records. |
| Announcements | Broadcast messages to all users. |
| Analytics | Charts: daily usage, route popularity, delay analysis, driver performance, bus utilization. |
| Audit | Full audit log of every admin action. |
| Reports | Export data as CSV, Excel, PDF, or Print. |
| Settings | Development Settings (Demo Mode toggle), profile, password. |
| Demo Mode | Load / clear demo data, GPS simulator (Admin-only, requires Demo Mode enabled). |

## 4. Common Tasks
### 4.1 Add a Bus
Buses tab → **Add Bus** → fill registration, capacity → Save.

### 4.2 Add a Route
Routes tab → **Add Route** → set name, source, destination, stops, schedule.

### 4.3 Assign Driver to Bus
Drivers tab → edit driver → select bus → Save. Assignment is audit-logged.

### 4.4 Broadcast Announcement
Announcements tab → **New Announcement** → title, message, audience → Publish.

### 4.5 Enable / Disable Demo Mode
Settings → **Development Settings** → toggle **Demo Mode**.
- Off: Demo tab, simulator, and demo data are hidden.
- On: Load Demo Data, Start/Stop GPS Simulation, Clear Demo Data available.
Demo data is isolated from production data.

### 4.6 Export Reports
Reports tab → filter by date/bus/driver/route → **Export** → choose CSV, Excel, PDF, or Print.

### 4.7 Review Audit Logs
Audit tab → search by actor, action, entity, or date. Every admin mutation is logged with IP + user agent.

## 5. Security Best Practices
- Use a unique strong password; enable 2FA where available.
- Do not share admin accounts.
- Review audit logs weekly.
- Rotate SUPABASE and Google Maps keys annually.
- Keep Demo Mode **disabled** in production.

## 6. Troubleshooting
| Symptom | Fix |
|---|---|
| Cannot sign in | Verify email/password; check login-attempt lockout (15 min). |
| Map not loading | Check Google Maps key; falls back to OpenStreetMap automatically. |
| Missing data | Verify Supabase connection; check RLS policies. |
| Slow dashboard | Increase Supabase instance size in Cloud settings. |

## 7. Support
Contact: `it-support@narayanaengg.edu.in`