"use client";

import dynamic from "next/dynamic";

// react-konva uses window/document so must be loaded client-side only
const FloorPlanEditor = dynamic(
  () => import("@/components/FloorPlanEditor"),
  { ssr: false }
);

export default function Home() {
  return <FloorPlanEditor />;
}
