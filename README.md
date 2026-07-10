# 🚌 Smart Bus Tracking System
### Real-Time College Transportation Management Platform

![Status](https://img.shields.io/badge/Status-Completed-success)
![Platform](https://img.shields.io/badge/Platform-Web-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Built With](https://img.shields.io/badge/Built%20With-React%20%7C%20Node.js-orange)

---

## 📖 Overview

The **Smart Bus Tracking System** is a modern web-based transportation management platform developed as a **Final Year B.Tech Project** for **Narayana Engineering College, Gudur**.

The application provides **real-time GPS tracking**, secure **role-based authentication**, **Google Maps integration**, live notifications, and centralized transportation management for students, faculty, drivers, and administrators.

The system improves transportation efficiency, enhances student safety, reduces waiting time, and provides complete visibility of college bus operations.

---

## 🎯 Project Objectives

- Provide live GPS tracking of college buses.
- Reduce student waiting time using real-time ETA.
- Improve communication between students, drivers, and administrators.
- Digitize college transportation management.
- Enhance passenger safety using emergency alerts.
- Build a scalable platform for future smart campus transportation.

---

# 👥 User Roles

### 👨‍🎓 Student
- Secure Login
- View Assigned Bus
- Live Bus Tracking
- Google Maps Integration
- Estimated Arrival Time (ETA)
- Boarding Stop Alerts
- College Announcements
- Feedback Submission

---

### 👨‍🏫 Faculty
- Secure Login
- Track Assigned Bus
- View Live Bus Locations
- Transportation Announcements
- Route Information

---

### 🚌 Driver
- Secure Login
- Start / End Trip
- Live GPS Sharing
- Route Navigation
- SOS Emergency Button
- Delay Reporting
- Breakdown Reporting

---

### 👨‍💼 Administrator
- Dashboard
- Manage Buses
- Manage Drivers
- Manage Routes
- Manage Students
- Assign Drivers
- Assign Routes
- Broadcast Announcements
- View Reports
- Monitor Live Fleet

---

# 🚀 Key Features

## 🔐 Authentication
- Role-Based Login
- Secure Authentication
- Email Verification
- Protected Routes

---

## 📍 Live GPS Tracking
- Real-Time Bus Tracking
- Google Maps Integration
- Live Bus Marker
- Route Visualization
- ETA Calculation

---

## 🗺 Route Management

- Create Routes
- Edit Routes
- Bus Stops
- Route Assignment
- Route Status

---

## 🚌 Bus Management

- Add Bus
- Edit Bus
- Assign Driver
- Update Bus Status
- Maintenance Status

---

## 🔔 Smart Notifications

- Arrival Alerts
- Delay Notifications
- Emergency Alerts
- College Announcements
- Route Change Notifications

---

## 🚨 Emergency Features

- Driver SOS Button
- Accident Reporting
- Breakdown Reporting
- Emergency Broadcast

---

## 📊 Reports

- Trip History
- Delay Reports
- Driver Performance
- Daily Trips
- Fleet Statistics

---

## 🧪 Demo Mode

Development-only Demo Mode includes:

- Demo Accounts
- Demo Buses
- Demo Drivers
- Demo Students
- Demo Routes
- GPS Simulation
- Live Bus Movement
- Dashboard Statistics
- Clear Demo Data
- Safe Development Environment

---

# 🗺 GPS Simulation

The application includes a development GPS simulator that:

- Simulates live bus movement
- Updates GPS every few seconds
- Calculates ETA
- Triggers arrival notifications
- Demonstrates live tracking without physical GPS hardware

---

# 💻 Technology Stack

## Frontend

- React
- TypeScript
- Tailwind CSS

## Backend

- Node.js
- Express.js

## Database

- Supabase

## Authentication

- Supabase Authentication

## Maps

- Google Maps API

## Real-Time

- Supabase Realtime

## Notifications

- Firebase Cloud Messaging (FCM)

---

# 📱 Screens

- Landing Page
- Login
- Register
- Student Dashboard
- Faculty Dashboard
- Driver Dashboard
- Admin Dashboard
- Live Tracking Map
- Route Management
- Bus Management
- Demo Mode
- Reports

---

# 🔒 Security Features

- Role-Based Access Control (RBAC)
- Protected APIs
- Secure Authentication
- Email Verification
- Database Security Policies
- Row Level Security (RLS)
---

# 🎓 Academic Information

**Project Title**

Smart Bus Tracking System for Narayana Engineering College, Gudur

**Project Type**

Final Year B.Tech Project

**Department**

Electronics and Communication Engineering (ECE)

**Institution**

Narayana Engineering College, Gudur

---

# 📸 Project Screenshots

_Add screenshots here_

```
/screenshots
    dashboard.png
    student-dashboard.png
    driver-dashboard.png
    admin-dashboard.png
    live-tracking.png
```

---

# ⚙ Installation

```bash
git clone https://github.com/yourusername/smart-bus-tracking-system.git

cd smart-bus-tracking-system

npm install

npm run dev
```

---

# 🔧 Environment Variables

Copy `.env.example` to `.env` and fill in the following variables. In Vercel,
add the same variables under **Project → Settings → Environment Variables**
for the Production, Preview, and Development environments, then redeploy.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (public). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable/anon key for the browser client. |
| `SUPABASE_URL` | Yes (server) | Supabase URL used by server functions / SSR. |
| `SUPABASE_PUBLISHABLE_KEY` | Yes (server) | Publishable key used by server functions. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Service-role key for privileged server operations. |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` | Yes for maps | Google Maps JavaScript API key. Without this, the app runs but the live map shows an "unavailable" state. |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID` | Optional | Google Maps usage-tracking channel. |
| `DEMO_ADMIN_PASSWORD` / `DEMO_DRIVER_PASSWORD` / `DEMO_FACULTY_PASSWORD` / `DEMO_STUDENT_PASSWORD` | Optional | Override default Demo Mode passwords. |

Values with the `VITE_` prefix are inlined into the client bundle at build
time. After changing any environment variable on Vercel you must trigger a
redeploy — a new build is required to pick up the new value.

## Getting a Google Maps API key

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create (or select) a project and enable **billing** on it (Maps APIs
   require billing even for free-tier usage).
3. Under **APIs & Services → Library**, enable **Maps JavaScript API**.
4. Under **APIs & Services → Credentials**, click **Create credentials → API
   key**.
5. Click the new key and set **Application restrictions → HTTP referrers**.
   Add every host that will load the app, including both the root and the
   wildcard subdomain form:
   - `http://localhost:*/*`
   - `https://your-app.vercel.app/*`
   - `https://*.vercel.app/*` (Vercel preview deployments)
   - `https://your-domain.com/*` and `https://*.your-domain.com/*`
6. Under **API restrictions**, restrict the key to **Maps JavaScript API**.
7. Copy the key into `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` locally
   and in Vercel.

## Configuring Vercel

1. In your Vercel dashboard, open the project and go to
   **Settings → Environment Variables**.
2. Add each variable from the table above. Tick **Production**, **Preview**,
   and **Development** for every variable you want available in all builds.
3. Trigger a redeploy (either push a commit or use **Deployments → … →
   Redeploy** and untick "Use existing Build Cache").

---

# 🛠 Troubleshooting

**"Missing required environment variables" screen on load**
You are missing `VITE_SUPABASE_URL` and/or `VITE_SUPABASE_PUBLISHABLE_KEY`.
Add them to `.env` (locally) or Vercel Environment Variables and redeploy.

**"Map unavailable" panel in place of the map**
`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` is missing, invalid, or
not authorized for the current domain. Set the key in Vercel, then redeploy.
All other features (ETA, stops, alerts, notifications) continue to work.

**Console error: `RefererNotAllowedMapError`**
Your Google Maps key does not allow the current origin. Open the key in
Google Cloud Console → Credentials and add the exact deployment URL to the
HTTP referrers list, including both `https://host/*` and
`https://*.host/*` for subdomains. Vercel preview URLs change per
deployment, so use `https://*.vercel.app/*` if you rely on previews.

**Console error: `ApiNotActivatedMapError`**
The Maps JavaScript API is not enabled on the Google Cloud project that
owns the key. Enable it under **APIs & Services → Library**.

**Console error: `InvalidKeyMapError`**
The key value is wrong or truncated. Copy the key again from Google Cloud
Console; ensure no extra whitespace was pasted into Vercel.

**Missing images (logo, banner, founder) after deployment**
All static images are bundled from `src/assets/` via Vite — they do not
depend on any external CDN. If they are missing after a deploy, force a
redeploy without the build cache and confirm the files are present in the
repository under `src/assets/`.

**"Failed to load Google Maps script"**
The browser could not fetch `maps.googleapis.com`. Check the network,
ad blockers, or corporate proxies. The rest of the app is not affected.

---

# 🤝 Contributing

Contributions, feature suggestions, and improvements are welcome.

Feel free to fork the repository and submit pull requests.

---

# 📄 License

This project is developed for educational purposes as a Final Year Engineering Project.

---

# 👨‍💻 Developed By

**Ravi Kumar**

B.Tech – Electronics and Communication Engineering

Narayana Engineering College, Gudur

GitHub: https://github.com/katakamravikumar10-lang

LinkedIn: *(Add your LinkedIn profile here)*

---

## ⭐ If you found this project useful, please consider giving it a Star!
