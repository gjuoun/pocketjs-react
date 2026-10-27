import { expect, test } from "bun:test";
import { percentOf } from "../../src/native/percent.ts";

test("percentOf resolves a percent of the parent to whole pixels", () => {
  expect(percentOf(75, 480)).toBe(360);
  expect(percentOf(50, 272)).toBe(136);
  expect(percentOf(100, 480)).toBe(480);
  expect(percentOf(33, 100)).toBe(33);
  expect(percentOf(1, 50)).toBe(1); // 0.5 rounds up
});

test("percentOf clamps the percent to 0..100", () => {
  expect(percentOf(150, 480)).toBe(480);
  expect(percentOf(-5, 480)).toBe(0);
});
