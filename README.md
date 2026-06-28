# Google Calendar Clone

A full-stack, highly interactive Google Calendar clone built with React, Node.js, Express, and PostgreSQL. This application accurately replicates the UI/UX of Google Calendar while providing robust backend features including JWT authentication, complex recurring events, and drag-and-drop capabilities.

**🔗 Live Demo:** [https://google-calender-mu.vercel.app/](https://google-calender-mu.vercel.app/)

---

## 🏗️ Architecture & Data Flow

The application follows a modern Client-Server architecture.

```mermaid
graph TD
    subgraph Frontend [Frontend (React + Vite)]
        UI[User Interface / Views]
        State[React Context / State]
        API_Client[Axios API Client]
        UI <--> State
        State <--> API_Client
    end

    subgraph Backend [Backend (Node + Express)]
        Router[Express Router]
        Auth[JWT Middleware]
        Controllers[Event & User Controllers]
        Prisma[Prisma ORM]
        
        Router --> Auth
        Auth --> Controllers
        Controllers <--> Prisma
    end

    subgraph Database [Database]
        Postgres[(PostgreSQL)]
    end

    API_Client <-->|REST API / JSON| Router
    Prisma <-->|SQL| Postgres
```

### Technology Choices
* **Frontend:** React (TypeScript), Vite, Material UI (MUI) for accessible components, `date-fns` for precise date manipulation, and `rrule` for recurrence rule parsing.
* **Backend:** Node.js, Express, Zod for schema validation, `rrule` for expanding recurring dates, and bcrypt/jsonwebtoken for authentication.
* **Database:** PostgreSQL hosted on Supabase, interacted with via Prisma ORM for strong typing and easy migrations.

---

## ✨ Features Delivered

* **UI Fidelity:** Exact replication of Google Calendar's Month, Week, and Day views with dynamic scaling and positioning.
* **Core Event Management:** Create, read, update, and delete events.
* **Drag and Drop:** Full drag-and-drop support across all views, including resizing events to change duration.
* **Collision Detection:** Visually warns users if they try to save an event that overlaps with another.

### 🌟 Bonus Features
1. **Authentication:** Fully implemented! Includes signup, login, and JWT-based protected routes.
2. **Recurring Events:** Fully implemented! Supports Daily, Weekly, and Monthly recurrence using standard iCalendar RRULE formats.
3. **Editing Recurring Instances:** Fully implemented! Allows users to modify or delete *“This event”*, *“This and following events”*, or *“All events”* safely by creating exception records and modifying RRULE boundaries.
4. **Offline Draft Support:** *(Not implemented)* **How it could be done:** We could use a Service Worker alongside `IndexedDB` or `localStorage`. When the user is offline, we save event creations/edits to a local "sync queue" and optimistically update the React UI. Once the `window.addEventListener('online')` event fires, a background sync function would sequentially flush the queue to the backend API, resolving any version conflicts.

---

## 🛡️ Business Logic & Edge Cases Handled

* **Timezone Consistency:** All timestamps are strictly converted and stored in UTC in the database, and formatted back to the user's local timezone on the frontend.
* **Recurrence Expansion:** Recurring events are stored as a single master record. The backend dynamically expands these into individual occurrences based on the requested date range, ensuring we don't clog the database with infinite records.
* **Complex Deletions:** When deleting "This and following" occurrences, the backend dynamically truncates the `UNTIL` property of the master event and creates a new master event for any subsequent occurrences if necessary.
* **Overlapping Events in Week/Day View:** The frontend calculates visual overlap using an algorithm that groups colliding events into "columns", adjusting their CSS `width` and `left` properties so they render side-by-side gracefully without covering each other.
* **Drag-and-Drop Constraints:** Prevents dragging the end time of an event before its start time, and accurately converts pixel-coordinates into 15-minute time intervals.

---

## 🎨 Animations & Interactions

* **Modals & Popovers:** Custom-built popovers that calculate screen boundaries to render in the optimal position (e.g., flipping to the left if too close to the right edge).
* **Feedback States:** Material UI's built-in ripple effects, smooth transitions on hover states, and dynamic box-shadows when dragging events.
* **Notifications:** Utilized `notistack` for non-intrusive, auto-dismissing snackbar notifications (e.g., "Event saved!", "Overlap detected").

---

## 🚀 Future Enhancements

* **Shared Calendars:** Allow users to share calendar access with other registered emails.
* **Push Notifications:** Integrate Web Push API to send users notifications 10 minutes before an event starts.
* **OAuth Integration:** Add Google and GitHub SSO login options.

---

## 📚 Theory Questions

**1. Imagine your calendar application now serves one million users. How would you redesign the backend to efficiently retrieve events, support recurring events, and prevent inconsistencies when multiple devices edit the same event?**
* **Retrieval & Caching:** I would introduce a caching layer like Redis to cache frequently accessed date ranges (e.g., the current month) for active users. The database would be partitioned/sharded by `userId` since calendar data is highly user-isolated.
* **Recurring Events:** Dynamically expanding RRULEs on every read becomes a bottleneck at scale. I would use a background worker to pre-compute and materialize occurrences into a fast read-cache (or materialized view) for the next 1-2 years, updating it asynchronously when a master event is modified.
* **Concurrency (Inconsistencies):** I would implement Optimistic Concurrency Control (OCC). Every event record would have a `version` number or `updatedAt` timestamp. When a device sends an edit request, it includes the version it knows about. If the version in the DB has changed (because another device edited it), the backend rejects the request and prompts the user to refresh their client.

**2. Your calendar becomes slow when rendering thousands of events. What frontend optimization techniques would you apply to improve performance, and why would each technique help?**
* **Virtualization (Windowing):** I would implement virtualization (using libraries like `react-window`) to only render the DOM nodes for events currently visible on the screen. This drastically reduces the DOM size and layout calculation time.
* **Memoization:** Wrap event components and grid cells in `React.memo` and use `useMemo`/`useCallback` extensively. This prevents React from needlessly re-rendering thousands of unchanged events just because a top-level state (like a modal opening) changed.
* **Data Pagination & Lazy Loading:** Only fetch events from the API for the strict date bounds the user is viewing, rather than loading the entire year into Redux/Context state at once.
* **Throttling/Debouncing:** Throttle expensive scroll or drag event handlers to calculate layout updates at a maximum of 60fps instead of every millisecond.

---

## 🛠️ Setup Instructions

### Prerequisites
* Node.js (v18+)
* PostgreSQL Database (Local or Cloud like Supabase)

### Backend Setup
1. `cd backend`
2. `npm install`
3. Create a `.env` file with your database variables:
   ```env
   DATABASE_URL="postgresql://user:password@host:port/db"
   DIRECT_URL="postgresql://user:password@host:port/db"
   JWT_SECRET="your_secret"
   PORT=8080
   ```
4. `npm run db:push` (Pushes the Prisma schema to the database)
5. `npm run dev` (Starts the backend on port 8080)

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. Create a `.env` file for the frontend:
   ```env
   VITE_API_URL="http://localhost:8080"
   ```
4. `npm run dev` (Starts the Vite dev server on port 3000/3001)
