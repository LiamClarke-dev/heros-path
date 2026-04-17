import { Image } from "expo-image";

export type Direction = "idle" | "up" | "down" | "left" | "right";

const SPRITES: Record<Direction, number> = {
  idle: require("../assets/sprites/link_idle.png"),
  up: require("../assets/sprites/link_walk_up.png"),
  down: require("../assets/sprites/link_walk_down.png"),
  left: require("../assets/sprites/link_walk_left.png"),
  right: require("../assets/sprites/link_walk_right.png"),
};

export function headingToDirection(heading: number | null): Direction {
  if (heading === null || heading < 0) return "idle";
  if (heading >= 315 || heading < 45) return "up";
  if (heading >= 45 && heading < 135) return "right";
  if (heading >= 135 && heading < 225) return "down";
  return "left";
}

interface CharacterMarkerProps {
  direction: Direction;
}

export function CharacterMarker({ direction }: CharacterMarkerProps) {
  return (
    <Image
      source={SPRITES[direction]}
      style={{ width: 32, height: 48 }}
      contentFit="contain"
      cachePolicy="memory"
    />
  );
}
