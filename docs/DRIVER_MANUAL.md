# Driver Manual — Smart Bus Tracking System

**Institution:** Narayana Engineering College

## 1. Getting Started
1. Install the web app on your phone (Add to Home Screen).
2. Sign in with the credentials issued by the admin office.
3. Grant **Location** permission when prompted — required for tracking.

## 2. Driver Dashboard
| Feature | Description |
|---|---|
| Assigned Bus | Shows your bus, current route, and next stop. |
| Start Trip | Begins GPS broadcasting to students and admins. |
| Stop Trip | Ends the trip; final ETA + summary sent. |
| GPS Signal | Strong / Good / Weak indicator based on accuracy. |
| Speed | Current speed calculated from GPS. |
| Idle Alert | Warns if the bus is idle > 3 minutes. |
| Route Deviation | Alerts if you go > 800 m off the route. |
| SOS | Emergency button — notifies admin instantly. |
| Route History | Replay today's trip for review. |

## 3. Trip Workflow
1. Board the bus and log in.
2. Verify assigned bus + route.
3. Tap **Start Trip**. Location updates begin (battery-optimized).
4. Drive the route — arrivals / departures at stops are auto-detected via geofencing.
5. Tap **Stop Trip** at the terminus.
6. Review Route History if needed.

## 4. Battery & Connectivity
- The app reduces polling frequency automatically on low battery.
- If GPS disconnects, it reconnects with exponential backoff.
- Offline banner appears when internet is lost; trip data resumes uploading on reconnect.

## 5. Emergency (SOS)
Press and hold the red **SOS** button for 2 seconds. Admin + emergency contacts receive your GPS location.

## 6. Rules
- Never drive while operating the phone.
- Mount the phone; do not hold it.
- Report any GPS or app issue immediately.

## 7. Support
Transport office: `transport@narayanaengg.edu.in` / +91-XXXX-XXXXXX