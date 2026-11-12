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
import { flushSync } from "react-dom";

export type Persona = "qa" | "fullstack";
export type Appearance = "light" | "dark";
export type PersonaTransitionStage = "idle" | "introduce" | "dissolve";

export const PERSONA_EXIT_DURATION_MS = 100;
export const PERSONA_ENTER_DURATION_MS = 200;

type IdentityValue = {
  persona: Persona;
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
  switchPersona: () => void;
  transitioning: boolean;
  transitionStage: PersonaTransitionStage;
};

const IdentityContext = createContext<IdentityValue | null>(null);

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

export function IdentityProvider({
  children,
  initialPersona,
  initialAppearance,
}: PropsWithChildren<{ initialPersona: Persona; initialAppearance: Appearance }>) {
  const [persona, setPersona] = useState(initialPersona);
  const [appearanceState, setAppearanceState] = useState(initialAppearance);
  const appearance = appearanceState;
  const appearanceRef = useRef(initialAppearance);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionStage, setTransitionStage] = useState<PersonaTransitionStage>("idle");
  const busy = useRef(false);
  const cancelAnimation = useRef<(() => void) | null>(null);
  const transitionGeneration = useRef(0);
  const focusHeroAfterTransition = useRef(false);
  const setAppearance = useCallback((next: Appearance) => {
    appearanceRef.current = next;
    setAppearanceState(next);
    persistAppearance(next);
    applyUrl(persona, next, { replace: true });
  }, [persona]);

  const switchPersona = useCallback(() => {
    if (busy.current) return;
    const destination = persona === "qa" ? "fullstack" : "qa";
    const currentAppearance = appearanceRef.current;
    window.dispatchEvent(new Event("portfolio-identity-navigation-start"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setTransitionStage("idle");
      (document.activeElement as HTMLElement | null)?.blur();
      setPersona(destination);
      applyUrl(destination, currentAppearance, { home: true });
      window.scrollTo({ top: 0, behavior: "instant" });
      requestAnimationFrame(() => document.querySelector<HTMLElement>("#top h1")?.focus({ preventScroll: true }));
      return;
    }

    busy.current = true;
    setTransitionStage("introduce");
    (document.activeElement as HTMLElement | null)?.blur();
    setTransitioning(true);
    const generation = ++transitionGeneration.current;
    const surface = document.querySelector<HTMLElement>(".identity-surface");
    let exitAnimation: Animation | null = null;
    let enterAnimation: Animation | null = null;

    const finish = () => {
      if (generation !== transitionGeneration.current) return;
      cancelAnimation.current = null;
      busy.current = false;
      setTransitionStage("idle");
      focusHeroAfterTransition.current = true;
      setTransitioning(false);
    };

    cancelAnimation.current = () => {
      transitionGeneration.current += 1;
      exitAnimation?.cancel();
      enterAnimation?.cancel();
    };

    if (!surface?.animate) {
      flushSync(() => {
        setPersona(destination);
        setTransitionStage("idle");
      });
      applyUrl(destination, currentAppearance, { home: true });
      window.scrollTo({ top: 0, behavior: "instant" });
      finish();
      return;
    }

    exitAnimation = surface.animate(
      [{ opacity: 1 }, { opacity: 0.84 }],
      { duration: PERSONA_EXIT_DURATION_MS, easing: "ease-in", fill: "both" },
    );

    void exitAnimation.finished.then(() => {
      if (generation !== transitionGeneration.current) return;
      flushSync(() => {
        setPersona(destination);
        setTransitionStage("dissolve");
      });
      applyUrl(destination, currentAppearance, { home: true });
      window.scrollTo({ top: 0, behavior: "instant" });
      enterAnimation = surface.animate(
        [{ opacity: 0.84 }, { opacity: 1 }],
        { duration: PERSONA_ENTER_DURATION_MS, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
      );
      exitAnimation?.cancel();
      return enterAnimation.finished;
    }).then(finish).catch(() => {
      // Cancellation is expected when browser history changes mid-transition.
    });
  }, [persona]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.persona = persona;
    root.dataset.appearance = appearance;
    root.classList.toggle("dark", appearance === "dark");
    root.classList.toggle("light", appearance === "light");
  }, [persona, appearance]);

  useEffect(() => {
    if (transitioning || !focusHeroAfterTransition.current) return;
    focusHeroAfterTransition.current = false;
    requestAnimationFrame(() => document.querySelector<HTMLElement>("#top h1")?.focus({ preventScroll: true }));
  }, [transitioning]);

  useEffect(() => {
    const sync = () => {
      window.dispatchEvent(new Event("portfolio-identity-navigation-start"));
      cancelAnimation.current?.();
      cancelAnimation.current = null;
      busy.current = false;
      setTransitioning(false);
      setTransitionStage("idle");
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
      appearanceRef.current = nextAppearance;
      setAppearanceState(nextAppearance);
    };
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      cancelAnimation.current?.();
    };
  }, []);

  const value = useMemo(() => ({ persona, appearance, setAppearance, switchPersona, transitioning, transitionStage }), [persona, appearance, setAppearance, switchPersona, transitioning, transitionStage]);

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
