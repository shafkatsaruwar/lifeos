import { useWindowDimensions } from "react-native";

/** Comfortable reading width on iPad / large phones in landscape. */
export const CONTENT_MAX_WIDTH = 820;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const shortest = Math.min(width, height);
  const isTablet = shortest >= 768;
  const isWide = width >= 768;
  return {
    width,
    height,
    isTablet,
    isWide,
    contentMaxWidth: isWide ? CONTENT_MAX_WIDTH : undefined,
  };
}
