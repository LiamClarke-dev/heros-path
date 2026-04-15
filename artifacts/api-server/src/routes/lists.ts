import { Router, type Request, type Response } from "express";
import {
  db,
  users,
  placeLists,
  placeListItems,
  placeCache,
  listShares,
  listCollaborators,
  friendships,
} from "@workspace/db";
import { eq, and, count, sql, or } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import logger from "../logger.js";

async function areAcceptedFriends(userA: string, userB: string): Promise<boolean> {
  const lo = userA < userB ? userA : userB;
  const hi = userA < userB ? userB : userA;
  const [row] = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        eq(friendships.requesterId, lo),
        eq(friendships.addresseeId, hi),
        eq(friendships.status, "accepted")
      )
    );
  return !!row;
}

const router = Router();

function photoUrl(ref: string | null | undefined, width = 400): string | null {
  if (!ref) return null;
  const key = process.env.GOOGLE_MAPS_API_KEY ?? "";
  if (ref.includes("/")) {
    return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${width}&key=${key}`;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photoreference=${ref}&key=${key}`;
}

router.get("/", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const rows = await db
    .select({
      id: placeLists.id,
      name: placeLists.name,
      emoji: placeLists.emoji,
      createdAt: placeLists.createdAt,
      itemCount: sql<number>`count(${placeListItems.id})::int`,
    })
    .from(placeLists)
    .leftJoin(placeListItems, eq(placeListItems.listId, placeLists.id))
    .where(eq(placeLists.userId, user.id))
    .groupBy(placeLists.id)
    .orderBy(placeLists.createdAt);

  res.json({ lists: rows });
});

router.post("/", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const { name, emoji } = req.body as { name?: unknown; emoji?: unknown };

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [list] = await db
    .insert(placeLists)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      name: name.trim(),
      emoji: typeof emoji === "string" ? emoji : null,
    })
    .returning();

  res.status(201).json({ list: { ...list, itemCount: 0 } });
});

router.delete("/:listId", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const listId = req.params.listId as string;

  const [deleted] = await db
    .delete(placeLists)
    .where(and(eq(placeLists.id, listId), eq(placeLists.userId, user.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  res.json({ ok: true });
});

router.get("/shared-with-me", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const shares = await db
    .select({
      listId: listShares.listId,
      canEdit: listShares.canEdit,
      createdAt: listShares.createdAt,
      sharedByUserId: listShares.sharedByUserId,
    })
    .from(listShares)
    .where(eq(listShares.sharedWithUserId, user.id));

  if (shares.length === 0) {
    res.json({ lists: [] });
    return;
  }

  const ownerIds = [...new Set(shares.map((s) => s.sharedByUserId))];
  const ownerRows = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(
      sql`${users.id} = ANY(ARRAY[${sql.join(
        ownerIds.map((id) => sql`${id}::text`),
        sql`, `
      )}])`
    );
  const ownerMap = Object.fromEntries(ownerRows.map((u) => [u.id, u]));

  const listIds = shares.map((s) => s.listId);
  const listRows = await db
    .select({
      id: placeLists.id,
      name: placeLists.name,
      emoji: placeLists.emoji,
      createdAt: placeLists.createdAt,
      itemCount: count(placeListItems.id),
    })
    .from(placeLists)
    .leftJoin(placeListItems, eq(placeListItems.listId, placeLists.id))
    .where(
      sql`${placeLists.id} = ANY(ARRAY[${sql.join(
        listIds.map((id) => sql`${id}::text`),
        sql`, `
      )}])`
    )
    .groupBy(placeLists.id);

  const listMap = Object.fromEntries(listRows.map((l) => [l.id, l]));

  const lists = shares.map((s) => ({
    ...listMap[s.listId],
    canEdit: s.canEdit,
    sharedBy: ownerMap[s.sharedByUserId] ?? null,
    sharedAt: s.createdAt,
  }));

  res.json({ lists });
});

router.get("/:listId", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const listId = req.params.listId as string;

  const [list] = await db
    .select()
    .from(placeLists)
    .where(eq(placeLists.id, listId));

  if (!list) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  const isOwner = list.userId === user.id;

  if (!isOwner) {
    const [share] = await db
      .select({ listId: listShares.listId })
      .from(listShares)
      .where(
        and(
          eq(listShares.listId, listId),
          eq(listShares.sharedWithUserId, user.id)
        )
      );
    const [collab] = await db
      .select({ listId: listCollaborators.listId })
      .from(listCollaborators)
      .where(
        and(
          eq(listCollaborators.listId, listId),
          eq(listCollaborators.userId, user.id)
        )
      );
    if (!share && !collab) {
      res.status(404).json({ error: "List not found" });
      return;
    }
  }

  const items = await db
    .select({
      googlePlaceId: placeCache.googlePlaceId,
      name: placeCache.name,
      lat: placeCache.lat,
      lng: placeCache.lng,
      rating: placeCache.rating,
      primaryType: placeCache.primaryType,
      types: placeCache.types,
      photoReference: placeCache.photoReference,
      address: placeCache.address,
      addedAt: placeListItems.addedAt,
    })
    .from(placeListItems)
    .innerJoin(
      placeCache,
      eq(placeListItems.googlePlaceId, placeCache.googlePlaceId)
    )
    .where(eq(placeListItems.listId, listId))
    .orderBy(placeListItems.addedAt);

  const places = items.map((p) => ({
    ...p,
    lat: parseFloat(String(p.lat)),
    lng: parseFloat(String(p.lng)),
    rating: p.rating !== null ? parseFloat(String(p.rating)) : null,
    photoUrl: photoUrl(p.photoReference),
  }));

  res.json({ list, places });
});

async function getListWithOwnerCheck(listId: string, userId: string) {
  const [list] = await db
    .select({ id: placeLists.id, name: placeLists.name, userId: placeLists.userId })
    .from(placeLists)
    .where(and(eq(placeLists.id, listId), eq(placeLists.userId, userId)));
  return list ?? null;
}

async function canWriteList(listId: string, userId: string): Promise<boolean> {
  const [list] = await db
    .select({ id: placeLists.id })
    .from(placeLists)
    .where(and(eq(placeLists.id, listId), eq(placeLists.userId, userId)));
  if (list) return true;

  const [collab] = await db
    .select({ role: listCollaborators.role })
    .from(listCollaborators)
    .where(
      and(
        eq(listCollaborators.listId, listId),
        eq(listCollaborators.userId, userId),
        eq(listCollaborators.role, "editor")
      )
    );
  return !!collab;
}

router.post("/:listId/items", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const listId = req.params.listId as string;
  const { googlePlaceId } = req.body as { googlePlaceId?: unknown };

  if (!googlePlaceId || typeof googlePlaceId !== "string") {
    res.status(400).json({ error: "googlePlaceId is required" });
    return;
  }

  const canWrite = await canWriteList(listId, user.id);
  if (!canWrite) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  try {
    await db
      .insert(placeListItems)
      .values({
        id: crypto.randomUUID(),
        listId: listId,
        googlePlaceId: googlePlaceId,
        addedAt: new Date(),
      })
      .onConflictDoNothing();
  } catch (err) {
    logger.warn({ err }, "Add to list failed");
    res.status(400).json({ error: "Could not add place to list" });
    return;
  }

  res.status(201).json({ ok: true });
});

router.delete(
  "/:listId/items/:googlePlaceId",
  async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const listId = req.params.listId as string;
    const googlePlaceId = req.params.googlePlaceId as string;

    const canWrite = await canWriteList(listId, user.id);
    if (!canWrite) {
      res.status(404).json({ error: "List not found" });
      return;
    }

    await db
      .delete(placeListItems)
      .where(
        and(
          eq(placeListItems.listId, listId),
          eq(placeListItems.googlePlaceId, googlePlaceId)
        )
      );

    res.json({ ok: true });
  }
);

// ── KML Export ──────────────────────────────────────────────────────────────

const KML_ICONS: Record<string, string> = {
  restaurant:         "http://maps.google.com/mapfiles/kml/shapes/dining.png",
  cafe:               "http://maps.google.com/mapfiles/kml/shapes/coffee.png",
  bar:                "http://maps.google.com/mapfiles/kml/shapes/bars.png",
  museum:             "http://maps.google.com/mapfiles/kml/shapes/museums.png",
  park:               "http://maps.google.com/mapfiles/kml/shapes/parks.png",
  national_park:      "http://maps.google.com/mapfiles/kml/shapes/parks.png",
  tourist_attraction: "http://maps.google.com/mapfiles/kml/shapes/camera.png",
  shopping_mall:      "http://maps.google.com/mapfiles/kml/shapes/shopping.png",
  gym:                "http://maps.google.com/mapfiles/kml/shapes/sports.png",
  library:            "http://maps.google.com/mapfiles/kml/shapes/library.png",
  movie_theater:      "http://maps.google.com/mapfiles/kml/shapes/cinema.png",
  bakery:             "http://maps.google.com/mapfiles/kml/shapes/bread.png",
  hotel:              "http://maps.google.com/mapfiles/kml/shapes/lodging.png",
};
const DEFAULT_KML_ICON = "http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-. ]/g, "_").trim() || "list";
}

function priceLevelLabel(level: string | null): string {
  const map: Record<string, string> = {
    PRICE_LEVEL_FREE: "Free",
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  };
  return level ? (map[level] ?? level) : "";
}

interface KmlPlace {
  googlePlaceId: string;
  name: string;
  lat: string | number;
  lng: string | number;
  rating: string | number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  primaryType: string | null;
  types: string[];
  address: string | null;
  editorialSummary: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
}

function generateKml(listName: string, places: KmlPlace[]): string {
  const uniqueTypes = [...new Set(
    places.map((p) => p.primaryType ?? p.types[0] ?? "default").filter(Boolean)
  )];

  const styles = uniqueTypes.map((type) => {
    const iconUrl = KML_ICONS[type] ?? DEFAULT_KML_ICON;
    return `  <Style id="${escapeXml(type)}">
    <IconStyle><scale>1.1</scale><Icon><href>${iconUrl}</href></Icon></IconStyle>
  </Style>`;
  }).join("\n");

  const placemarks = places.map((p) => {
    const styleId = p.primaryType ?? p.types[0] ?? "default";
    const iconUrl = KML_ICONS[styleId] ?? DEFAULT_KML_ICON;
    const lat = parseFloat(String(p.lat));
    const lng = parseFloat(String(p.lng));
    const rating = p.rating !== null ? parseFloat(String(p.rating)) : null;
    const price = priceLevelLabel(p.priceLevel);
    const typeLabel = (p.primaryType ?? p.types[0] ?? "").replace(/_/g, " ");

    const descParts: string[] = [];
    if (typeLabel) descParts.push(`<b>Category:</b> ${typeLabel}`);
    if (rating !== null) {
      descParts.push(
        `<b>Rating:</b> ${rating.toFixed(1)} ★${p.userRatingCount ? ` (${p.userRatingCount.toLocaleString()} reviews)` : ""}`
      );
    }
    if (price) descParts.push(`<b>Price:</b> ${price}`);
    if (p.address) descParts.push(`<b>Address:</b> ${p.address}`);
    if (p.websiteUri) descParts.push(`<b>Website:</b> <a href="${p.websiteUri}">${p.websiteUri}</a>`);
    if (p.editorialSummary) descParts.push(`<i>${p.editorialSummary}</i>`);
    if (p.googleMapsUri) descParts.push(`<a href="${p.googleMapsUri}">View on Google Maps</a>`);

    return `  <Placemark>
    <name>${escapeXml(p.name)}</name>
    <description><![CDATA[${descParts.join("<br/>\n")}]]></description>
    <Style><IconStyle><scale>1.1</scale><Icon><href>${iconUrl}</href></Icon></IconStyle></Style>
    <Point><coordinates>${lng},${lat},0</coordinates></Point>
  </Placemark>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(listName)}</name>
    <description>Exported from Hero's Path</description>
${styles}
${placemarks}
  </Document>
</kml>`;
}

async function getListPlaces(listId: string): Promise<KmlPlace[]> {
  const items = await db
    .select({
      googlePlaceId: placeCache.googlePlaceId,
      name: placeCache.name,
      lat: placeCache.lat,
      lng: placeCache.lng,
      rating: placeCache.rating,
      userRatingCount: placeCache.userRatingCount,
      priceLevel: placeCache.priceLevel,
      primaryType: placeCache.primaryType,
      types: placeCache.types,
      address: placeCache.address,
      editorialSummary: placeCache.editorialSummary,
      websiteUri: placeCache.websiteUri,
      googleMapsUri: placeCache.googleMapsUri,
    })
    .from(placeListItems)
    .innerJoin(placeCache, eq(placeListItems.googlePlaceId, placeCache.googlePlaceId))
    .where(eq(placeListItems.listId, listId))
    .orderBy(placeListItems.addedAt);
  return items;
}

router.get("/:listId/export/kml", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const listId = req.params.listId as string;

  const list = await getListWithOwnerCheck(listId, user.id);
  if (!list) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  const places = await getListPlaces(listId);

  if (places.length === 0) {
    res.status(400).json({ error: "List is empty — add some places before exporting" });
    return;
  }

  const kml = generateKml(list.name, places);
  const filename = sanitizeFilename(list.name) + ".kml";

  res.setHeader("Content-Type", "application/vnd.google-earth.kml+xml");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(kml);
});

router.get("/:listId/export/json", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const listId = req.params.listId as string;

  const list = await getListWithOwnerCheck(listId, user.id);
  if (!list) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  const places = await getListPlaces(listId);
  res.json({ list, places });
});

router.post(
  "/:listId/export/google-my-maps",
  async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const listId = req.params.listId as string;
    const { googleAccessToken } = req.body as {
      googleAccessToken?: unknown;
    };

    if (!googleAccessToken || typeof googleAccessToken !== "string") {
      res.status(400).json({ error: "googleAccessToken is required" });
      return;
    }

    const list = await getListWithOwnerCheck(listId, user.id);
    if (!list) {
      res.status(404).json({ error: "List not found" });
      return;
    }

    const places = await getListPlaces(listId);
    if (places.length === 0) {
      res
        .status(400)
        .json({ error: "List is empty — add some places before exporting" });
      return;
    }

    const kml = generateKml(list.name, places);
    const filename = sanitizeFilename(list.name) + ".kml";

    const boundary = "herospath_kml_bnd_a1b2c3";
    const metadata = JSON.stringify({
      name: filename,
      mimeType: "application/vnd.google-apps.map",
    });

    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      metadata,
      `--${boundary}`,
      "Content-Type: application/vnd.google-earth.kml+xml",
      "",
      kml,
      `--${boundary}--`,
    ].join("\r\n");

    try {
      const driveRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
            "Content-Type": `multipart/related; boundary="${boundary}"`,
          },
          body,
        }
      );

      if (!driveRes.ok) {
        const errText = await driveRes.text();
        logger.error(
          { status: driveRes.status, body: errText },
          "Google Drive upload failed"
        );
        if (driveRes.status === 401 || driveRes.status === 403) {
          res
            .status(401)
            .json({ error: "Google token expired or invalid. Please re-connect Google." });
        } else {
          res
            .status(502)
            .json({ error: "Failed to create Google My Maps document" });
        }
        return;
      }

      const driveData = (await driveRes.json()) as {
        id: string;
        name?: string;
      };
      const viewUrl = `https://www.google.com/maps/d/edit?mid=${driveData.id}`;
      res.json({ fileId: driveData.id, viewUrl });
    } catch (err) {
      logger.error({ err }, "Google Drive upload error");
      res
        .status(500)
        .json({ error: "Internal error while creating My Maps document" });
    }
  }
);

router.post("/:listId/share", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const listId = req.params.listId as string;
  const { friendId, canEdit = false } = req.body as {
    friendId?: unknown;
    canEdit?: unknown;
  };

  if (!friendId || typeof friendId !== "string") {
    res.status(400).json({ error: "friendId is required" });
    return;
  }

  const list = await getListWithOwnerCheck(listId, user.id);
  if (!list) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  const isFriend = await areAcceptedFriends(user.id, friendId);
  if (!isFriend) {
    res.status(403).json({ error: "Not friends with this user" });
    return;
  }

  await db
    .insert(listShares)
    .values({
      id: crypto.randomUUID(),
      listId,
      sharedByUserId: user.id,
      sharedWithUserId: friendId,
      canEdit: Boolean(canEdit),
    })
    .onConflictDoUpdate({
      target: [listShares.listId, listShares.sharedWithUserId],
      set: { canEdit: Boolean(canEdit) },
    });

  if (canEdit) {
    await db
      .insert(listCollaborators)
      .values({
        id: crypto.randomUUID(),
        listId,
        userId: friendId,
        role: "editor",
      })
      .onConflictDoNothing();
  }

  res.json({ ok: true });
});

router.delete(
  "/:listId/share/:friendId",
  async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const listId = req.params.listId as string;
    const friendId = req.params.friendId as string;

    const list = await getListWithOwnerCheck(listId, user.id);
    if (!list) {
      res.status(404).json({ error: "List not found" });
      return;
    }

    await db
      .delete(listShares)
      .where(
        and(
          eq(listShares.listId, listId),
          eq(listShares.sharedWithUserId, friendId)
        )
      );

    await db
      .delete(listCollaborators)
      .where(
        and(
          eq(listCollaborators.listId, listId),
          eq(listCollaborators.userId, friendId)
        )
      );

    res.json({ ok: true });
  }
);

router.get(
  "/:listId/collaborators",
  async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const listId = req.params.listId as string;

    const list = await getListWithOwnerCheck(listId, user.id);
    if (!list) {
      res.status(404).json({ error: "List not found" });
      return;
    }

    const rows = await db
      .select({
        userId: listCollaborators.userId,
        role: listCollaborators.role,
        addedAt: listCollaborators.addedAt,
      })
      .from(listCollaborators)
      .where(eq(listCollaborators.listId, listId));

    if (rows.length === 0) {
      res.json({ collaborators: [] });
      return;
    }

    const ids = rows.map((r) => r.userId);
    const userRows = await db
      .select({ id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl })
      .from(users)
      .where(
        sql`${users.id} = ANY(ARRAY[${sql.join(ids.map((id) => sql`${id}::text`), sql`, `)}])`
      );
    const userMap = Object.fromEntries(userRows.map((u) => [u.id, u]));

    const collaborators = rows.map((r) => ({
      ...userMap[r.userId],
      role: r.role,
      addedAt: r.addedAt,
    }));

    res.json({ collaborators });
  }
);

router.post(
  "/:listId/collaborators",
  async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const listId = req.params.listId as string;
    const { userId: targetUserId, role = "editor" } = req.body as {
      userId?: unknown;
      role?: unknown;
    };

    if (!targetUserId || typeof targetUserId !== "string") {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const list = await getListWithOwnerCheck(listId, user.id);
    if (!list) {
      res.status(404).json({ error: "List not found" });
      return;
    }

    await db
      .insert(listCollaborators)
      .values({
        id: crypto.randomUUID(),
        listId,
        userId: targetUserId,
        role: typeof role === "string" ? role : "editor",
      })
      .onConflictDoUpdate({
        target: [listCollaborators.listId, listCollaborators.userId],
        set: { role: typeof role === "string" ? role : "editor" },
      });

    res.json({ ok: true });
  }
);

router.delete(
  "/:listId/collaborators/:userId",
  async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const listId = req.params.listId as string;
    const targetUserId = req.params.userId as string;

    const list = await getListWithOwnerCheck(listId, user.id);
    if (!list) {
      res.status(404).json({ error: "List not found" });
      return;
    }

    await db
      .delete(listCollaborators)
      .where(
        and(
          eq(listCollaborators.listId, listId),
          eq(listCollaborators.userId, targetUserId)
        )
      );

    res.json({ ok: true });
  }
);

router.get("/:listId/shares", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const listId = req.params.listId as string;

  const list = await getListWithOwnerCheck(listId, user.id);
  if (!list) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  const shares = await db
    .select({
      sharedWithUserId: listShares.sharedWithUserId,
      canEdit: listShares.canEdit,
      createdAt: listShares.createdAt,
    })
    .from(listShares)
    .where(eq(listShares.listId, listId));

  if (shares.length === 0) {
    res.json({ shares: [] });
    return;
  }

  const ids = shares.map((s) => s.sharedWithUserId);
  const userRows = await db
    .select({ id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl })
    .from(users)
    .where(
      sql`${users.id} = ANY(ARRAY[${sql.join(ids.map((id) => sql`${id}::text`), sql`, `)}])`
    );
  const userMap = Object.fromEntries(userRows.map((u) => [u.id, u]));

  const result = shares.map((s) => ({
    ...userMap[s.sharedWithUserId],
    canEdit: s.canEdit,
    sharedAt: s.createdAt,
  }));

  res.json({ shares: result });
});

export default router;
