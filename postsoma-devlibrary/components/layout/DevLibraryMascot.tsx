"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import mascotConfig from "@/mascot.config";
import { MascotEngine, type MascotSignal, type MascotSnapshot } from "@/components/mascot/engine";

const initialSnapshot: MascotSnapshot = {
  mode: "rest", behavior: null,
  xPercent: mascotConfig.motion.startHorizontalPercent,
  transitionMs: 700, actionMs: 0,
  drives: { ...mascotConfig.drives.defaults },
};

function isEditing(target: Element | null) {
  return Boolean(target?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"));
}

export default function DevLibraryMascot() {
  const [snapshot, setSnapshot] = useState<MascotSnapshot>(initialSnapshot);
  const pendingRef = useRef<MascotSignal[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* Storage is optional. */ }
    const engine = new MascotEngine(storage, Date.now());
    setSnapshot(engine.snapshot());
    engine.consumeChanged();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastScrollY = window.scrollY;
    let lastPointer = { x: 0, y: 0, at: 0 };
    let lastActivityAt = 0;

    const onVisibility = () => pendingRef.current.push({ type: "document_hidden", value: document.hidden });
    const onFullscreen = () => pendingRef.current.push({ type: "fullscreen", value: Boolean(document.fullscreenElement) });
    const onFocusIn = (event: FocusEvent) => pendingRef.current.push({ type: "busy", value: isEditing(event.target as Element) });
    const onFocusOut = (event: FocusEvent) => {
      if (isEditing(event.target as Element) && !isEditing(event.relatedTarget as Element))
        pendingRef.current.push({ type: "busy", value: false });
    };
    const onScroll = () => {
      const next = window.scrollY;
      if (Math.abs(next - lastScrollY) >= mascotConfig.scheduler.scrollThresholdPx) {
        pendingRef.current.push({ type: "scroll" });
        lastScrollY = next;
      }
    };
    const onPointerMove = (event: globalThis.PointerEvent) => {
      const current = { x: event.clientX, y: event.clientY, at: Date.now() };
      if (current.at - lastActivityAt >= 1_000) {
        pendingRef.current.push({ type: "pointer_activity", near: false });
        lastActivityAt = current.at;
      }
      const elapsed = current.at - lastPointer.at;
      if (lastPointer.at && elapsed > 0) {
        const speed = Math.hypot(current.x - lastPointer.x, current.y - lastPointer.y) / elapsed * 1000;
        const box = buttonRef.current?.getBoundingClientRect();
        const distance = box ? Math.hypot(current.x - (box.left + box.width / 2),
          current.y - (box.top + box.height / 2)) : Infinity;
        if (speed >= mascotConfig.scheduler.rapidPointerSpeedPxPerSecond &&
          distance < mascotConfig.scheduler.nearbyRadiusPx) pendingRef.current.push({ type: "nearby" });
      }
      lastPointer = current;
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    onVisibility(); onFullscreen();
    pendingRef.current.push({ type: "busy", value: isEditing(document.activeElement) });

    const interval = window.setInterval(() => {
      engine.tick(Date.now(), pendingRef.current.splice(0), motionQuery.matches);
      if (engine.consumeChanged()) setSnapshot(engine.snapshot());
    }, mascotConfig.scheduler.tickMs);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      pendingRef.current = [];
    };
  }, []);

  const anchorX = () => {
    const box = buttonRef.current?.getBoundingClientRect();
    return box ? (box.left + box.width / 2) / window.innerWidth * 100 : snapshot.xPercent;
  };
  const enqueue = (signal: MascotSignal) => pendingRef.current.push(signal);
  const style = {
    left: `${snapshot.xPercent}%`,
    "--dl-transition-ms": `${snapshot.transitionMs}ms`,
    "--dl-action-ms": `${snapshot.actionMs}ms`,
    "--dl-travel-ms": snapshot.behavior === "wander_slide" ? `${snapshot.actionMs}ms` : "650ms",
    "--dl-mobile-bottom": `${mascotConfig.motion.bottomPx.mobile}px`,
    "--dl-desktop-bottom": `${mascotConfig.motion.bottomPx.desktop}px`,
    "--dl-compact-bottom": `${mascotConfig.motion.bottomPx.compactMobile}px`,
    "--dl-mobile-rest": `${mascotConfig.motion.restOffsetPercent.mobile}%`,
    "--dl-desktop-rest": `${mascotConfig.motion.restOffsetPercent.desktop}%`,
    "--dl-compact-rest": `${mascotConfig.motion.restOffsetPercent.compactMobile}%`,
    "--dl-mobile-peek": `${mascotConfig.motion.peekOffsetPercent.mobile}%`,
    "--dl-desktop-peek": `${mascotConfig.motion.peekOffsetPercent.desktop}%`,
    "--dl-compact-peek": `${mascotConfig.motion.peekOffsetPercent.compactMobile}%`,
    "--dl-mobile-hidden": `${mascotConfig.motion.hiddenOffsetPercent.mobile}%`,
    "--dl-desktop-hidden": `${mascotConfig.motion.hiddenOffsetPercent.desktop}%`,
    "--dl-compact-hidden": `${mascotConfig.motion.hiddenOffsetPercent.compactMobile}%`,
  } as CSSProperties;

  return (
    <aside className="dl-mascot-dock" aria-label="DevLibrary mascot" data-mode={snapshot.mode}
      data-behavior={snapshot.behavior ?? "idle"} style={style}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === "transform")
          enqueue({ type: "transition_end" });
      }}>
      <button ref={buttonRef} type="button" className="dl-mascot-button"
        aria-label="與 DevLibrary 桌寵互動"
        onPointerEnter={() => enqueue({ type: "hover", anchorX: anchorX() })}
        onClick={() => enqueue({ type: "tap", at: Date.now(), anchorX: anchorX() })}>
        <span className="dl-mascot-stage" aria-hidden="true">
          <span className="dl-mascot-core">
            <Image src={mascotConfig.core.plate} alt="" fill sizes="88px" priority className="dl-mascot-plate" />
            <span className="dl-mascot-sprout" style={{
              left: mascotConfig.core.sprout.left,
              top: mascotConfig.core.sprout.top,
              width: mascotConfig.core.sprout.displayWidth,
              height: mascotConfig.core.sprout.displayHeight,
              transformOrigin: mascotConfig.core.sprout.pivot,
            }}><Image src={mascotConfig.core.sprout.src} alt="" fill sizes="12px" /></span>
            <span className="dl-mascot-slate" style={{
              left: mascotConfig.slots.codingSlate.left,
              top: mascotConfig.slots.codingSlate.top,
              width: mascotConfig.slots.codingSlate.width,
              transformOrigin: mascotConfig.slots.codingSlate.pivot,
            }}><Image src={mascotConfig.slots.codingSlate.src} alt="" width={1057} height={668} sizes="56px" /></span>
            <span className="dl-mascot-screen-glow" />
            <span className="dl-mascot-glyph" style={{
              left: mascotConfig.slots.codeGlyph.left,
              top: mascotConfig.slots.codeGlyph.top,
              width: mascotConfig.slots.codeGlyph.width,
              transformOrigin: mascotConfig.slots.codeGlyph.pivot,
            }}><Image src={mascotConfig.slots.codeGlyph.src} alt="" width={1216} height={756} sizes="15px" /></span>
            <svg className="dl-mascot-eyes" viewBox={`0 0 ${mascotConfig.core.width} ${mascotConfig.core.height}`}>
              {mascotConfig.core.eyes.map((eye, index) => <g className="dl-mascot-eye" key={index}
                style={{ transformOrigin: `${eye.x}px ${eye.y}px` }}>
                <circle className="dl-mascot-eye-halo" cx={eye.x} cy={eye.y} r={eye.haloRadius} />
                <circle className="dl-mascot-eye-center" cx={eye.x} cy={eye.y} r={eye.moonRadius} />
              </g>)}
            </svg>
            <span className="dl-mascot-cheek dl-mascot-cheek-left" />
            <span className="dl-mascot-cheek dl-mascot-cheek-right" />
          </span>
        </span>
      </button>
    </aside>
  );
}
