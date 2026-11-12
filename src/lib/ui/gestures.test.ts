import assert from "node:assert/strict";
import test from "node:test";
import {
  clamp,
  lockGestureAxis,
  nextRovingIndex,
  normalizeSearch,
  revealOffset,
  shouldOpenReveal,
  swipeDirection,
} from "./gestures.ts";

test("axis lock waits for intent and rejects vertical/diagonal pans", () => {
  assert.equal(lockGestureAxis(4, 2), "pending");
  assert.equal(lockGestureAxis(30, 5), "horizontal");
  assert.equal(lockGestureAxis(5, 30), "vertical");
  assert.equal(lockGestureAxis(25, 24), "pending");
  assert.equal(swipeDirection(8, 100, 200), 0);
  assert.equal(swipeDirection(100, 100, 200), 0);
});

test("section swipe needs distance or a short, fast flick", () => {
  assert.equal(swipeDirection(-60, 4, 600), 1);
  assert.equal(swipeDirection(60, 4, 600), -1);
  assert.equal(swipeDirection(-36, 2, 80), 1);
  assert.equal(swipeDirection(-28, 2, 600), 0);
  assert.equal(swipeDirection(-15, 0, 40), 0);
  assert.equal(swipeDirection(-60, 0, 0), 1);
});

test("reveal stays bounded and supports slow thresholds and fast flicks", () => {
  assert.equal(clamp(20, -120, 0), 0);
  assert.equal(revealOffset(-200, 120, false), -120);
  assert.equal(revealOffset(200, 120, true), 0);
  assert.equal(revealOffset(30, 120, true), -90);
  assert.equal(shouldOpenReveal(-50, 500, 120, false), true);
  assert.equal(shouldOpenReveal(-20, 500, 120, false), false);
  assert.equal(shouldOpenReveal(-30, 60, 120, false), true);
  assert.equal(shouldOpenReveal(50, 500, 120, true), false);
  assert.equal(shouldOpenReveal(30, 60, 120, true), false);
  assert.equal(shouldOpenReveal(20, 500, 120, true), true);
});

test("roving focus wraps and honors Home/End in both orientations", () => {
  assert.equal(nextRovingIndex("ArrowLeft", 0, 4), 3);
  assert.equal(nextRovingIndex("ArrowRight", 3, 4), 0);
  assert.equal(nextRovingIndex("Home", 2, 4), 0);
  assert.equal(nextRovingIndex("End", 0, 4), 3);
  assert.equal(nextRovingIndex("ArrowUp", 0, 4, true), 3);
  assert.equal(nextRovingIndex("ArrowDown", 3, 4, true), 0);
  assert.equal(nextRovingIndex("ArrowRight", 0, 4, true), null);
  assert.equal(nextRovingIndex("Enter", 0, 4), null);
  assert.equal(nextRovingIndex("ArrowDown", 0, 0, true), null);
});

test("Spanish search ignores case, accents and surrounding whitespace", () => {
  assert.equal(normalizeSearch("  ÉPICO, Íntimo y ANIME  "), "epico, intimo y anime");
  assert.equal(normalizeSearch("Aurelia Solís"), "aurelia solis");
  assert.ok(normalizeSearch("Nox — Salón del trono").includes("salon"));
});
