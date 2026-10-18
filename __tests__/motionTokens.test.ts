import {
  duration,
  durationMs,
  ease,
  readReduceMotionPreference,
  spring,
  transitionFor,
  tween,
} from "../lib/motion";

describe("motion tokens", () => {
  it("keeps a coherent duration scale", () => {
    expect(duration.xs).toBeLessThan(duration.sm);
    expect(duration.sm).toBeLessThan(duration.md);
    expect(duration.md).toBeLessThan(duration.lg);
    expect(durationMs.md).toBe(220);
  });

  it("reuses product-aligned easings", () => {
    expect(ease.out).toEqual([0.22, 1, 0.36, 1]);
    expect(ease.outSoft).toEqual([0.16, 1, 0.3, 1]);
  });

  it("returns instant transitions when reduceMotion", () => {
    expect(tween("page", true)).toEqual({ duration: 0 });
    expect(transitionFor("card", true)).toEqual({ duration: 0 });
    expect(transitionFor("list", true)).toEqual({ duration: 0 });
  });

  it("uses springs for tactile roles and tweens for page/nav", () => {
    expect(transitionFor("card", false)).toMatchObject(spring.snappy);
    expect(transitionFor("list", false)).toMatchObject(spring.layout);
    expect(transitionFor("page", false)).toMatchObject({
      duration: duration.md,
      ease: ease.out,
    });
    expect(transitionFor("nav", false)).toMatchObject({
      duration: duration.sm,
      ease: ease.outSoft,
    });
  });
});

describe("readReduceMotionPreference", () => {
  it("honors settings flag without DOM", () => {
    expect(readReduceMotionPreference(true)).toBe(true);
  });
});
