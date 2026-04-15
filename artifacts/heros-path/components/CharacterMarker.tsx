import { Image } from "expo-image";

type Direction = "idle" | "up" | "down" | "left" | "right";

const SPRITES: Record<Direction, number> = {
  idle: require("../assets/sprites/link_idle.gif"),
  up: require("../assets/sprites/link_walk_up.gif"),
  down: require("../assets/sprites/link_walk_down.gif"),
  left: require("../assets/sprites/link_walk_left.gif"),
  right: require("../assets/sprites/link_walk_right.gif"),
};

function headingToDirection(heading: number | null): Direction {
  if (heading === null || heading < 0) return "idle";
  if (heading >= 315 || heading < 45) return "up";
  if (heading >= 45 && heading < 135) return "right";
  if (heading >= 135 && heading < 225) return "down";
  return "left";
}

interface CharacterMarkerProps {
  journeyActive: boolean;
  heading: number | null;
}

export function CharacterMarker({ journeyActive, heading }: CharacterMarkerProps) {
  const direction = journeyActive ? headingToDirection(heading) : "idle";
  return (
    <Image
      source={SPRITES[direction]}
      style={{ width: 32, height: 48 }}
      contentFit="contain"
      cachePolicy="memory"
    />
  );
}
