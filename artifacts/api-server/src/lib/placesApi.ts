import logger from "../logger.js";

export const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.primaryType",
  "places.types",
  "places.editorialSummary",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.nationalPhoneNumber",
  "places.formattedAddress",
  "places.photos",
  "places.currentOpeningHours",
].join(",");

export const PLACES_DETAIL_FIELD_MASK = PLACES_FIELD_MASK.replace("places.", "");

interface RawPlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryType?: string;
  types?: string[];
  editorialSummary?: { text: string; languageCode?: string };
  websiteUri?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  formattedAddress?: string;
  photos?: Array<{ name: string }>;
  currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
}

export interface PlaceResult {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  primaryType: string | null;
  types: string[];
  editorialSummary: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  phoneNumber: string | null;
  photoReference: string | null;
  photoUrl: string | null;
  address: string | null;
  openNow: boolean | null;
  openingHoursText: string[] | null;
}

function buildPhotoUrl(
  photoName: string | null | undefined,
  apiKey: string
): string | null {
  if (!photoName) return null;
  if (photoName.includes("/")) {
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${apiKey}`;
  }
  return null;
}

export function mapPlaceResult(raw: RawPlace, apiKey: string): PlaceResult {
  const photoRef = raw.photos?.[0]?.name ?? null;
  return {
    googlePlaceId: raw.id,
    name: raw.displayName?.text ?? "Unknown Place",
    lat: raw.location?.latitude ?? 0,
    lng: raw.location?.longitude ?? 0,
    rating: raw.rating ?? null,
    userRatingCount: raw.userRatingCount ?? null,
    priceLevel: raw.priceLevel ?? null,
    primaryType: raw.primaryType ?? null,
    types: raw.types ?? [],
    editorialSummary: raw.editorialSummary?.text ?? null,
    websiteUri: raw.websiteUri ?? null,
    googleMapsUri: raw.googleMapsUri ?? null,
    phoneNumber: raw.nationalPhoneNumber ?? null,
    photoReference: photoRef,
    photoUrl: buildPhotoUrl(photoRef, apiKey),
    address: raw.formattedAddress ?? null,
    openNow: raw.currentOpeningHours?.openNow ?? null,
    openingHoursText: raw.currentOpeningHours?.weekdayDescriptions ?? null,
  };
}

export async function searchAlongRoute(
  encodedPolyline: string,
  textQuery: string
): Promise<{ places: PlaceResult[]; apiError: boolean }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    logger.warn("[discovery] GOOGLE_MAPS_API_KEY not set — skipping route search");
    return { places: [], apiError: true };
  }
  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": PLACES_FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery,
          searchAlongRouteParameters: {
            polyline: { encodedPolyline },
          },
          maxResultCount: 20,
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 403) {
        logger.warn(
          { status: res.status },
          `[discovery] Route search failed: HTTP 403 ${body}`
        );
        logger.warn(
          "[discovery] ⚠️ Enable 'Places API (New)' at https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
        );
      } else {
        logger.warn(
          { status: res.status, body },
          `[discovery] Route search failed: HTTP ${res.status}`
        );
      }
      return { places: [], apiError: true };
    }
    const data = (await res.json()) as { places?: RawPlace[] };
    const places = (data.places ?? []).map((p) => mapPlaceResult(p, apiKey));
    logger.info(
      `[discovery] Route search "${textQuery}": ${places.length} raw result(s)`
    );
    return { places, apiError: false };
  } catch (err) {
    logger.warn({ err }, `[discovery] Route search "${textQuery}" threw`);
    return { places: [], apiError: true };
  }
}

export async function searchNearby(
  lat: number,
  lng: number,
  radiusM: number,
  includedTypes?: string[]
): Promise<{ places: PlaceResult[]; apiError: boolean }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { places: [], apiError: true };
  try {
    const body: Record<string, unknown> = {
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusM,
        },
      },
      maxResultCount: 20,
    };
    if (includedTypes?.length) {
      body.includedTypes = includedTypes;
    }
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": PLACES_FIELD_MASK,
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      if (res.status === 403) {
        logger.warn(
          "[discovery] ⚠️ Enable 'Places API (New)' at https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
        );
      }
      logger.warn(
        { status: res.status, body: errBody },
        "[discovery] Nearby search failed"
      );
      return { places: [], apiError: true };
    }
    const data = (await res.json()) as { places?: RawPlace[] };
    const places = (data.places ?? []).map((p) => mapPlaceResult(p, apiKey));
    return { places, apiError: false };
  } catch (err) {
    logger.warn({ err }, "[discovery] Nearby search threw");
    return { places: [], apiError: true };
  }
}

export async function fetchPlaceDetail(
  googlePlaceId: string
): Promise<PlaceResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${googlePlaceId}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": PLACES_DETAIL_FIELD_MASK,
        },
      }
    );
    if (!res.ok) {
      logger.warn(
        { status: res.status, googlePlaceId },
        "[places] Detail fetch failed"
      );
      return null;
    }
    const raw = (await res.json()) as RawPlace;
    return mapPlaceResult(raw, apiKey);
  } catch (err) {
    logger.warn({ err, googlePlaceId }, "[places] Detail fetch threw");
    return null;
  }
}
