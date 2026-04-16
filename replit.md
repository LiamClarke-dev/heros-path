# Hero's Path — Workspace

## Overview

**Hero's Path** is a gamified city exploration mobile app (Expo/React Native + Express backend). It tracks GPS journeys, permanently colors walked streets on a map, discovers nearby places via Google Places API (New), manages discovered places with lists, and gamifies exploration with quests, XP, badges, and adventurer rank progression.

pnpm workspace monorepo using TypeScript throughout.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 + pino logger
- **Mobile**: Expo SDK 54 + React Native 0.81
- **Database**: PostgreSQL + Drizzle ORM
- **State management**: TanStack Query v5
- **Build**: tsx (dev), esbuild (prod)
- **Auth**: JWT (30-day expiry) + Replit OIDC/PKCE via `expo-auth-session`

## Adventurer Theme

- Background: `#0D0A0B` (very dark warm black)
- Gold accent: `#D4A017`
- Surface: `#1A1510`
- Parchment text: `#F5E6C8`
- Muted tan: `#A08060`
- Error: `#E53935` | Success: `#4A9B5E`

## Structure

```text
artifacts/
├── api-server/         # Express API server (port from $PORT env, default 8080)
│   └── src/
│       ├── app.ts      # Express setup (cors, pino-http, body-parser, cookie-parser)
│       ├── index.ts    # Server entry
│       ├── logger.ts   # Pino logger
│       ├── routes/     # auth, journeys, places, lists, gamification, profile
│       ├── lib/        # geo, discovery, gamification, placesApi, objectStorage
│       └── middlewares/# requireAuth — JWT Bearer token validation
├── heros-path/         # Expo React Native app
│   ├── app/
│   │   ├── _layout.tsx         # Root layout: QueryClient, SafeArea, AuthContext
│   │   ├── (auth)/             # login.tsx — Email/Password + Replit OAuth
│   │   ├── (tabs)/             # 4 tabs: Journey (index), Discover, Lists, Profile
│   │   ├── past-journeys.tsx   # Journey history list with static map thumbnails
│   │   ├── journey-detail.tsx  # Full journey detail + map + places + retry discovery
│   │   ├── place-detail.tsx    # Place detail screen
│   │   ├── lists/              # List detail screen
│   │   └── settings/           # _layout.tsx, index.tsx, preferences.tsx, about.tsx
│   ├── components/
│   │   ├── PlaceCard.tsx           # Discovered place card with actions
│   │   ├── QuestProgressBar.tsx    # Animated quest progress bar
│   │   ├── CharacterMarker.tsx     # Animated pixel-art sprite on map
│   │   ├── AddToListSheet.tsx      # Add place to list bottom sheet
│   │   ├── CreateListSheet.tsx     # Create list bottom sheet
│   │   ├── PingResultsSheet.tsx    # Ping discovery results bottom sheet
│   │   └── ErrorFallback.tsx       # Error boundary fallback (no reloadAppAsync)
│   ├── assets/
│   │   ├── icon.png          # App icon
│   │   └── sprites/          # link_idle.gif + 4 directional walk GIFs
│   ├── constants/
│   │   └── colors.ts         # Adventurer color palette + Google Maps dark style
│   └── lib/
│       ├── api.ts            # apiFetch() using EXPO_PUBLIC_API_BASE_URL
│       └── auth.ts           # AuthContext + JWT storage
└── mockup-sandbox/     # Vite component preview server
lib/
└── db/                 # Drizzle ORM schema + DB connection
    └── src/
        ├── index.ts    # db export (drizzle + pg Pool)
        └── schema/
            ├── index.ts
            ├── users.ts          # users, sessions, user_preferences
            ├── journeys.ts       # journeys, journey_waypoints
            ├── places.ts         # place_cache, journey_discovered_places,
            │                     #   user_discovered_places
            ├── lists.ts          # place_lists, place_list_items
            └── gamification.ts   # user_badges, user_quests
```

## API Routes

### Auth (`/api/auth`)
- `POST /login` — Email/password → JWT
- `POST /register` — Create account
- `GET /replit` — Start Replit OIDC flow
- `GET /replit/callback` — OIDC callback → JWT
- `POST /logout`

### Journeys (`/api/journeys`)
- `GET /` — Paginated list of completed journeys (incl. `staticMapUrl`, `placeCount`, `durationSeconds`)
- `POST /` — Start new journey
- `PATCH /:id` — Append waypoints OR end journey (triggers discovery + gamification)
- `GET /history` — Waypoints-only feed for map coloring overlay
- `GET /explored-cells` — Explored grid cells for dark-map overlay
- `GET /:id` — Full journey detail: waypoints + discovered places + stats
- `POST /:id/ping` — Ping nearby places (increments `pingCount`)
- `POST /:id/discover` — Retry place discovery (if status is failed/pending)

### Places (`/api/places`)
- `GET /discovered` — User's discovered places (filterable by state)
- `GET /search` — Nearby search (Google Places API)
- `GET /:id` — Place detail (from cache + Google)
- `POST /:id/state` — Set favorite/dismiss/snooze
- `GET /me/preferences` | `PUT /me/preferences` — Discovery filters

### Lists (`/api/lists`)
- `GET /` — User's lists
- `POST /` — Create list
- `GET /:id` — List with items
- `PATCH /:id` — Rename/re-emoji list
- `DELETE /:id` — Delete list
- `POST /:id/items` — Add place to list
- `DELETE /:id/items/:googlePlaceId` — Remove from list

### Gamification (`/api`)
- `GET /quests` — Active + completed quests with progress
- `GET /badges` — Earned + available badges
- `GET /me/stats` — Full profile stats (XP, level, rank, streak, distance, journeys, places)

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Google Places API (New) + Static Maps API — required |
| `JWT_SECRET` | JWT signing secret — required |
| `REPLIT_CLIENT_ID` | Replit OIDC client ID |
| `REPLIT_CLIENT_SECRET` | Replit OIDC client secret |
| `DATABASE_URL` | PostgreSQL connection string (managed by Replit) |
| `PORT` | HTTP port (managed per-workflow by Replit) |
| `EXPO_PUBLIC_API_BASE_URL` | API base URL for mobile app (e.g. `https://xxx.replit.app`) |

## react-native-maps Notes

- **Pin to exactly `1.18.0`** — only version compatible with Expo Go
- **Do NOT add to plugins array** in `app.json` — causes native build failures
- Web stub via `metro.config.js` `resolveRequest` returning `{ type: "empty" }`
- Loaded via conditional `require()` with try/catch to avoid web crashes

## Critical Implementation Notes

- `expo-image` required for animated GIF sprites (RN Image does not animate GIFs on iOS)
- `useAnimatedStyle` / Animated hooks NEVER inside `.map()` — extract to named component
- API server imports use `.js` extension on relative paths (ESM TypeScript)
- All top padding uses `useSafeAreaInsets()` — never hardcoded values
- `apiFetch` in `lib/api.ts` is the single API client
- Quest progress values must be `Math.round()`ed before DB insert (INTEGER column)
- Quest reset-on-completion: `completedAt = null` and `progress = 0` immediately when quest completes, so all quests stay concurrently active; completion events captured in journey response for celebration overlay
- New-place detection uses `firstDiscoveredAt >= journeyStartedAt` (not `discoveryCount === 1`)
- `computeLevel(xp)` = `Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1)`
- `ErrorFallback` component must NEVER import or call `reloadAppAsync` from expo

## Profile Editing (Task #27)

- **Avatar upload**: `POST /api/profile/avatar` (multipart JPEG/PNG, max 5MB) stores in Replit Object Storage (GCS). Avatars are served publicly via `GET /api/avatars/:userId/:filename` (no auth required).
- **Display name edit**: `PATCH /api/profile` accepts `{ displayName?, profileImageUrl? }`, returns a refreshed JWT.
- **Object storage**: Provisioned at bucket `replit-objstore-b9e63e29-ae8a-4e8e-97c8-90c996abfd53`. Sidecar auth at `http://127.0.0.1:1106`. Object keys: `avatars/{userId}/{timestamp}.{ext}`.
- **Profile screen**: Avatar shows camera edit badge; tapping opens action sheet (Take Photo / Choose from Library / Remove Photo). Display name shows pencil icon; tapping opens edit modal.
- **Auth context**: Added `updateProfile()` (calls PATCH endpoint + persists new token) and `applyAuthResponse()` (directly stores a token+user from API response).
- **Google My Maps redirect URI**: Fixed non-iOS OAuth redirect to use `{ useProxy: true }` → `https://auth.expo.io/@liamclarke-dev/herospath-replit`. GCP console must whitelist this URI and origin.
- **GCP Console action required**: Go to [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials?project=155152959717) → Web OAuth Client → add to Authorized redirect URIs:
  - `https://auth.expo.io/@liamclarke-dev/herospath-replit`
  - `https://ff0550f0-ceb2-4d52-a209-7054d365e4c2-00-1bh7yph6mfm94.expo.kirk.replit.dev`
  Add to Authorized JavaScript Origins: `https://ff0550f0-ceb2-4d52-a209-7054d365e4c2-00-1bh7yph6mfm94.expo.kirk.replit.dev`
  For iOS OAuth client: verify bundle ID is `com.herospath.app`.
  Enable [Google Drive API](https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=155152959717).

## Known Limitations

- **Replit Auth OIDC/PKCE**: Only works in production/standalone builds. In Expo Go, the redirect URI does not match `myapp://`. Use Email/Password login during development.
- **Street coloring**: Grid-cell based (0.0005° ≈ 55m cells), not true road snapping
- **Static map thumbnails**: Use Google Static Maps API — require `GOOGLE_MAPS_API_KEY` to be set
- **Places API**: Requires Places API (New) enabled in the Google Cloud project

## DB Schema Tables

All tables in PostgreSQL (managed by Drizzle ORM, pushed via `pnpm --filter @workspace/db exec tsc -p tsconfig.json` then schema push):

`users`, `sessions`, `user_preferences`, `journeys`, `journey_waypoints`, `place_cache`, `user_discovered_places`, `journey_discovered_places`, `place_lists`, `place_list_items`, `user_badges`, `user_quests`

After any schema change, rebuild the db package: `pnpm --filter @workspace/db exec tsc -p tsconfig.json`

## Rank Progression

| Level | Rank         |
|-------|--------------|
| 1     | Wanderer     |
| 2     | Scout        |
| 3     | Pathfinder   |
| 4     | Trailblazer  |
| 5     | Cartographer |
| 6     | Ranger       |
| 7     | Wayfarer     |
| 8     | Nomad        |
| 9     | Explorer     |
| 10    | Legendary Explorer |

Level formula: `Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1)`

## How to Run Locally

```bash
# Install dependencies
pnpm install

# Start API server (runs on PORT env var, default 8080)
pnpm --filter @workspace/api-server run dev

# Start Expo mobile app
pnpm --filter @workspace/heros-path run dev
```

Set `EXPO_PUBLIC_API_BASE_URL` to your API server URL (e.g. `http://localhost:8080` for local dev, or the Replit preview URL for Replit dev).

## Rebuild Task Status

- **Task #7 (A1)** — Clean Slate & Core Foundation: ✅ Complete
- **Task #8 (A2)** — Authentication (Email/Password + Replit Auth): ✅ Complete
- **Task #9 (A3)** — Map & Journey Tracking: ✅ Complete
- **Task #10 (A4)** — Place Discovery & Ping (Rich Data): ✅ Complete
- **Task #11 (A5)** — Place Management & Lists: ✅ Complete
- **Task #12 (A6)** — Gamification, Quests & Adventurer Rank: ✅ Complete
- **Task #13 (A7)** — Past Journeys, Profile & Polish: ✅ Complete
- **Task #14 (A8)** — Place Visit Tracking & Personal Ratings: Pending
- **Task #15 (A9)** — List Export to KML / Google My Maps: Pending
- **Task #16 (A10)** — Social: Friends, Shared & Collaborative Lists: Pending
