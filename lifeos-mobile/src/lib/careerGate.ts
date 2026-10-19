/**
 * Soft-load Career UI so a bad Career module cannot crash app launch.
 * RootNavigator only registers CareerTab when this resolves.
 *
 * HARD FLAG: set true only after Career launch is proven safe on TestFlight.
 * While false, Career never loads — app must still open.
 */
import type { ComponentType } from "react";
import { CAREER_IOS_ENABLED } from "./careerFlag";

export { CAREER_IOS_ENABLED };

export type CareerScreenComponent = ComponentType<Record<string, never>>;

let cached: CareerScreenComponent | null | undefined;

export function getCareerDashboardScreen(): CareerScreenComponent | null {
  if (!CAREER_IOS_ENABLED) {
    cached = null;
    return null;
  }
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../screens/CareerDashboardScreen") as {
      CareerDashboardScreen?: CareerScreenComponent;
    };
    cached = typeof mod.CareerDashboardScreen === "function" ? mod.CareerDashboardScreen : null;
  } catch (error) {
    console.warn("[LifeOS] Career hub unavailable; tab hidden", error);
    cached = null;
  }
  return cached;
}

export function isCareerHubAvailable(): boolean {
  return CAREER_IOS_ENABLED && getCareerDashboardScreen() != null;
}
