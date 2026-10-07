# DrivePlay Architecture

## High-level flow

Google Drive link
-> Source validation/resolution boundary
-> Playable media source
-> Native browser media element
-> DrivePlay playback engine
-> Custom player UI

## Design principles

1. Keep playback independent from UI rendering.
2. Prefer native browser media capabilities for efficient playback.
3. Avoid unnecessary React re-renders during high-frequency media events.
4. Keep media-source handling isolated so additional providers can be added later.
5. Treat subtitles, audio tracks, gestures, and controls as independent player capabilities.
6. Optimize for mobile and desktop from the beginning.
7. Do not proxy or process media unnecessarily; only introduce server-side processing when technically required and permitted.

## Source abstraction

The player should consume a normalized media-source contract rather than depending directly on Google Drive-specific URL logic.

This allows future source adapters without rewriting the player engine.
