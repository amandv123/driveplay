// Run: node --test tests/playerMath.test.ts   (Node 22.18+/23.6+)
//  or: npx tsx --test tests/playerMath.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_FLAGS, PLAYBACK_SPEEDS, clampVolume, computeSeekTarget, formatTime, nearestSpeed,
  pointerRatio, ratioToTime, reduceMediaEvent, stepSpeed, stepVolume, timeToRatio,
} from '../src/lib/player/playerMath.ts';

test('supported speeds are exactly the ten required values', () => {
  assert.deepEqual([...PLAYBACK_SPEEDS], [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]);
});

test('speed stepping and snapping', () => {
  assert.equal(stepSpeed(1, 1), 1.25);
  assert.equal(stepSpeed(1, -1), 0.75);
  assert.equal(stepSpeed(3, 1), 3);
  assert.equal(stepSpeed(0.25, -1), 0.25);
  assert.equal(stepSpeed(2, 1), 2.5);
  assert.equal(nearestSpeed(1.4), 1.5);
  assert.equal(nearestSpeed(10), 3);
  assert.equal(nearestSpeed(NaN), 1);
});

test('seek calculations clamp to 0..duration', () => {
  assert.equal(computeSeekTarget(50, 10, 100), 60);
  assert.equal(computeSeekTarget(5, -10, 100), 0);
  assert.equal(computeSeekTarget(95, 10, 100), 100);
  assert.equal(computeSeekTarget(5, -10, 0), 0);
  assert.equal(computeSeekTarget(5, 10, NaN), 15);
  assert.equal(ratioToTime(0.5, 200), 100);
  assert.equal(ratioToTime(2, 200), 200);
  assert.equal(ratioToTime(-1, 200), 0);
  assert.equal(ratioToTime(0.5, NaN), 0);
  assert.equal(timeToRatio(50, 200), 0.25);
  assert.equal(timeToRatio(10, 0), 0);
  assert.equal(pointerRatio(150, 100, 200), 0.25);
  assert.equal(pointerRatio(50, 100, 200), 0);
  assert.equal(pointerRatio(500, 100, 200), 1);
  assert.equal(pointerRatio(150, 100, 0), 0);
});

test('skip forward/backward use the same clamped calculation', () => {
  assert.equal(computeSeekTarget(0, -10, 600), 0);
  assert.equal(computeSeekTarget(595, 10, 600), 600);
  assert.equal(computeSeekTarget(100, 10, 600), 110);
  assert.equal(computeSeekTarget(100, -10, 600), 90);
});

test('volume boundaries', () => {
  assert.equal(clampVolume(-1), 0);
  assert.equal(clampVolume(2), 1);
  assert.equal(clampVolume(0.4), 0.4);
  assert.equal(stepVolume(0.95, 0.05), 1);
  assert.equal(stepVolume(1, 0.05), 1);
  assert.equal(stepVolume(0.05, -0.05), 0);
  assert.equal(stepVolume(0, -0.05), 0);
  assert.equal(stepVolume(0.1 + 0.2, 0.05), 0.35);
});

test('playback state transitions', () => {
  let s = reduceMediaEvent(INITIAL_FLAGS, 'loadstart');
  assert.equal(s.loading, true);
  s = reduceMediaEvent(s, 'waiting');
  assert.equal(s.buffering, false); // still the initial load
  s = reduceMediaEvent(s, 'loadedmetadata');
  assert.equal(s.loading, false);
  s = reduceMediaEvent(s, 'playing');
  assert.equal(s.playing, true);
  s = reduceMediaEvent(s, 'waiting');
  assert.equal(s.buffering, true);
  assert.equal(s.playing, true);
  s = reduceMediaEvent(s, 'playing');
  assert.equal(s.buffering, false);
  s = reduceMediaEvent(s, 'pause');
  assert.equal(s.playing, false);
  s = reduceMediaEvent(s, 'ended');
  assert.equal(s.ended, true);
  s = reduceMediaEvent(s, 'playing');
  assert.equal(s.ended, false);
  s = reduceMediaEvent(s, 'error', { kind: 'network', message: 'x' });
  assert.equal(s.error?.kind, 'network');
  assert.equal(s.playing, false);
  s = reduceMediaEvent(s, 'loadstart');
  assert.equal(s.error, null);
  assert.equal(reduceMediaEvent(INITIAL_FLAGS, 'error').error?.message, 'Unable to play this video.');
});

test('formatTime', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65.9), '1:05');
  assert.equal(formatTime(3600), '1:00:00');
  assert.equal(formatTime(3725), '1:02:05');
  assert.equal(formatTime(NaN), '0:00');
  assert.equal(formatTime(-5), '0:00');
});
