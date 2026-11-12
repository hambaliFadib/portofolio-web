"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { ThemeToggle } from "@/features/theme";
import { useIdentity } from "@/components/identity/identity-provider";
import { cn } from "@/lib/utils";
import { useReducedMotionPreference } from "@/components/motion/use-reduced-motion";

/**
 * Quiet architectural rail for the single-page portfolio.
 *
 * Three zones: identity (left), four primary destinations
 * (center), utility controls (right). All destinations are
 * anchors on `/` — no routes are used for navigation.
 *
 * Active section is tracked with an IntersectionObserver
 * whose rootMargin centers a detection band in the viewport,
 * so exactly one section is "current" at a time and the
 * active item never flickers between adjacent sections.
 */

type NavId = "top" | "projects" | "thinking" | "about";

interface NavItem {
  id: NavId;
  label: string;
}

/** Primary destinations — QA Journey remains scroll-reachable content,
 *  while the primary navigation stays focused on the main sections. */
const NAV_ITEMS: NavItem[] = [
  { id: "top", label: "Home" },
  { id: "projects", label: "Projects" },
  { id: "thinking", label: "Thinking" },
  { id: "about", label: "About" },
];

const LEGACY_FRAGMENT_REDIRECTS: Record<string, string> = {
  framework: "thinking",
  "field-guide": "thinking",
};

/** Every section observed by the scroll-spy, mapped to the
 *  nav item that owns it. Sections between nav items
 *  (qa-motion) keep the active state correct while scrolling. */
const SECTION_TO_NAV: Record<string, NavId | "contact"> = {
  top: "top",
  "qa-motion": "top",
  projects: "projects",
  thinking: "thinking",
  about: "about",
  contact: "contact",
};

const SPY_SECTION_IDS = Object.keys(SECTION_TO_NAV);

const CONTACT_ID = "contact";

/**
 * Detection band: 20%–70% of the viewport height. A section
 * becomes active only while it occupies this central band, so
 * the observer reports at most one intersecting section at a
 * time (sections are taller than the band) and the reported
 * section always matches the visitor's reading position.
 */
const SPY_ROOT_MARGIN = "-20% 0px -30% 0px";
const subscribeToClientReadiness = () => () => {};
const getClientReadiness = () => true;
const getServerReadiness = () => false;

export function Header() {
  const { persona, switchPersona, transitioning } = useIdentity();
  const visibleNavItems = persona === "qa" ? NAV_ITEMS : NAV_ITEMS.slice(0, 1);
  const [activeSection, setActiveSection] = useState<NavId | "contact">("top");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuExitPending, setMenuExitPending] = useState(false);
  const menuScrollLocked = mobileMenuOpen || menuExitPending;
  const portalReady = useSyncExternalStore(
    subscribeToClientReadiness,
    getClientReadiness,
    getServerReadiness,
  );
  const reduceMotion = useReducedMotionPreference();

  const portalRoot = typeof document === "undefined" ? null : document.getElementById("portfolio-identity");
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);
  const personaSwitchFrameRef = useRef<number | null>(null);
  const personaSwitchPendingRef = useRef(false);

  const observerReportedSectionRef = useRef(false);
  // ── Scroll-spy ─────────────────────────────────────────────
  // Recalculate current section geometry on scroll. IntersectionObserver
  // alone is insufficient for tall sections: their intersection can remain
  // true while their center moves across the viewport, leaving stale distances.
  // The observer remains as a layout-change signal; scroll sampling keeps the
  // active destination synchronized throughout long sections.
  useEffect(() => {
    let disposed = false;
    let frame: number | null = null;
    observerReportedSectionRef.current = false;

    const updateActiveSection = () => {
      frame = null;
      if (disposed) return;

      const bandTop = window.innerHeight * 0.2;
      const bandBottom = window.innerHeight * 0.7;
      const bandCenter = window.innerHeight / 2;
      let bestOwner: NavId | "contact" | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const id of SPY_SECTION_IDS) {
        const section = document.getElementById(id);
        const owner = SECTION_TO_NAV[id];
        if (!section || !owner) continue;

        const rect = section.getBoundingClientRect();
        if (rect.bottom <= bandTop || rect.top >= bandBottom) continue;

        const sectionCenter = rect.top + rect.height / 2;
        const distance = Math.abs(sectionCenter - bandCenter);
        if (distance < bestDistance) {
          bestOwner = owner;
          bestDistance = distance;
        }
      }

      if (bestOwner) {
        observerReportedSectionRef.current = true;
        setActiveSection(bestOwner);
      }
    };

    const scheduleUpdate = () => {
      if (disposed || frame !== null) return;
      frame = window.requestAnimationFrame(updateActiveSection);
    };

    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(scheduleUpdate, {
          rootMargin: SPY_ROOT_MARGIN,
          threshold: 0,
        });

    for (const id of SPY_SECTION_IDS) {
      const section = document.getElementById(id);
      if (section) observer?.observe(section);
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();

    return () => {
      disposed = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [persona]);

  // Native fragment scrolling may start before Next finishes hydration. Align
  // the initial target after fonts settle, and normalize only the two legacy
  // hashes. replaceState does not scroll or emit hashchange, so aliases reached
  // later get the same bounded alignment with the existing intent safeguards.
  useEffect(() => {
    let disposed = false;
    let frame: number | null = null;
    let alignmentVersion = 0;
    let alignmentTarget: string | null = null;

    const cancelAlignment = () => {
      alignmentVersion += 1;
      alignmentTarget = null;
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    };

    const alignTo = (id: string) => {
      alignmentVersion += 1;
      const version = alignmentVersion;
      alignmentTarget = id;
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }

      void document.fonts.ready.then(() => {
        if (disposed || version !== alignmentVersion || window.location.hash !== `#${id}`) return;
        frame = window.requestAnimationFrame(() => {
          frame = null;
          if (disposed || version !== alignmentVersion || window.location.hash !== `#${id}`) return;
          const target = document.getElementById(id);
          if (!target) return;

          const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
          const pageTop = target.getBoundingClientRect().top + window.scrollY;
          const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          const desiredScroll = Math.min(maxScroll, Math.max(0, pageTop - margin));
          if (Math.abs(window.scrollY - desiredScroll) > 30) {
            window.scrollTo({ top: desiredScroll, behavior: "instant" });
          }
          alignmentTarget = null;
        });
      });
    };

    const canonicalizeLegacyFragment = () => {
      const legacyId = window.location.hash.slice(1);
      const targetId = LEGACY_FRAGMENT_REDIRECTS[legacyId];
      if (!targetId) return null;

      const canonicalUrl = new URL(window.location.href);
      canonicalUrl.hash = targetId;
      window.history.replaceState(window.history.state, "", canonicalUrl);
      return targetId;
    };

    const handleHashChange = () => {
      const targetId = canonicalizeLegacyFragment();
      if (targetId) {
        alignTo(targetId);
      } else if (alignmentTarget && window.location.hash !== `#${alignmentTarget}`) {
        cancelAlignment();
      }
    };

    const handleScrollIntent = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "].includes(event.key)) {
        cancelAlignment();
      }
    };

    const initialLegacyTarget = canonicalizeLegacyFragment();
    const initialTarget = initialLegacyTarget ?? window.location.hash.slice(1);
    if (initialTarget) alignTo(initialTarget);

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    window.addEventListener("wheel", cancelAlignment, { passive: true });
    window.addEventListener("touchstart", cancelAlignment, { passive: true });
    window.addEventListener("pointerdown", cancelAlignment, { passive: true });
    window.addEventListener("keydown", handleScrollIntent);

    return () => {
      disposed = true;
      cancelAlignment();
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
      window.removeEventListener("wheel", cancelAlignment);
      window.removeEventListener("touchstart", cancelAlignment);
      window.removeEventListener("pointerdown", cancelAlignment);
      window.removeEventListener("keydown", handleScrollIntent);
    };
  }, []);

  // Direct hash navigation (e.g. /#thinking on load) initializes
  // the correct active state even before any scroll event fires.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const owned = id ? SECTION_TO_NAV[id] : undefined;
    if (!owned) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (
        cancelled ||
        observerReportedSectionRef.current ||
        window.location.hash.slice(1) !== id
      ) {
        return;
      }

      setActiveSection(owned);
    });

    return () => {
      cancelled = true;
    };
  }, [persona]);

  // ── Mobile menu ────────────────────────────────────────────
  const closeMenu = useCallback(() => {
    setMenuExitPending(true);
    setMobileMenuOpen(false);
  }, []);

  const handlePersonaSwitch = useCallback(() => {
    if (personaSwitchPendingRef.current || transitioning) return;
    personaSwitchPendingRef.current = true;
    if (mobileMenuOpen) {
      closeMenu();
      personaSwitchFrameRef.current = window.requestAnimationFrame(() => {
        personaSwitchFrameRef.current = null;
        personaSwitchPendingRef.current = false;
        switchPersona();
      });
      return;
    }
    personaSwitchPendingRef.current = false;
    switchPersona();
  }, [closeMenu, mobileMenuOpen, switchPersona, transitioning]);

  useEffect(() => () => {
    if (personaSwitchFrameRef.current !== null) {
      window.cancelAnimationFrame(personaSwitchFrameRef.current);
    }
  }, []);

  // Keep focus inside the full-screen navigation while it is modal.
  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    firstMenuItemRef.current?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        menuToggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const items = mobileMenuRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!items?.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !mobileMenuRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !mobileMenuRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktopQuery.matches) closeMenu();
    };
    desktopQuery.addEventListener("change", closeOnDesktop);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      desktopQuery.removeEventListener("change", closeOnDesktop);
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [mobileMenuOpen, closeMenu]);

  useEffect(() => {
    if (!menuScrollLocked) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuScrollLocked]);

  const handleMenuNavigate = () => {
    closeMenu();
    menuToggleRef.current?.focus();
  };

  return (
    <header className="sticky top-0 z-40 h-[68px] border-b border-border/60 bg-background/95">
      <nav
          className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-6 lg:px-8"
        aria-label="Primary"
      >
        {/* Left — identity */}
        <button
          type="button"
          aria-label={`Hambali Fadib, ${persona === "qa" ? "QA Engineer" : "Full Stack Engineer"}. Switch to ${persona === "qa" ? "Full Stack Engineer" : "QA Engineer"}`}
          title={`Switch to ${persona === "qa" ? "Full Stack Engineer" : "QA Engineer"}`}
          disabled={transitioning}
          className="group flex min-w-0 cursor-pointer flex-col items-start rounded-md bg-transparent text-left text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={handlePersonaSwitch}
        >
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold tracking-tight">Hambali Fadib</span>
            <span aria-hidden="true" className="text-xs text-coral transition-transform group-hover:translate-x-0.5">↔</span>
          </span>
          <span className="mt-1 flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <span>{persona === "qa" ? "QA ENGINEER" : "FULL STACK ENGINEER"}</span>
            <span aria-hidden="true" className="text-coral">· switch</span>
          </span>
        </button>

        {/* Center — primary navigation */}
        <ul className="hidden items-center gap-8 lg:flex">
          {visibleNavItems.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={activeSection === item.id ? "true" : undefined}
                className={cn(
                  "relative rounded-sm px-1 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeSection === item.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {/* Short coral accent stroke — active indicator */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-1 -bottom-0.5 h-[2px] origin-center rounded-full bg-coral transition-transform duration-200",
                    activeSection === item.id
                      ? "scale-x-100"
                      : "scale-x-0",
                  )}
                />
              </a>
            </li>
          ))}
        </ul>

        {/* Right — utility controls: subtle theme toggle +
            single solid contact CTA */}
        <div className="flex items-center gap-3">
          <ThemeToggle className="h-11 w-11" />
          {persona === "qa" && <a
            href="#contact"
            aria-current={activeSection === CONTACT_ID ? "true" : undefined}
            className="hidden h-9 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-colors duration-200 hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
          >
            Get in Touch
          </a>}
          {/* Mobile menu toggle */}
          <button
            ref={menuToggleRef}
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="primary-mobile-menu"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-foreground transition-colors duration-200 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            onClick={() => {
              if (mobileMenuOpen) {
                closeMenu();
              } else {
                setMenuExitPending(false);
                setMobileMenuOpen(true);
              }
            }}
          >
            <span data-menu-icon aria-hidden="true" className="relative block h-6 w-6">
              <span
                data-menu-icon-bar="top"
                className="absolute left-0 top-1/2 h-[2px] w-6 rounded-full bg-current transition-all duration-300 ease-in-out motion-reduce:transition-none"
                style={{
                  transform: mobileMenuOpen
                    ? "translateY(-50%) rotate(45deg)"
                    : "translateY(calc(-50% - 6px)) rotate(0deg)",
                  transformOrigin: "center center",
                }}
              />
              <span
                data-menu-icon-bar="middle"
                className="absolute left-0 top-1/2 h-[2px] w-6 rounded-full bg-current opacity-100 transition-all duration-300 ease-in-out motion-reduce:transition-none"
                style={{
                  transform: `translateY(-50%) scaleX(${mobileMenuOpen ? 0 : 1})`,
                  transformOrigin: "center center",
                  opacity: mobileMenuOpen ? 0 : 1,
                }}
              />
              <span
                data-menu-icon-bar="bottom"
                className="absolute left-0 top-1/2 h-[2px] w-6 rounded-full bg-current transition-all duration-300 ease-in-out motion-reduce:transition-none"
                style={{
                  transform: mobileMenuOpen
                    ? "translateY(-50%) rotate(-45deg)"
                    : "translateY(calc(-50% + 6px)) rotate(0deg)",
                  transformOrigin: "center center",
                }}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Full-screen mobile navigation, with its own modal controls. */}
      {portalReady && portalRoot && createPortal((
        <motion.div
          id="primary-mobile-menu"
          ref={mobileMenuRef}
          role={mobileMenuOpen ? "dialog" : undefined}
          aria-modal={mobileMenuOpen || undefined}
          aria-label={mobileMenuOpen ? "Site navigation" : undefined}
          aria-hidden={!mobileMenuOpen}
          inert={!mobileMenuOpen}
          className="fixed inset-0 z-50 flex h-dvh flex-col overflow-y-auto bg-background lg:hidden"
          initial="closed"
          animate={mobileMenuOpen ? "open" : "closed"}
          onAnimationComplete={() => {
            if (!mobileMenuOpen) setMenuExitPending(false);
          }}
          variants={{
            closed: {
              opacity: reduceMotion ? 0 : 1,
              y: reduceMotion ? 0 : "-100%",
              transition: {
                duration: reduceMotion ? 0 : 0.34,
                ease: [0.4, 0, 0.2, 1],
                when: "afterChildren",
              },
            },
            open: {
              opacity: 1,
              y: 0,
              transition: {
                duration: reduceMotion ? 0 : 0.34,
                ease: [0.4, 0, 0.2, 1],
                delayChildren: reduceMotion ? 0 : 0.04,
                staggerChildren: reduceMotion ? 0 : 0.06,
                when: "beforeChildren",
              },
            },
          }}
          style={{ pointerEvents: mobileMenuOpen ? "auto" : "none" }}
        >
          <div className="flex flex-1 items-center justify-center px-6 py-20 sm:px-8">
            <motion.ul
              className="flex w-full max-w-2xl flex-col items-center gap-2"
              variants={{
                closed: { transition: { staggerChildren: reduceMotion ? 0 : 0.06, staggerDirection: 1 } },
                open: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } },
              }}
            >
              {visibleNavItems.map((item, index) => (
                <motion.li
                  key={item.id}
                  className="w-full"
                  variants={{
                    closed: { opacity: 0, y: reduceMotion ? 0 : 12, transition: { duration: reduceMotion ? 0 : 0.3, ease: "easeOut" } },
                    open: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.3, ease: "easeOut" } },
                  }}
                >
                  <a
                    href={"#" + item.id}
                    ref={index === 0 ? firstMenuItemRef : undefined}
                    aria-current={activeSection === item.id ? "true" : undefined}
                    className="flex min-h-[60px] items-center justify-center rounded-md px-4 text-xl font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:text-2xl"
                    onClick={handleMenuNavigate}
                  >
                    {item.label}
                  </a>
                </motion.li>
              ))}
              {persona === "qa" && (
                <motion.li
                  className="w-full pt-2"
                  variants={{
                    closed: { opacity: 0, y: reduceMotion ? 0 : 12, transition: { duration: reduceMotion ? 0 : 0.3, ease: "easeOut" } },
                    open: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.3, ease: "easeOut" } },
                  }}
                >
                  <a
                    href="#contact"
                    aria-current={activeSection === CONTACT_ID ? "true" : undefined}
                    className="flex min-h-[52px] items-center justify-center rounded-md bg-foreground px-4 text-base font-medium text-background transition-colors duration-200 hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                    onClick={handleMenuNavigate}
                  >
                    Get in Touch
                  </a>
                </motion.li>
              )}
            </motion.ul>
          </div>

          <div className="absolute inset-x-0 top-0 mx-auto flex h-[68px] w-full max-w-7xl items-center justify-end px-6 lg:px-8">
              <button
                type="button"
                aria-label="Close menu"
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-foreground transition-colors duration-200 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  closeMenu();
                  menuToggleRef.current?.focus();
                }}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
          </div>
        </motion.div>
      ), portalRoot)}

    </header>
  );
}
