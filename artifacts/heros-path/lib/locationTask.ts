import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const LOCATION_TASK = "background-location-task";
export const WAYPOINT_BUFFER_KEY = "bg_waypoint_buffer";

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
  if (error) {
    console.warn("[LocationTask] error:", error.message);
    return;
  }
  const { locations } = data as { locations: Location.LocationObject[] };
  const waypoints = locations.map((loc) => ({
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    recordedAt: new Date(loc.timestamp).toISOString(),
  }));
  try {
    const existing = await AsyncStorage.getItem(WAYPOINT_BUFFER_KEY);
    const buffer: { lat: number; lng: number; recordedAt: string }[] = existing
      ? JSON.parse(existing)
      : [];
    buffer.push(...waypoints);
    await AsyncStorage.setItem(WAYPOINT_BUFFER_KEY, JSON.stringify(buffer));
  } catch (err) {
    console.warn("[LocationTask] AsyncStorage write failed:", err);
  }
});
