// The app's animation theme (the Tailwind-shaped `theme` the framework's animation baker reads): the timelines the native
// library's class literals reference by name. spin-arc turns the arc start from 0 to 360 degrees in 1.5 s, linear, forever.
// Registered once by pocket-build.ts, before any class literal compiles: the build, the tests and the judge all go through it.
import type { AnimationTheme } from "@pocket-internal/framework/compiler/animation.ts";

export const ANIMATION_THEME: AnimationTheme = {
  keyframes: { "spin-arc": { from: { arcStart: "0deg" }, to: { arcStart: "360deg" } } },
  animation: { "spin-arc": "spin-arc 1.5s linear infinite" },
};
