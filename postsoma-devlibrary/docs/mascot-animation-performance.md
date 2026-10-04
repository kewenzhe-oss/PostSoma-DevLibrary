# DevLibrary mascot animation performance · 2026-10-04

- Horizontal travel now uses translate3d with a constant 50% left anchor instead of animating left. Vertical states and responsive navigation clearance remain unchanged.
- Two cropped HTML eye layers with static SVG geometry retain the 5.2s blink and 120ms phase; small body/sprout/eye compositing hints only.
- Background stops the 100ms scheduler; offscreen/guarded/shy_wait CSS animations pause. Foreground recovery stays scheduled to avoid hiding deadlock. Pointer proximity sampled once per 100ms.
- Shy/shy_hide own their entire recovery; generic interrupt completion cannot cancel the hiding transition. Existing interaction regression includes an intermediate hiding tick.
- Original PNGs preserved. Transparent WebP derivatives: plate 396px, sprout 64px, coding slate 240px, glyph 80px. Native derivative loading replaces oversized Next image candidates; decorative priority preload removed.
- Existing coding slate/glyph appearance, shadow/glow, anchors, unified stage dimensions and interactions retained. Pre-existing uncommitted CSS/config adjustments preserved.

Actual GPU utilization remains unmeasured.

## Verification

- TypeScript `tsc --noEmit`: passed.
- `tests/ui/mascotEngine.test.ts`: passed, including intermediate shy-hide tick.
- `git diff --check`: passed.
- Production build could not be verified: locked native SWC dependency download was incomplete, so Next could not load the binary. Slow dependency installation was stopped; no browser verification or successful build claimed.

## Follow-up · 2026-10-04

Drive-only snapshots retain React identity. Pointer layout queries stop while offscreen/guarded/fully hiding and are only taken for high-speed samples; background scroll processing returns immediately. Paused layers release will-change reservations. Foreground hide recovery continues. Terminal accessory positioning retained. Browser computed dimensions verified desktop1440×900:132×145, mobile390×844:118×129; compact mobile CSS also retains118×129. Typecheck and mascot engine regression pass. GPU utilization unmeasured.
