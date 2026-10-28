"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

export type Persona = "qa" | "fullstack";
export type Appearance = "light" | "dark";

type IdentityValue = {
  persona: Persona;
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
  switchPersona: () => void;
  transitioning: boolean;
};

const IdentityContext = createContext<IdentityValue | null>(null);
const GLYPHS = "{}[]<>/\\*+=:;._# qa() =>";

function applyUrl(persona: Persona, appearance: Appearance, options: { replace?: boolean; home?: boolean } = {}) {
  const url = new URL(window.location.href);
  url.searchParams.set("persona", persona);
  url.searchParams.set("theme", appearance);
  if (options.home) {
    url.pathname = "/";
    url.hash = "top";
  }
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method]({ ...window.history.state, persona, appearance }, "", url);
}

function persistAppearance(appearance: Appearance) {
  try {
    window.localStorage.setItem("theme", appearance);
  } catch {
    // Cookie persistence can still support the next server-rendered request.
  }
  try {
    document.cookie = `theme=${appearance}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // URL and React state remain authoritative when cookie persistence is unavailable.
  }
}

function getStoredAppearance(): Appearance | null {
  try {
    const value = window.localStorage.getItem("theme");
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function drawFragments(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return () => {};

  let width = window.innerWidth;
  let height = window.innerHeight;
  let ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2_400_000 / (width * height)));
  const baseWidth = width;
  const baseHeight = height;
  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2_400_000 / (width * height)));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.font = "600 11px ui-monospace, monospace";
    context.textBaseline = "middle";
  };
  resize();
  window.addEventListener("resize", resize);

  const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 68;
  const textRects: DOMRect[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode() && textRects.length < 420) {
    const node = walker.currentNode;
    if (!node.textContent?.trim() || node.parentElement?.closest("header,[aria-hidden=true],script,style")) continue;
    const style = getComputedStyle(node.parentElement ?? document.body);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) < 0.08) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.width && rect.height && rect.bottom > headerBottom && rect.top < height && rect.right > 0 && rect.left < width) textRects.push(rect);
    }
  }

  const fragments = textRects.flatMap((rect, index) => {
    const count = Math.max(1, Math.min(5, Math.ceil(rect.width / 54)));
    const left = Math.max(0, rect.left);
    const visibleWidth = Math.max(0, Math.min(width, rect.right) - left);
    return Array.from({ length: count }, (_, n) => ({
      x: Math.max(4, Math.min(width - 14, left + ((n + 0.5) / count) * visibleWidth)),
      y: Math.max(headerBottom + 3, Math.min(height - 4, rect.top + rect.height / 2)),
      glyph: GLYPHS[(index * 7 + n * 11) % GLYPHS.length],
      driftX: ((index * 17 + n * 31) % 49) - 24,
      driftY: -18 - ((index * 13 + n * 19) % 54),
    }));
  }).slice(0, 205);

  const surface = document.querySelector(".identity-surface") ?? document.body;
  const computed = getComputedStyle(surface);
  const color = computed.getPropertyValue("--identity-accent").trim() || "#3554D7";
  const surfaceColor = computed.backgroundColor;
  const started = performance.now();
  let frame = 0;
  const paint = (now: number) => {
    const progress = Math.min(1, (now - started) / 690);
    context.clearRect(0, 0, width, height);
    context.fillStyle = surfaceColor;
    context.globalAlpha = Math.min(0.96, progress / 0.42);
    context.fillRect(0, 0, width, height);
    context.fillStyle = color;
    context.globalAlpha = 0.9;
    for (const particle of fragments) {
      context.globalAlpha = Math.max(0, 0.9 * (1 - progress));
      context.fillText(particle.glyph, particle.x * width / baseWidth + particle.driftX * progress, particle.y * height / baseHeight + particle.driftY * progress);
    }
    if (progress < 1) frame = requestAnimationFrame(paint);
  };
  frame = requestAnimationFrame(paint);
  return () => {
    window.removeEventListener("resize", resize);
    cancelAnimationFrame(frame);
  };
}

export function IdentityProvider({
  children,
  initialPersona,
  initialAppearance,
}: PropsWithChildren<{ initialPersona: Persona; initialAppearance: Appearance }>) {
  const [persona, setPersona] = useState(initialPersona);
  const [appearanceState, setAppearanceState] = useState(initialAppearance);
  const appearance = appearanceState;
  const [transitioning, setTransitioning] = useState(false);
  const busy = useRef(false);
  const cancelAnimation = useRef<(() => void) | null>(null);
  const setAppearance = useCallback((next: Appearance) => {
    setAppearanceState(next);
    persistAppearance(next);
    applyUrl(persona, next, { replace: true });
  }, [persona]);

  const switchPersona = useCallback(() => {
    if (busy.current) return;
    const destination = persona === "qa" ? "fullstack" : "qa";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      (document.activeElement as HTMLElement | null)?.blur();
      setPersona(destination);
      applyUrl(destination, appearance, { home: true });
      window.scrollTo({ top: 0, behavior: "instant" });
      requestAnimationFrame(() => document.querySelector<HTMLElement>("#top h1")?.focus({ preventScroll: true }));
      return;
    }

    busy.current = true;
    (document.activeElement as HTMLElement | null)?.blur();
    setTransitioning(true);
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.dataset.personaTransition = "true";
    Object.assign(canvas.style, { position: "fixed", inset: "0", zIndex: "60", pointerEvents: "none" });
    document.body.append(canvas);
    const stopFrame = drawFragments(canvas);

    let cleanupTimer = 0;
    const finish = window.setTimeout(() => {
      setPersona(destination);
      applyUrl(destination, appearance, { home: true });
      window.scrollTo({ top: 0, behavior: "instant" });
      cleanupTimer = window.setTimeout(() => {
        cancelAnimation.current?.();
        canvas.remove();
        cancelAnimation.current = null;
        busy.current = false;
        setTransitioning(false);
        document.querySelector<HTMLElement>("#top h1")?.focus({ preventScroll: true });
      }, 360);
    }, 370);
    cancelAnimation.current = () => {
      window.clearTimeout(finish);
      window.clearTimeout(cleanupTimer);
      stopFrame();
      canvas.remove();
    };
  }, [appearance, persona]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.persona = persona;
    root.dataset.appearance = appearance;
    root.classList.toggle("dark", appearance === "dark");
    root.classList.toggle("light", appearance === "light");
  }, [persona, appearance]);

  useEffect(() => {
    const sync = () => {
      cancelAnimation.current?.();
      busy.current = false;
      setTransitioning(false);
      const params = new URLSearchParams(window.location.search);
      const nextPersona = window.location.pathname === "/" && params.get("persona") === "fullstack" ? "fullstack" : "qa";
      const urlAppearance = params.get("theme");
      const historyAppearance = window.history.state?.appearance;
      const nextAppearance = urlAppearance === "light" || urlAppearance === "dark"
        ? urlAppearance
        : historyAppearance === "light" || historyAppearance === "dark"
          ? historyAppearance
          : getStoredAppearance() ?? "dark";
      setPersona(nextPersona);
      setAppearanceState(nextAppearance);
    };
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      cancelAnimation.current?.();
    };
  }, []);

  const value = useMemo(() => ({ persona, appearance, setAppearance, switchPersona, transitioning }), [persona, appearance, setAppearance, switchPersona, transitioning]);

  return (
    <IdentityContext.Provider value={value}>
      <div id="portfolio-identity" data-persona={persona} data-appearance={appearance} aria-busy={transitioning} inert={transitioning} className="identity-surface">
        {children}
      </div>
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const value = useContext(IdentityContext);
  if (!value) throw new Error("useIdentity must be used within IdentityProvider");
  return value;
}
