import React from "react";
import { View, Text, StyleSheet } from "react-native";

function MapView({ style, children }) {
  return React.createElement(
    View,
    {
      style: [
        {
          backgroundColor: "#1A1510",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        },
        style,
      ],
    },
    React.createElement(
      Text,
      { style: { color: "#A08060", fontSize: 14 } },
      "Map view (mobile only)",
    ),
  );
}

MapView.displayName = "MapView";

export const Polyline = () => null;
export const Marker = () => null;
export const Circle = () => null;
export const Polygon = () => null;
export const Callout = () => null;
export const PROVIDER_GOOGLE = "google";
export const PROVIDER_DEFAULT = null;

export default MapView;
