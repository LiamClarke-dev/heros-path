import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import logger from "./logger.js";

const STATEMENTS = [
  // ── USERS ──────────────────────────────────────────────────
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS replit_id TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_replit_id_unique
     ON users (replit_id) WHERE replit_id IS NOT NULL`,
  `UPDATE users SET profile_image_url = avatar_url
     WHERE profile_image_url IS NULL AND avatar_url IS NOT NULL`,

  // ── SESSIONS (express-session / connect-pg-simple format) ──
  `DROP TABLE IF EXISTS sessions`,
  `CREATE TABLE IF NOT EXISTS sessions (
     sid    TEXT PRIMARY KEY,
     sess   JSONB NOT NULL,
     expire TIMESTAMP NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS sessions_expire_idx ON sessions (expire)`,

  // ── PLACE_CACHE ─────────────────────────────────────────────
  `ALTER TABLE place_cache ADD COLUMN IF NOT EXISTS user_rating_count INTEGER`,
  `ALTER TABLE place_cache ADD COLUMN IF NOT EXISTS price_level TEXT`,
  `ALTER TABLE place_cache ADD COLUMN IF NOT EXISTS primary_type TEXT`,
  `ALTER TABLE place_cache ADD COLUMN IF NOT EXISTS editorial_summary TEXT`,
  `ALTER TABLE place_cache ADD COLUMN IF NOT EXISTS website_uri TEXT`,
  `ALTER TABLE place_cache ADD COLUMN IF NOT EXISTS google_maps_uri TEXT`,
  `ALTER TABLE place_cache ADD COLUMN IF NOT EXISTS phone_number TEXT`,
  `ALTER TABLE place_cache ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
  `UPDATE place_cache SET updated_at = cached_at
     WHERE updated_at IS NULL AND cached_at IS NOT NULL`,

  // ── JOURNEYS ────────────────────────────────────────────────
  `ALTER TABLE journeys ADD COLUMN IF NOT EXISTS xp_earned INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE journeys ADD COLUMN IF NOT EXISTS ping_count INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE journeys ADD COLUMN IF NOT EXISTS discovery_status TEXT NOT NULL DEFAULT 'pending'`,
  `ALTER TABLE journeys ADD COLUMN IF NOT EXISTS name TEXT`,
  `ALTER TABLE journeys ADD COLUMN IF NOT EXISTS xp_breakdown TEXT`,
  `ALTER TABLE journeys ADD COLUMN IF NOT EXISTS snapped_route JSONB`,

  // ── PLACE_LISTS ─────────────────────────────────────────────
  `ALTER TABLE place_lists ADD COLUMN IF NOT EXISTS emoji TEXT`,
  `ALTER TABLE place_lists ADD COLUMN IF NOT EXISTS color TEXT`,
  `UPDATE place_lists SET emoji = '📍' WHERE emoji IS NULL`,
  `UPDATE place_lists SET color = '#C9A84C' WHERE color IS NULL`,
  `ALTER TABLE place_lists ALTER COLUMN emoji SET NOT NULL`,
  `ALTER TABLE place_lists ALTER COLUMN emoji SET DEFAULT '📍'`,
  `ALTER TABLE place_lists ALTER COLUMN color SET NOT NULL`,
  `ALTER TABLE place_lists ALTER COLUMN color SET DEFAULT '#C9A84C'`,

  // ── USER_QUESTS ─────────────────────────────────────────────
  `ALTER TABLE user_quests ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0`,
  `UPDATE user_quests
     SET progress = COALESCE((progress_json->>'count')::integer, 0)
     WHERE progress = 0 AND progress_json IS NOT NULL AND progress_json != '{}'::jsonb`,

  // ── USER_PLACE_STATES (new table) ───────────────────────────
  `CREATE TABLE IF NOT EXISTS user_place_states (
     id               TEXT PRIMARY KEY,
     user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     google_place_id  TEXT NOT NULL REFERENCES place_cache(google_place_id) ON DELETE CASCADE,
     is_favorited     BOOLEAN NOT NULL DEFAULT FALSE,
     is_dismissed     BOOLEAN NOT NULL DEFAULT FALSE,
     is_snoozed       BOOLEAN NOT NULL DEFAULT FALSE,
     snooze_until     TIMESTAMPTZ,
     updated_at       TIMESTAMPTZ DEFAULT NOW()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS user_place_states_user_place_unique
     ON user_place_states (user_id, google_place_id)`,

  // ── PLACE_VISITS (new table) ────────────────────────────────
  `CREATE TABLE IF NOT EXISTS place_visits (
     id              TEXT PRIMARY KEY,
     user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     google_place_id TEXT NOT NULL REFERENCES place_cache(google_place_id) ON DELETE CASCADE,
     visited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     reaction        TEXT,
     tags            TEXT[] NOT NULL DEFAULT '{}',
     notes           TEXT,
     created_at      TIMESTAMPTZ DEFAULT NOW(),
     updated_at      TIMESTAMPTZ DEFAULT NOW()
   )`,

  // ── FRIENDSHIPS (new table) ─────────────────────────────────
  `CREATE TABLE IF NOT EXISTS friendships (
     id           TEXT PRIMARY KEY,
     requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     status       TEXT NOT NULL DEFAULT 'pending',
     created_at   TIMESTAMPTZ DEFAULT NOW(),
     updated_at   TIMESTAMPTZ DEFAULT NOW()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_unique
     ON friendships (requester_id, addressee_id)`,

  // ── FRIEND_INVITE_CODES (new table) ─────────────────────────
  `CREATE TABLE IF NOT EXISTS friend_invite_codes (
     id         TEXT PRIMARY KEY,
     user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     code       TEXT NOT NULL UNIQUE,
     used_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
     used_at    TIMESTAMPTZ,
     expires_at TIMESTAMPTZ NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   )`,

  // ── EXPLORATION_SHARING (new table) ─────────────────────────
  `CREATE TABLE IF NOT EXISTS exploration_sharing (
     id           TEXT PRIMARY KEY,
     user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     friend_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     shared_since TIMESTAMPTZ DEFAULT NOW()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS exploration_sharing_pair_unique
     ON exploration_sharing (user_id, friend_id)`,

  // ── LIST_SHARES (new table) ──────────────────────────────────
  `CREATE TABLE IF NOT EXISTS list_shares (
     id                  TEXT PRIMARY KEY,
     list_id             TEXT NOT NULL REFERENCES place_lists(id) ON DELETE CASCADE,
     shared_by_user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     shared_with_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     can_edit            BOOLEAN NOT NULL DEFAULT FALSE,
     created_at          TIMESTAMPTZ DEFAULT NOW()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS list_shares_list_user_unique
     ON list_shares (list_id, shared_with_user_id)`,

  // ── LIST_COLLABORATORS (new table) ───────────────────────────
  `CREATE TABLE IF NOT EXISTS list_collaborators (
     id       TEXT PRIMARY KEY,
     list_id  TEXT NOT NULL REFERENCES place_lists(id) ON DELETE CASCADE,
     user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     role     TEXT NOT NULL DEFAULT 'editor',
     added_at TIMESTAMPTZ DEFAULT NOW()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS list_collaborators_list_user_unique
     ON list_collaborators (list_id, user_id)`,

  // ── USER_PREFERENCES additions ───────────────────────────────
  `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS max_discoveries INTEGER NOT NULL DEFAULT 20`,
  `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS tokyo_wards text[] NOT NULL DEFAULT '{}'`,

  // ── ZONES: normalized grid model (G×G, G=20) ─────────────────
  `UPDATE zones SET grid_size = 20, total_cells = 400 WHERE grid_size IS NULL OR grid_size < 1`,
  `ALTER TABLE zones ALTER COLUMN grid_size TYPE integer USING ROUND(COALESCE(grid_size, 20))::integer`,
  `ALTER TABLE zones ALTER COLUMN grid_size SET DEFAULT 20`,
  `ALTER TABLE zones ALTER COLUMN total_cells SET DEFAULT 400`,
  `DELETE FROM zone_coverage WHERE visited_cells IS NOT NULL AND array_length(visited_cells, 1) > 0`,

  // ── NOTIFICATIONS (new table) ────────────────────────────────
  `CREATE TABLE IF NOT EXISTS notifications (
     id         TEXT PRIMARY KEY,
     user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     type       TEXT NOT NULL,
     payload    TEXT,
     read_at    TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW()
   )`,

  // ── ZONES (new table) ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS zones (
     id                 TEXT PRIMARY KEY,
     city               TEXT NOT NULL,
     name               TEXT NOT NULL,
     name_en            TEXT,
     ward_id            TEXT,
     boundary_geo_json  JSONB NOT NULL,
     centroid_lat       REAL NOT NULL,
     centroid_lng       REAL NOT NULL,
     total_cells        INTEGER NOT NULL DEFAULT 0,
     bbox_min_lat       REAL,
     bbox_max_lat       REAL,
     bbox_min_lng       REAL,
     bbox_max_lng       REAL,
     grid_size          REAL NOT NULL DEFAULT 0.0005
   )`,
  `CREATE INDEX IF NOT EXISTS zones_city_idx ON zones (city)`,
  `CREATE INDEX IF NOT EXISTS zones_ward_idx ON zones (ward_id)`,

  // ── ZONE_COVERAGE (new table) ────────────────────────────────
  `CREATE TABLE IF NOT EXISTS zone_coverage (
     user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     zone_id         TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
     visited_cells   INTEGER[] NOT NULL DEFAULT '{}',
     coverage_pct    REAL NOT NULL DEFAULT 0,
     updated_at      TIMESTAMPTZ DEFAULT NOW(),
     PRIMARY KEY (user_id, zone_id)
   )`,
  `CREATE INDEX IF NOT EXISTS zone_coverage_user_idx ON zone_coverage (user_id)`,

  // ── ZONE_COMPLETIONS (new table) ─────────────────────────────
  `CREATE TABLE IF NOT EXISTS zone_completions (
     user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     zone_id       TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
     completed_at  TIMESTAMPTZ DEFAULT NOW(),
     coverage_pct  REAL NOT NULL,
     PRIMARY KEY (user_id, zone_id)
   )`,
  `CREATE INDEX IF NOT EXISTS zone_completions_user_idx ON zone_completions (user_id)`,
];

export async function runMigrations(): Promise<void> {
  logger.info("Running database migrations...");
  for (const stmt of STATEMENTS) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ msg, stmt: stmt.slice(0, 80) }, "Migration statement skipped (non-fatal)");
    }
  }
  logger.info("Database migrations complete.");
}
