# Hero's Path — Workspace

## Overview

**Hero's Path** is a gamified city exploration mobile app (Expo/React Native + Express backend). It tracks GPS journeys, permanently colors walked streets on a map, discovers nearby places via Google Places API (New), manages discovered places, and gamifies exploration with quests, XP, badges, and adventurer rank progression.

pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 + pino logger
- **Mobile**: Expo (SDK 54) + React Native 0.81
- **Database**: PostgreSQL + Drizzle ORM
- **State management**: TanStack Query v5
- **Build**: tsx (dev), esbuild (prod)

## Adventurer Theme

- Background: `#0D0A0B` (very dark warm black)
- Gold accent: `#D4A017`
- Surface: `#1A1510`
- Parchment text: `#F5E6C8`
- Muted tan: `#A08060`

## Structure

```text
artifacts/
├── api-server/         # Express API server (port from $PORT env, default 8080)
│   └── src/
│       ├── app.ts      # Express setup (cors, pino-http, body-parser, cookie-parser)
│       ├── index.ts    # Server entry
│       ├── logger.ts   # Pino logger
│       ├── routes/     # index.ts — API routes (expanding each task)
│       └── middlewares/# auth.ts — requireAuth (placeholder → filled by A2)
├── heros-path/         # Expo React Native app
│   ├── app/
│   │   ├── _layout.tsx       # Root layout: QueryClientProvider, SafeAreaProvider, AuthContext
│   │   ├── (auth)/           # Auth screens (login — built in A2)
│   │   └── (tabs)/           # 4 tabs: Journey (index), Discover, Lists, Profile
│   ├── assets/
│   │   ├── icon.png          # App icon
│   │   └── sprites/          # link_idle.gif + 4 directional walk GIFs
│   ├── constants/
│   │   └── colors.ts         # Adventurer color palette + Google Maps dark style
│   └── lib/
│       └── api.ts            # Centralized apiFetch() using EXPO_PUBLIC_API_BASE_URL
└── mockup-sandbox/     # Vite component preview server
lib/
└── db/                 # Drizzle ORM schema + DB connection
    └── src/
        ├── index.ts    # db export (drizzle + pg Pool)
        └── schema/
            ├── index.ts
            └── users.ts  # users, sessions, user_preferences tables
```

## Key Files

- `lib/db/src/schema/users.ts` — users, sessions, user_preferences tables
- `artifacts/api-server/src/app.ts` — Express app setup
- `artifacts/api-server/src/middlewares/auth.ts` — requireAuth placeholder
- `artifacts/heros-path/app/_layout.tsx` — root layout + AuthContext (stub)
- `artifacts/heros-path/lib/api.ts` — centralized apiFetch utility
- `artifacts/heros-path/constants/colors.ts` — adventurer color palette + dark map style

## Auth Flow (A2 — not yet built)

Planned: Email/Password (dev testing) + Replit OIDC/PKCE (`expo-auth-session`).

## Environment Variables / Secrets

- `GOOGLE_MAPS_API_KEY` (secret) — Google Places API (New) for place discovery
- `GOOGLE_CLIENT_ID` (secret) — used by Replit Auth OIDC
- `GOOGLE_CLIENT_SECRET` (secret) — used by Replit Auth OIDC
- `EXPO_PUBLIC_API_BASE_URL` (env var) — API base URL for mobile app
- `DATABASE_URL` (runtime managed) — PostgreSQL connection string
- `PORT` (runtime managed) — assigned per workflow

## react-native-maps Notes

- **Pin to exactly `1.18.0`** — only version compatible with Expo Go
- **Do NOT add to plugins array** in app.json — will crash
- Web stub via `metro.config.js` `resolveRequest` returning `{ type: "empty" }`
- `expo-image` required for animated GIF sprites (RN Image does not animate GIFs on iOS)

## Critical Implementation Notes

- `useAnimatedStyle` must NEVER be called inside `.map()` or conditionally — extract to component
- API server imports use relative paths (`../middlewares/auth`) NOT `@/` aliases
- All top padding uses `useSafeAreaInsets()` — never hardcoded pt values
- `apiFetch` in `lib/api.ts` is the single API client — all features import from here
- `EXPO_PUBLIC_API_BASE_URL` must be set as env var in Replit secrets

## DB Schema Tables (A1 — initial)

`users`, `sessions`, `user_preferences`

Subsequent tasks add: `journeys`, `journey_waypoints`, `place_cache`, `user_discovered_places`, `journey_discovered_places`, `place_lists`, `place_list_items`, `user_badges`, `user_quests`, `place_visits`

## Rank Progression (planned A6)

| XP Range  | Rank         |
|-----------|--------------|
| 0–99      | Wanderer     |
| 100–299   | Scout        |
| 300–699   | Pathfinder   |
| 700–1499  | Trailblazer  |
| 1500–2999 | Cartographer |
| 3000+     | Legend       |

## Rebuild Task Status

- **Task #7 (A1)** — Clean Slate & Core Foundation: ✅ Complete
- **Task #8 (A2)** — Authentication (Email/Password + Replit Auth): ✅ Complete
- **Task #9 (A3)** — Map & Journey Tracking: ✅ Complete
- **Task #10 (A4)** — Place Discovery & Ping (Rich Data): ✅ Complete
- **Task #11 (A5)** — Place Management & Lists: Pending
- **Task #12 (A6)** — Gamification, Quests & Adventurer Rank: Pending
- **Task #13 (A7)** — Past Journeys, Profile & Polish: Pending
- **Task #14 (A8)** — Place Visit Tracking & Personal Ratings: Pending
- **Task #15 (A9)** — List Export to KML / Google My Maps: Pending
- **Task #16 (A10)** — Social: Friends, Shared & Collaborative Lists: Pending
