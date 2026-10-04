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
  const dockRef = useRef<HTMLElement>(null);
  const [renderPaused, setRenderPaused] = useState(false);
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
    let lastPointerSampleAt = 0;

    let interval: number | undefined;
    let intersecting = true;
    let canSensePointer = true;
    const step = () => {
      engine.tick(Date.now(), pendingRef.current.splice(0), motionQuery.matches);
      if (engine.consumeChanged()) {
        const next = engine.snapshot();
        canSensePointer = !["guarded", "shy_hide", "shy_wait"].includes(next.mode);
        setSnapshot(previous => previous.mode === next.mode && previous.behavior === next.behavior &&
          previous.xPercent === next.xPercent && previous.transitionMs === next.transitionMs &&
          previous.actionMs === next.actionMs ? previous : next);
      }
    };
    const onVisibility = () => {
      setRenderPaused(document.hidden || !intersecting);
      pendingRef.current.push({ type: "document_hidden", value: document.hidden });
      step();
      if (interval !== undefined) window.clearInterval(interval);
      interval = document.hidden ? undefined : window.setInterval(step, mascotConfig.scheduler.tickMs);
    };
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      setRenderPaused(document.hidden || !intersecting);
    });
    if (dockRef.current) observer.observe(dockRef.current);
    const onFullscreen = () => pendingRef.current.push({ type: "fullscreen", value: Boolean(document.fullscreenElement) });
    const onFocusIn = (event: FocusEvent) => pendingRef.current.push({ type: "busy", value: isEditing(event.target as Element) });
    const onFocusOut = (event: FocusEvent) => {
      if (isEditing(event.target as Element) && !isEditing(event.relatedTarget as Element))
        pendingRef.current.push({ type: "busy", value: false });
    };
    const onScroll = () => {
      if (document.hidden) return;
      const next = window.scrollY;
      if (Math.abs(next - lastScrollY) >= mascotConfig.scheduler.scrollThresholdPx) {
        pendingRef.current.push({ type: "scroll" });
        lastScrollY = next;
      }
    };
    const onPointerMove = (event: globalThis.PointerEvent) => {
      const now = Date.now();
      if (document.hidden || !intersecting || !canSensePointer || now - lastPointerSampleAt < mascotConfig.scheduler.tickMs) return;
      lastPointerSampleAt = now;
      const current = { x: event.clientX, y: event.clientY, at: Date.now() };
      if (current.at - lastActivityAt >= 1_000) {
        pendingRef.current.push({ type: "pointer_activity", near: false });
        lastActivityAt = current.at;
      }
      const elapsed = current.at - lastPointer.at;
      if (lastPointer.at && elapsed > 0) {
        const speed = Math.hypot(current.x - lastPointer.x, current.y - lastPointer.y) / elapsed * 1000;
        const box = speed >= mascotConfig.scheduler.rapidPointerSpeedPxPerSecond
          ? buttonRef.current?.getBoundingClientRect() : undefined;
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

    return () => {
      if (interval !== undefined) window.clearInterval(interval);
      observer.disconnect();
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
    left: "50%",
    "--dl-x": `${snapshot.xPercent - 50}vw`,
    "--dl-transition-ms": `${snapshot.transitionMs}ms`,
    "--dl-action-ms": `${snapshot.actionMs}ms`,
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
    <aside ref={dockRef} data-render-paused={renderPaused || snapshot.mode === "guarded" || snapshot.mode === "shy_wait"} className="dl-mascot-dock" aria-label="DevLibrary mascot" data-mode={snapshot.mode}
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
            <Image src={mascotConfig.core.plate} alt="" fill sizes="132px" unoptimized fetchPriority="low" className="dl-mascot-plate" />
            <span className="dl-mascot-sprout" style={{
              left: mascotConfig.core.sprout.left,
              top: mascotConfig.core.sprout.top,
              width: mascotConfig.core.sprout.displayWidth,
              height: mascotConfig.core.sprout.displayHeight,
              transformOrigin: mascotConfig.core.sprout.pivot,
            }}><Image src={mascotConfig.core.sprout.src} alt="" fill sizes="16px" unoptimized /></span>
            <span className="dl-mascot-slate" style={{
              left: mascotConfig.slots.codingSlate.left,
              top: mascotConfig.slots.codingSlate.top,
              width: mascotConfig.slots.codingSlate.width,
              transformOrigin: mascotConfig.slots.codingSlate.pivot,
            }}><Image src={mascotConfig.slots.codingSlate.src} alt="" width={180} height={136} sizes="61px" unoptimized /></span>
            <span className="dl-mascot-code-mark" style={{
              left: mascotConfig.slots.codeMark.left,
              top: mascotConfig.slots.codeMark.top,
              width: mascotConfig.slots.codeMark.width,
            }}><Image src={mascotConfig.slots.codeMark.src} alt="" width={1216} height={756} sizes="30px" unoptimized /></span>
            <span className="dl-mascot-eyes">
              {mascotConfig.core.eyes.map((eye, index) => {
                const extent = eye.haloRadius + 6.5;
                const size = extent * 2;
                return <span className="dl-mascot-eye" key={index} style={{
                  left: `${(eye.x - extent) / mascotConfig.core.width * 100}%`,
                  top: `${(eye.y - extent) / mascotConfig.core.height * 100}%`,
                  width: `${size / mascotConfig.core.width * 100}%`,
                  height: `${size / mascotConfig.core.height * 100}%`,
                }}><svg viewBox={`0 0 ${size} ${size}`}>
                  <circle className="dl-mascot-eye-halo" cx={extent} cy={extent} r={eye.haloRadius} />
                  <circle className="dl-mascot-eye-center" cx={extent} cy={extent} r={eye.moonRadius} />
                </svg></span>;
              })}
            </span>
            <span className="dl-mascot-cheek dl-mascot-cheek-left" />
            <span className="dl-mascot-cheek dl-mascot-cheek-right" />
          </span>
        </span>
      </button>
    </aside>
  );
}
