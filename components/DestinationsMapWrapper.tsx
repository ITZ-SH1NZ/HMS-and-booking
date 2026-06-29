"use client";

import dynamic from "next/dynamic";

// Safely load the Leaflet map component with SSR disabled
const DestinationsMapSection = dynamic(
  () => import("./DestinationsMapSection").then((mod) => mod.DestinationsMapSection),
  { ssr: false }
);

interface Destination {
  name: string;
  stays: string;
  count: number;
  latitude: number | null;
  longitude: number | null;
}

interface DestinationsMapWrapperProps {
  destinations: Destination[];
}

export default function DestinationsMapWrapper({ destinations }: DestinationsMapWrapperProps) {
  return <DestinationsMapSection destinations={destinations} />;
}
