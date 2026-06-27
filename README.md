# Google Calendar Clone

A high-fidelity full-stack Google Calendar clone built for the Transvolt SDE Intern Assignment.

## Live Demo

- **Frontend**: [Deployed on Vercel] *(link after deployment)*  
- **Backend**: [Deployed on Render] *(link after deployment)*

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool (fast HMR) |
| MUI v5 (Material UI) | Component library |
| Framer Motion | Animations & transitions |
| date-fns | Date manipulation |
| Axios | HTTP client with JWT interceptors |
| React Router v6 | Client-side routing |
| notistack | Toast notifications |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express | REST API server |
| TypeScript | Type safety |
| Prisma ORM | Type-safe database access |
| SQLite (dev) / PostgreSQL (prod) | Persistent storage |
| Zod | Request validation |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |

---

## Setup Instructions

### Prerequisites
- Node.js >= 18
- npm >= 9

### 1. Clone & Install

```bash
git clone <repo-url>
cd Google_Calander_Clone
```

### 2. Backend Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma db push     # Creates SQLite database
npm run dev            # Starts backend on http://localhost:8080
```

**Environment variables** (`.env` in `backend/`):
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="supersecretjwtkey123"
PORT=8080
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev            # Starts frontend on http://localhost:3000
```

The Vite dev server proxies `/api` requests to `http://localhost:8080`.

---

## Architecture

```
┌─────────────────────────────────────────┐
│           BROWSER (React + Vite)        │
│  Auth Pages │ Calendar │ EventModal     │
│  Month / Week / Day Views               │
│  Framer Motion animations               │
└────────────────┬────────────────────────┘
                 │ HTTP + JWT Bearer token
                 ▼
┌─────────────────────────────────────────┐
│         Express.js REST API             │
│  /api/auth  (register, login, me)       │
│  /api/events (CRUD + range + overlap)   │
│  JWT middleware on all event routes     │
└────────────────┬────────────────────────┘
                 │ Prisma ORM
                 ▼
┌─────────────────────────────────────────┐
│         SQLite / PostgreSQL             │
│  Users table + Events table             │
│  All times stored in UTC               │
└─────────────────────────────────────────┘
```

### Data Flow
1. User logs in → receives JWT token stored in `localStorage`
2. All event API requests attach `Authorization: Bearer <token>` header
3. Backend middleware verifies JWT and extracts `userId`
4. All event queries are scoped to the authenticated user's data

---

## Business Logic & Edge Cases

### Event Times
- All timestamps stored in UTC in the database
- Frontend displays times in the user's local timezone via browser's `Date` API
- `new Date(isoString)` automatically converts UTC to local time

### Overlap Detection
1. Before saving, the EventModal calls `GET /api/events/overlapping?startTime=&endTime=&excludeId=`
2. Backend query: `startTime < event.endTime AND endTime > event.startTime` (standard interval overlap)
3. If overlaps found, a warning banner is shown with conflicting event names
4. User can choose to "Save anyway" or cancel

### Validation
- Backend uses **Zod** schemas to validate all incoming data
- `endTime` must be strictly after `startTime` (enforced both frontend and backend)
- Title is required (min 1 character)
- Passwords hashed with bcrypt (10 rounds)

### Auth Edge Cases
- Expired/invalid JWT → interceptor redirects to `/login`
- User data (name, email) stored in `localStorage` alongside token for instant display

### Recurring Events
- Stored as a `recurrence` field: `"none" | "daily" | "weekly" | "monthly"`
- UI allows selecting recurrence on event creation/edit
- Backend stores the recurrence type; instances are not expanded server-side (stored as templates)

---

## Animations & Interactions

| Feature | Implementation |
|---------|---------------|
| View transitions (month/week/day) | `AnimatePresence` + `motion.div` with opacity/x slide |
| Event modal open/close | `motion.div` scale + opacity on Dialog Paper |
| Event pills in month view | `motion.div` initial scale 0.9 → 1 on mount |
| Event blocks in week/day | `motion.div` with `whileHover` scale effect |
| Overlap warning banner | `AnimatePresence` height 0 → auto animation |
| Login/register pages | Fade + translateY entrance animation |
| Sidebar | MUI Drawer with 0.25s CSS transition |
| Color picker | CSS `transform: scale(1.2)` on hover |

---

## API Reference

### Auth
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/api/auth/register` | No | `{ name, email, password }` |
| POST | `/api/auth/login` | No | `{ email, password }` |
| GET | `/api/auth/me` | Yes | — |

### Events
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/events` | Yes | All user events |
| GET | `/api/events/:id` | Yes | Single event |
| GET | `/api/events/range?startDate=&endDate=` | Yes | Events in range |
| GET | `/api/events/overlapping?startTime=&endTime=&excludeId=` | Yes | Overlap check |
| POST | `/api/events` | Yes | Create event |
| PUT | `/api/events/:id` | Yes | Update event |
| DELETE | `/api/events/:id` | Yes | Delete event |

---

## Theory Questions

### Q1: Scaling to 1 Million Users

To redesign the backend for 1M users:

**Event Retrieval:**
- Add **composite indexes** on `(userId, startTime, endTime)` for fast range queries
- Use **pagination** with cursor-based pagination for large result sets
- Deploy **Redis** as a cache layer for frequently accessed date ranges (e.g., current month view)
- Use **read replicas** (PostgreSQL streaming replication) for read-heavy workloads

**Recurring Events:**
- Store recurring event **templates** separately from instances
- Use a **background job** (e.g., BullMQ) to pre-generate instances for the next N months
- Store expansion results in a separate `EventInstance` table indexed by date

**Preventing Inconsistencies (Multi-device Edit):**
- Implement **optimistic locking**: add a `version` field to events; reject updates where `version` doesn't match
- Use **database transactions** for overlap checks + event saves to prevent race conditions
- Consider **event sourcing** for conflict resolution: store all mutations as an append-only log
- Use **WebSockets** or **SSE** to push real-time updates to other connected devices

**Infrastructure:**
- Deploy behind a **load balancer** (e.g., AWS ALB) with horizontal scaling
- Use **connection pooling** (PgBouncer) to manage DB connections efficiently
- Move to **PostgreSQL** with partitioning by `userId` hash for massive scale

---

### Q2: Frontend Performance for Thousands of Events

**Techniques to apply:**

1. **Windowed Rendering (Virtual DOM)**: Use `react-window` or `react-virtual` to only render events visible in the viewport. For a week view with 1000+ events, only ~50 are visible at once — rendering all 1000 would cause layout thrashing.

2. **Memoization with `useMemo`**: Already implemented — `filteredEvents` only recomputes when `events`, `currentDate`, or `currentView` changes, avoiding unnecessary array scans.

3. **Date Range Filtering at the API level**: Instead of fetching all events and filtering on the client, use `GET /api/events/range?startDate=&endDate=` to only load events for the visible window. Reduces initial payload by 99% for users with years of history.

4. **`React.memo` on event components**: Wrap individual event pill/block components in `React.memo` so they only re-render when their specific event data changes, not on every parent state change.

5. **Debounced API calls**: When navigating quickly (prev/next buttons), debounce the API refetch to avoid firing 5 requests for 5 quick clicks.

6. **Canvas rendering for dense views**: If 10,000+ events need display simultaneously, consider a canvas-based approach (like `react-konva`) instead of DOM nodes, which drastically reduces memory usage.

7. **Web Workers for overlap calculation**: The `processOverlappingEvents()` algorithm is O(n²) in the worst case. For large datasets, offload it to a Web Worker to avoid blocking the main thread during layout computation.

---

## Future Enhancements

- **Google OAuth integration** for real Google account sign-in
- **Calendar sharing** between users (share calendar, view-only access)
- **Event invitations** with email notifications
- **Drag-and-drop** with `@dnd-kit` for moving events between time slots
- **Resize handles** on events to extend duration by dragging the bottom edge
- **Search** across all event titles, descriptions, and locations
- **Offline support** with Service Workers and IndexedDB for full offline CRUD
- **Push notifications** via Web Push API for event reminders
- **Import/Export** ICS files for compatibility with other calendar apps
- **Multiple timezone support** for meetings across time zones
