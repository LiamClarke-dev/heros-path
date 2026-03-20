# Hero's Path — Workspace

## Overview

**Hero's Path** is a gamified city exploration mobile app (Expo/React Native + Express backend). It tracks GPS journeys, permanently colors walked streets on a map, discovers nearby places via Google Places API, manages discovered places, and gamifies exploration with quests, XP, badges, and adventurer rank progression.

pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Mobile**: Expo (SDK 54) + React Native 0.81
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Adventurer Theme

- Background: `#0D0A0B` (very dark warm black)
- Gold accent: `#D4A017`
- Surface: `#1A1510`
- Parchment text: `#F5E6C8`
- Muted tan: `#A08060`

## Structure

```text
artifacts/
├── api-server/         # Express API server (port 8080)
│   └── src/
│       ├── routes/     # auth, me, journeys, places, lists, quests, profile, health
│       └── middlewares/# requireAuth (Bearer token from sessions table)
├── heros-path/         # Expo React Native app
│   └── app/
│       ├── (auth)/     # login.tsx — Google OAuth login screen
│       ├── (tabs)/     # index (Journey), discover, lists, profile
│       └── dev/        # simulate.tsx — dev journey simulator (__DEV__ only)
└── mockup-sandbox/     # Vite component preview server
lib/
├── api-spec/           # OpenAPI 3.1 spec + Orval codegen config
├── api-client-react/   # Generated React Query hooks + custom-fetch.ts
├── api-zod/            # Generated Zod schemas from OpenAPI
└── db/                 # Drizzle ORM schema + DB connection
```

## Key Files

- `lib/api-spec/openapi.yaml` — full API spec
- `lib/db/src/schema/` — users, sessions, journeys, places, lists, gamification tables
- `artifacts/api-server/src/routes/auth.ts` — Google token verification + session creation
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` middleware
- `artifacts/heros-path/context/AuthContext.tsx` — auth state + SecureStore persistence
- `artifacts/heros-path/app/_layout.tsx` — root layout with auth redirect logic
- `artifacts/heros-path/constants/colors.ts` — adventurer color palette + dark map style

## Auth Flow

1. Expo uses `expo-auth-session` to get a Google ID token
2. ID token sent to `POST /api/auth/google` — verified via `oauth2.googleapis.com/tokeninfo`
3. User upserted in DB, session token generated with `crypto.randomUUID()`
4. Token stored in `expo-secure-store`, loaded back on app start
5. `setAuthTokenGetter()` wires token into all API calls via Bearer header

## Environment Variables / Secrets

- `GOOGLE_MAPS_API_KEY` (secret) — Google Places API for place discovery pings
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (shared env var) — Google OAuth Web Client ID for login
- `DATABASE_URL` (runtime managed) — PostgreSQL connection string
- `PORT` (runtime managed) — assigned per workflow

## react-native-maps Notes

- **Pin to exactly `1.18.0`** — only version compatible with Expo Go
- **Do NOT add to plugins array** in app.json — will crash
- Web stub at `stubs/react-native-maps.web.js` (aliased via metro.config.js)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json`. Run `pnpm run typecheck` from root for full build graph.

## DB Schema Tables

`users`, `sessions`, `user_preferences`, `journeys`, `journey_waypoints`, `place_cache`, `user_discovered_places`, `journey_discovered_places`, `place_lists`, `place_list_items`, `user_badges`, `user_quests`

## Rank Progression

| XP Range  | Rank         |
|-----------|--------------|
| 0–99      | Wanderer     |
| 100–299   | Scout        |
| 300–699   | Pathfinder   |
| 700–1499  | Trailblazer  |
| 1500–2999 | Cartographer |
| 3000+     | Legend       |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/google` | No | Google OAuth → session token |
| GET | `/api/me` | Yes | Current user profile |
| GET/PUT | `/api/me/preferences` | Yes | Place type preferences |
| GET | `/api/me/badges` | Yes | Badge collection |
| GET | `/api/profile/stats` | Yes | Journey/XP/streak stats |
| GET | `/api/quests` | Yes | Active + completed quests |
| POST | `/api/journeys` | Yes | Start a journey |
| GET | `/api/journeys` | Yes | Journey history |
| GET/PATCH | `/api/journeys/:id` | Yes | Journey detail + add waypoints |
| POST | `/api/journeys/:id/ping` | Yes | Discover nearby places (Google Places) |
| GET | `/api/journeys/:id/discoveries` | Yes | Places found during journey |
| GET | `/api/places/discover` | Yes | All discovered places (filterable) |
| POST | `/api/places/:id/action` | Yes | dismiss/snooze/favorite/add_to_list |
| GET/POST | `/api/lists` | Yes | Place lists |
| GET/PUT/DELETE | `/api/lists/:id` | Yes | List management |
| GET | `/api/lists/:id/places` | Yes | Places in a list |

## Task Status

- **Task #1** (Foundation — Auth, DB, Nav & Dev Mode): Complete
- **Task #2** (Journey Tracking): Pending
- **Task #3** (Place Management): Pending
- **Task #4** (Gamification): Pending

## Google OAuth Setup Note

For the Google OAuth login to work on device, add the following authorized redirect URIs to your Google Cloud OAuth 2.0 client:
- For Expo Go: `https://auth.expo.io/@your-username/heros-path`
- For web: the Expo dev domain URL
