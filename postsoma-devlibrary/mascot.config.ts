/** Shared PostSoma core rhythm with DevLibrary-only study equipment. */
export const mascotConfig = {
  version: "3.0.0-dev-library",
  storageKey: "postsoma-devlibrary-mascot-v3",
  core: {
    plate: "/mascot/optimized/plate_dark.webp",
    width: 1122,
    height: 1228,
    sprout: {
      src: "/mascot/optimized/sprout_dark.webp",
      left: "43.94%",
      top: "0%",
      displayWidth: "12.03%",
      displayHeight: "11.16%",
      pivot: "48.74% 85.4%",
    },
    eyes: [
      { x: 728.9, y: 563.8, moonRadius: 48.6, haloRadius: 66 },
      { x: 382.7, y: 563.9, moonRadius: 48.6, haloRadius: 66 },
    ],
  },
  slots: {
    codingSlate: {
      src: "/mascot/optimized/terminal_dark-ink.webp",
      left: "55%", top: "66%", width: "34%", pivot: "42% 80%",
    },
    codeMark: {
      src: "/mascot/skins/dev-library/brackets_clean.png",
      left: "61%", top: "19%", width: "22%",
    },
  },
  behaviorWheel: [
    { id: "sprout_sway", weight: 40, durationMs: 3_500 },
    { id: "peek_curious", weight: 30, durationMs: 1_800 },
    { id: "wander_slide", weight: 20, durationMs: 4_500 },
    { id: "subtle_tilt", weight: 10, durationMs: 1_200 },
  ],
  scheduler: {
    tickMs: 100, heartbeatMs: 1_000, durationDrift: 0.2,
    firstActionMs: 4_500, idleGapMinMs: 1_400, idleGapMaxMs: 2_800,
    tapWindowMs: 320, activeIdleMs: 10_000, sleepAfterMs: 90_000,
    hoverMs: 560, clickMs: 760, flinchMs: 480,
    blushMs: 980, shyHideMs: 650, shyHiddenMs: 2_400, shyQuietMs: 2_000,
    alertMs: 900, scrollThresholdPx: 360,
    rapidPointerSpeedPxPerSecond: 900, nearbyRadiusPx: 150,
    minimumAlertGapMs: 1_800, anticCooldownMs: 20_000,
  },
  motion: {
    stage: { mobile: { width: 118, height: 129 }, desktop: { width: 132, height: 145 }, compactMobile: { width: 118, height: 129 } },
    bottomPx: { mobile: 82, desktop: 8, compactMobile: 64 },
    restOffsetPercent: { mobile: 54, desktop: 60, compactMobile: 54 },
    peekOffsetPercent: { mobile: 56, desktop: 46, compactMobile: 30 },
    hiddenOffsetPercent: { mobile: 145, desktop: 125, compactMobile: 135 },
    minHorizontalPercent: 16, maxHorizontalPercent: 84,
    startHorizontalPercent: 78, wanderMinPercent: 16, wanderMaxPercent: 84,
    wanderMinStepPercent: 18, wanderMaxStepPercent: 32,
  },
  drives: {
    defaults: { energy: 80, curiosity: 60, affection: 40 },
    energyDecayPerMinute: 1.5, curiosityDecayPerMinute: 2,
    affectionDecayPerMinute: 1, sleepRecoveryPerMinute: 10,
    hoverAffection: 8, clickAffection: 15, nearbyCuriosity: 10,
  },
  priorities: { autonomous: 0, environment: 1, direct: 2 },
} as const;

export type MascotBehaviorId = (typeof mascotConfig.behaviorWheel)[number]["id"];
export default mascotConfig;
