"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light";
type MotionState = "idle" | "hover-preview" | "opening" | "theme-reveal" | "settling";

interface Scene {
  from: Theme;
  to: Theme;
}

interface Point {
  x: number;
  y: number;
}

const DARK_PAPER = {
  front: "#28303d",
  edge: "#596477",
  back: "#596477",
  backShadow: "#3d4655",
  backLight: "#707b8d",
  crease: "#18202b",
  shadowInk: "#080b10",
  highlight: "#a0a9b8",
  icon: "#f0eee8",
  destination: "#28303d",
  destinationEdge: "#69768a",
  destinationIcon: "#f0eee8",
};

const LIGHT_PAPER = {
  front: "#f7f5ef",
  edge: "#c8c3b7",
  back: "#d6d1c6",
  backShadow: "#bdb8ad",
  backLight: "#e8e4da",
  crease: "#817b70",
  shadowInk: "#625c52",
  highlight: "#fffdf7",
  icon: "#20232b",
  destination: "#f4f1e9",
  destinationEdge: "#c9c4b8",
  destinationIcon: "#20232b",
};

const REVEAL_AT = 0.62;
const HOVER_PROGRESS = 0.2;
const HOVER_DURATION = 340;
const OPEN_DURATION = 920;

function subscribeToClientReady() {
  return () => {};
}

function getClientReadySnapshot() {
  return true;
}

function getServerReadySnapshot() {
  return false;
}

function opposite(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

function pointText(point: Point): string {
  return `${point.x.toFixed(3)} ${point.y.toFixed(3)}`;
}

function iconMarkup(
  theme: Theme,
  transform: string,
  attribute: string,
  destinationIcon = false,
) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.55,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (theme === "dark") {
    return (
      <g
        {...{ [attribute]: "moon" }}
        transform={transform}
        style={{ color: destinationIcon ? "var(--dest-icon)" : "var(--paper-icon)" }}
        {...common}
      >
        <path d="M15.2 3.4a7.9 7.9 0 1 0 5.4 9.5A6.5 6.5 0 0 1 15.2 3.4Z" />
        <path d="M19.8 3v4M17.8 5h4" />
      </g>
    );
  }

  return (
    <g
      {...{ [attribute]: "sun" }}
      transform={transform}
      style={{ color: destinationIcon ? "var(--dest-icon)" : "var(--paper-icon)" }}
      {...common}
    >
      <circle cx="8" cy="8" r="3.3" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1.1 1.1M11.9 11.9 13 13M13 3l-1.1 1.1M4.1 11.9 3 13" />
    </g>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot,
  );
  const initialScene: Scene = { from: "dark", to: "light" };
  const [scene, setSceneState] = useState<Scene>(initialScene);
  const reactId = useId().replaceAll(":", "");
  const clipId = `themeToggleFrontClip${reactId}`;
  const gradientId = `themeToggleFoldTone${reactId}`;
  const filterId = `themeToggleFoldShadow${reactId}`;

  const svgRef = useRef<SVGSVGElement>(null);
  const mountedRef = useRef(false);
  const sceneRef = useRef<Scene>(initialScene);
  const themeRef = useRef<Theme>("dark");
  const progressRef = useRef(0);
  const motionStateRef = useRef<MotionState>("idle");
  const reducedMotionRef = useRef(false);
  const pointerInsideRef = useRef(false);
  const themeCommittedRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const resolveAnimationRef = useRef<(() => void) | null>(null);
  const resolveSettleRef = useRef<(() => void) | null>(null);
  const operationRef = useRef(0);
  const transitionOwnedRef = useRef(false);

  const currentTheme: Theme = resolvedTheme === "light" ? "light" : "dark";
  const nextTheme = opposite(currentTheme);
  const label = mounted ? `Switch to ${nextTheme} mode` : "Toggle color mode";

  function updateScene(next: Scene) {
    sceneRef.current = next;
    setSceneState(next);
  }

  function setMotionState(next: MotionState) {
    motionStateRef.current = next;
    if (svgRef.current) svgRef.current.dataset.state = next;
  }

  function clearGlobalTransition() {
    if (!transitionOwnedRef.current) return;
    const root = document.documentElement;
    root.classList.remove("theme-transitioning");
    delete root.dataset.themeTarget;
    transitionOwnedRef.current = false;
  }

  function commitTheme(theme: Theme) {
    if (themeCommittedRef.current) return;
    themeCommittedRef.current = true;
    themeRef.current = theme;
    const root = document.documentElement;
    root.dataset.themeTarget = theme;
    root.classList.add("theme-transitioning");
    transitionOwnedRef.current = true;
    setTheme(theme);
  }

  function updateProgress(progress: number) {
    const p = Math.max(0, Math.min(1, progress));
    progressRef.current = p;
    const svg = svgRef.current;
    if (!svg) return;
    svg.dataset.progress = p.toFixed(4);
    svg.style.setProperty("--progress", p.toFixed(4));

    const x0 = 8;
    const x1 = 44;
    const y0 = 8;
    const y1 = 44;
    const side = 36;
    const corner = 2.4;
    const arc = (Math.PI * corner) / 2;
    const routeLength = 2 * (side - corner) + arc;
    const distance = routeLength * p;

    function upperLeft(d: number): Point {
      const straight = side - corner;
      if (d <= straight) return { x: x1 - d, y: y0 };
      d -= straight;
      if (d <= arc) {
        const angle = -Math.PI / 2 - d / corner;
        return {
          x: x0 + corner + corner * Math.cos(angle),
          y: y0 + corner + corner * Math.sin(angle),
        };
      }
      return { x: x0, y: y0 + corner + d - arc };
    }

    function lowerRight(d: number): Point {
      const straight = side - corner;
      if (d <= straight) return { x: x1, y: y0 + d };
      d -= straight;
      if (d <= arc) {
        const angle = d / corner;
        return {
          x: x1 - corner + corner * Math.cos(angle),
          y: y1 - corner + corner * Math.sin(angle),
        };
      }
      return { x: x1 - corner - (d - arc), y: y1 };
    }

    const start = upperLeft(distance);
    const end = lowerRight(distance);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const chord = Math.hypot(dx, dy) || 1;
    const nx = dy / chord;
    const ny = -dx / chord;
    const bend = Math.sin(Math.PI * p);
    const bow = Math.min(4.2, chord * 0.11) * bend;
    const c1 = {
      x: start.x + dx / 3 + nx * bow,
      y: start.y + dy / 3 + ny * bow,
    };
    const c2 = {
      x: start.x + (dx * 2) / 3 + nx * bow,
      y: start.y + (dy * 2) / 3 + ny * bow,
    };
    const lift = 2.1 * Math.pow(Math.max(0, bend), 0.78);
    const curve = `M${pointText(start)} C${pointText(c1)} ${pointText(c2)} ${pointText(end)}`;
    const front = `M${x0} ${y0} L${pointText(start)} C${pointText(c1)} ${pointText(c2)} ${pointText(end)} L${x1} ${y1} L${x0} ${y1} Z`;
    const offset = (point: Point, amount: number): Point => ({
      x: point.x + nx * amount,
      y: point.y + ny * amount,
    });
    const offsetStart = offset(start, lift * 0.22);
    const offsetC1 = offset(c1, lift * 0.82);
    const offsetC2 = offset(c2, lift * 0.82);
    const offsetEnd = offset(end, lift * 0.22);
    const underside = `M${pointText(start)} C${pointText(c1)} ${pointText(c2)} ${pointText(end)} L${pointText(offsetEnd)} C${pointText(offsetC2)} ${pointText(offsetC1)} ${pointText(offsetStart)} Z`;
    const highlight = `M${pointText(offsetStart)} C${pointText(offsetC1)} ${pointText(offsetC2)} ${pointText(offsetEnd)}`;
    const setPath = (selector: string, d: string) => {
      svg.querySelector<SVGPathElement>(selector)?.setAttribute("d", d);
    };

    setPath("[data-front-clip]", front);
    setPath("[data-front-fill]", front);
    setPath("[data-under-shape]", underside);
    setPath("[data-crease]", curve);
    setPath("[data-fold-shadow]", curve);
    setPath("[data-fold-highlight]", highlight);

    const midpoint = {
      x: (start.x + 3 * c1.x + 3 * c2.x + end.x) / 8,
      y: (start.y + 3 * c1.y + 3 * c2.y + end.y) / 8,
    };
    const gradient = svg.querySelector<SVGLinearGradientElement>("linearGradient");
    gradient?.setAttribute("x1", midpoint.x.toFixed(3));
    gradient?.setAttribute("y1", midpoint.y.toFixed(3));
    gradient?.setAttribute("x2", (midpoint.x + nx * Math.max(lift, 0.01)).toFixed(3));
    gradient?.setAttribute("y2", (midpoint.y + ny * Math.max(lift, 0.01)).toFixed(3));

    const crease = svg.querySelector<SVGPathElement>("[data-crease]");
    const shadow = svg.querySelector<SVGPathElement>("[data-fold-shadow]");
    const foldHighlight = svg.querySelector<SVGPathElement>("[data-fold-highlight]");
    if (crease) crease.style.opacity = (0.16 * bend).toFixed(3);
    if (shadow) shadow.style.opacity = (0.2 * bend).toFixed(3);
    if (foldHighlight) foldHighlight.style.opacity = (0.28 * bend).toFixed(3);
  }

  function cancelAnimation() {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const resolve = resolveAnimationRef.current;
    resolveAnimationRef.current = null;
    resolve?.();
  }

  function animateTo(target: number, duration: number, endState: MotionState) {
    cancelAnimation();
    const from = progressRef.current;
    const delta = target - from;
    const startedAt = performance.now();
    setMotionState(endState);

    return new Promise<void>((resolve) => {
      resolveAnimationRef.current = resolve;

      const frame = (now: number) => {
        const t = Math.max(0, Math.min(1, (now - startedAt) / duration));
        const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
        const progress = from + delta * eased;
        updateProgress(progress);

        if (
          motionStateRef.current === "opening" &&
          progress >= REVEAL_AT &&
          !themeCommittedRef.current
        ) {
          commitTheme(sceneRef.current.to);
          setMotionState("theme-reveal");
        }
        if (progress >= 0.94 && motionStateRef.current === "theme-reveal") {
          setMotionState("settling");
        }

        if (t < 1) {
          frameRef.current = window.requestAnimationFrame(frame);
          return;
        }

        updateProgress(target);
        frameRef.current = null;
        const done = resolveAnimationRef.current;
        resolveAnimationRef.current = null;
        done?.();
      };

      frameRef.current = window.requestAnimationFrame(frame);
    });
  }

  function settleAfterOpen() {
    return new Promise<void>((resolve) => {
      resolveSettleRef.current = resolve;
      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = null;
        const done = resolveSettleRef.current;
        resolveSettleRef.current = null;
        done?.();
      }, 90);
    });
  }

  function resetToTheme(theme: Theme) {
    themeRef.current = theme;
    updateScene({ from: theme, to: opposite(theme) });
    updateProgress(0);
    setMotionState("idle");
    themeCommittedRef.current = false;
    clearGlobalTransition();
  }

  const handleReducedMotionChange = useEffectEvent((reduced: boolean) => {
    reducedMotionRef.current = reduced;
    if (
      !reduced ||
      (motionStateRef.current === "idle" && progressRef.current === 0)
    ) {
      return;
    }

    operationRef.current += 1;
    const wasOpening =
      motionStateRef.current !== "hover-preview" &&
      !(motionStateRef.current === "idle" && !themeCommittedRef.current);
    const target = sceneRef.current.to;
    cancelAnimation();
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
      const resolve = resolveSettleRef.current;
      resolveSettleRef.current = null;
      resolve?.();
    }

    if (wasOpening) commitTheme(target);
    resetToTheme(wasOpening ? target : sceneRef.current.from);
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    mountedRef.current = true;
    reducedMotionRef.current = media.matches;

    const handleChange = (event: MediaQueryListEvent) => {
      handleReducedMotionChange(event.matches);
    };
    media.addEventListener("change", handleChange);

    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      media.removeEventListener("change", handleChange);
      cancelAnimation();
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      const resolve = resolveSettleRef.current;
      resolveSettleRef.current = null;
      resolve?.();
      clearGlobalTransition();
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    themeRef.current = currentTheme;
    if (motionStateRef.current === "idle") {
      updateScene({ from: currentTheme, to: opposite(currentTheme) });
    }
  }, [mounted, currentTheme]);

  async function open() {
    if (
      motionStateRef.current === "opening" ||
      motionStateRef.current === "theme-reveal" ||
      motionStateRef.current === "settling"
    ) {
      return;
    }

    const operation = ++operationRef.current;
    pointerInsideRef.current = false;
    if (motionStateRef.current === "idle") {
      themeCommittedRef.current = false;
      updateScene({ from: themeRef.current, to: opposite(themeRef.current) });
    }

    const targetTheme = sceneRef.current.to;
    if (reducedMotionRef.current) {
      setTheme(targetTheme);
      resetToTheme(targetTheme);
      return;
    }

    const remaining = Math.max(0.2, 1 - progressRef.current);
    await animateTo(1, OPEN_DURATION * remaining, "opening");
    if (!mountedRef.current || operation !== operationRef.current) return;

    if (!themeCommittedRef.current) commitTheme(targetTheme);
    setMotionState("settling");
    await settleAfterOpen();
    if (!mountedRef.current || operation !== operationRef.current) return;
    resetToTheme(targetTheme);
  }

  function preview() {
    if (
      !pointerInsideRef.current ||
      motionStateRef.current !== "idle" ||
      reducedMotionRef.current
    ) {
      return;
    }

    themeCommittedRef.current = false;
    updateScene({ from: themeRef.current, to: opposite(themeRef.current) });
    void animateTo(HOVER_PROGRESS, HOVER_DURATION, "hover-preview");
  }

  function closePreview() {
    pointerInsideRef.current = false;
    if (motionStateRef.current === "hover-preview") {
      void animateTo(0, 200, "idle");
    }
  }

  function handlePointerEnter(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    pointerInsideRef.current = true;
    preview();
  }

  function handlePointerLeave(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    closePreview();
  }

  const paper = scene.from === "dark" ? DARK_PAPER : LIGHT_PAPER;
  const destination = scene.to === "dark" ? DARK_PAPER : LIGHT_PAPER;
  const svgStyle = {
    "--paper-front": paper.front,
    "--paper-edge": paper.edge,
    "--paper-back": paper.back,
    "--paper-back-shadow": paper.backShadow,
    "--paper-back-light": paper.backLight,
    "--paper-crease": paper.crease,
    "--paper-shadow-ink": paper.shadowInk,
    "--paper-highlight": paper.highlight,
    "--paper-icon": paper.icon,
    "--dest-paper": destination.destination,
    "--dest-icon": destination.destinationIcon,
    "--dest-edge": destination.destinationEdge,
  } as CSSProperties;

  return (
    <div className={cn("relative isolate h-9 w-9 shrink-0", className)}>
      <svg
        ref={svgRef}
        className="pointer-events-none absolute left-[-8px] top-[-8px] z-[2] block h-[52px] w-[52px] overflow-visible"
        data-art="actual"
        data-from={scene.from}
        data-to={scene.to}
        data-state="idle"
        data-progress="0.0000"
        viewBox="0 0 52 52"
        aria-hidden="true"
        focusable="false"
        style={svgStyle}
      >
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1="44"
            y1="8"
            x2="44"
            y2="8"
          >
            <stop offset="0" stopColor="var(--paper-back-shadow)" />
            <stop offset=".42" stopColor="var(--paper-back)" />
            <stop offset="1" stopColor="var(--paper-back-light)" />
          </linearGradient>
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation=".48" />
          </filter>
          <clipPath id={clipId}>
            <path data-front-clip d="M8 8H44V44H8Z" />
          </clipPath>
        </defs>

        <rect
          x="8"
          y="8"
          width="36"
          height="36"
          rx="1.6"
          fill="var(--dest-paper)"
          stroke="var(--dest-edge)"
          strokeWidth=".65"
        />
        {iconMarkup(scene.to, scene.to === "light" ? "translate(18 18)" : "translate(12.6 15.6)", "data-destination-icon", true)}

        <path data-under-shape fill={`url(#${gradientId})`} stroke="none" />
        <g clipPath={`url(#${clipId})`}>
          <path
            data-front-fill
            d="M8 8H44V44H8Z"
            fill="var(--paper-front)"
            stroke="var(--paper-edge)"
            strokeWidth=".46"
            strokeLinejoin="round"
          />
          {iconMarkup(scene.from, scene.from === "dark" ? "translate(12.6 15.6)" : "translate(18 18)", "data-current-icon")}
        </g>
        <path
          data-fold-shadow
          filter={`url(#${filterId})`}
          fill="none"
          stroke="var(--paper-shadow-ink)"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0"
        />
        <path
          data-crease
          fill="none"
          stroke="var(--paper-crease)"
          strokeWidth=".34"
          strokeLinecap="round"
          opacity="0"
        />
        <path
          data-fold-highlight
          fill="none"
          stroke="var(--paper-highlight)"
          strokeWidth=".3"
          strokeLinecap="round"
          opacity="0"
        />
      </svg>

      <button
        type="button"
        data-theme-toggle
        aria-label={label}
        title={label}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={() => void open()}
        className={cn(
          "absolute inset-0 z-[3] h-full w-full cursor-pointer touch-manipulation rounded-[4px] border-0 bg-transparent p-0 text-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-[3px] focus-visible:ring-offset-background",
        )}
      >
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}
