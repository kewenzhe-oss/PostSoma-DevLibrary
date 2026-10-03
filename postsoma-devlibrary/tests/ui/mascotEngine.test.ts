import { describe, expect, it } from "vitest";
import { MascotEngine, type MascotSignal } from "../../components/mascot/engine";

describe("DevLibrary mascot shared interaction vocabulary", () => {
  it("moves from hover to study click, startle, and triple-tap hide without stale actions", () => {
    let now = 1_000;
    const values = new Map<string, string>();
    const engine = new MascotEngine({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
    }, now, () => 0.5);
    const tick = (ms: number, signals: MascotSignal[] = []) => {
      now += ms;
      engine.tick(now, signals, false);
      return engine.snapshot();
    };
    const tap = (ms: number) => {
      now += ms;
      engine.tick(now, [{ type: "tap", at: now, anchorX: 70 }], false);
      return engine.snapshot();
    };

    expect(tick(100).mode).toBe("rest");
    expect(tick(100, [{ type: "hover", anchorX: 70 }]).behavior).toBe("hover_wiggle");
    tick(600);
    tap(100);
    expect(tick(400).mode).toBe("companion");
    expect(engine.snapshot().behavior).toBe("click_react");
    tap(900); tap(100);
    expect(tick(400).mode).toBe("shock");
    tick(600);
    tap(100); tap(100);
    expect(tap(100).mode).toBe("shy");
    expect(tick(1_000).mode).toBe("shy_hide");
    expect(tick(700).mode).toBe("shy_wait");
    expect(tick(2_500).mode).toBe("rest");
    expect(tick(100, [{ type: "busy", value: true }]).mode).toBe("guarded");
    expect(tick(100, [{ type: "busy", value: false }]).mode).toBe("rest");
  });
});
