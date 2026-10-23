import type { Metadata } from "next";
import MotionLabClient from "./MotionLabClient";

export const metadata: Metadata = {
  title: "Motion Lab · LifeOS 3.0",
  description: "Contained interaction choreography prototype — not app-wide.",
};

/**
 * Contained Motion Lab route.
 * Open: http://localhost:3000/motion-lab
 * (Also reachable after Dev Test Login; no auth required for the lab itself.)
 */
export default function MotionLabPage() {
  return <MotionLabClient />;
}
