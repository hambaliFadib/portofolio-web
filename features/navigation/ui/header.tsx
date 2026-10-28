"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/features/theme";
import { useIdentity } from "@/components/identity/identity-provider";
import { cn } from "@/lib/utils";

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

/** Primary destinations — QA Motion and Field Guide stay
 *  scroll-reachable content sections, not nav items. */
const NAV_ITEMS: NavItem[] = [
  { id: "top", label: "Home" },
  { id: "projects", label: "Projects" },
  { id: "thinking", label: "Thinking" },
  { id: "about", label: "About" },
];

/** Every section observed by the scroll-spy, mapped to the
 *  nav item that owns it. Sections between nav items
 *  (qa-motion, framework, field-guide) keep the active
 *  state correct while scrolling through them. */
const SECTION_TO_NAV: Record<string, NavId | "contact"> = {
  top: "top",
  "qa-motion": "top",
  projects: "projects",
  thinking: "thinking",
  framework: "thinking",
  "field-guide": "thinking",
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

export function Header() {
  const { persona, switchPersona, transitioning } = useIdentity();
  const visibleNavItems = persona === "qa" ? NAV_ITEMS : NAV_ITEMS.slice(0, 1);
  const [activeSection, setActiveSection] = useState<NavId | "contact">("top");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const portalRoot = typeof document === "undefined" ? null : document.getElementById("portfolio-identity");
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  const observerReportedSectionRef = useRef(false);
  // ── Scroll-spy ─────────────────────────────────────────────
  // IntersectionObserver over the detection band. When adjacent
  // sections both touch the band (tall sections overlap it), the
  // section whose center is nearest the viewport center wins —
  // deterministic, matches the reading position, no flicker.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const intersecting = new Map<string, number>();
    const bandCenter = () => window.innerHeight / 2;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const owner = SECTION_TO_NAV[entry.target.id];
          if (!owner) {
            continue;
          }
          if (!entry.isIntersecting) {
            intersecting.delete(owner);
            continue;
          }
          const rect = entry.boundingClientRect;
          const center = rect.top + rect.height / 2;
          intersecting.set(owner, Math.abs(center - bandCenter()));
        }

        let bestId: string | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const [id, distance] of intersecting) {
          if (distance < bestDistance) {
            bestId = id;
            bestDistance = distance;
          }
        }
        if (bestId) {
          observerReportedSectionRef.current = true;
          setActiveSection(bestId as NavId | "contact");
        }
      },
      { rootMargin: SPY_ROOT_MARGIN, threshold: 0 },
    );

    const targets = SPY_SECTION_IDS;
    for (const id of targets) {
      const section = document.getElementById(id);
      if (section) {
        observer.observe(section);
      }
    }

    return () => {
      observer.disconnect();
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
  }, []);

  // ── Mobile menu ────────────────────────────────────────────
  const closeMenu = useCallback(() => setMobileMenuOpen(false), []);

  // Lock body scroll, return focus to the toggle on close,
  // and restore focus to the toggle when Escape is pressed.
  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    firstMenuItemRef.current?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        menuToggleRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, closeMenu]);

  const handleMenuNavigate = () => {
    closeMenu();
    menuToggleRef.current?.focus();
  };

  return (
    <header className="sticky top-0 z-40 h-[68px] border-b border-border/60 bg-background/95">
      <nav
        className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-6"
        aria-label="Primary"
      >
        {/* Left — identity */}
        <button
          type="button"
          aria-label={`Switch to ${persona === "qa" ? "Full Stack Engineer" : "QA Engineer"}`}
          title={`Switch to ${persona === "qa" ? "Full Stack Engineer" : "QA Engineer"}`}
          disabled={transitioning}
          className="group flex min-w-0 cursor-pointer flex-col items-start rounded-md bg-transparent text-left text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={switchPersona}
        >
          <span className="truncate text-[15px] font-semibold tracking-tight">Hambali Fadib</span>
          <span className="mt-1 hidden font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80 sm:block">
            {persona === "qa" ? "QA ENGINEER" : "FULL STACK ENGINEER"}
          </span>
        </button>

        {/* Center — primary navigation */}
        <ul className="hidden items-center gap-8 lg:flex">
          {visibleNavItems.map((item) => (
            <li key={item.id}>
              <Link
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
              </Link>
            </li>
          ))}
        </ul>

        {/* Right — utility controls: subtle theme toggle +
            single solid contact CTA */}
        <div className="flex items-center gap-3">
          <ThemeToggle className="h-11 w-11" />
          {persona === "qa" && <Link
            href="#contact"
            aria-current={activeSection === CONTACT_ID ? "true" : undefined}
            className="hidden h-9 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-colors duration-200 hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
          >
            Get in Touch
          </Link>}
          {/* Mobile menu toggle */}
          <button
            ref={menuToggleRef}
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="primary-mobile-menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors duration-200 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu — primary destinations + contact */}
      {mobileMenuOpen && portalRoot && createPortal((
        <div
          id="primary-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          className={cn(
            "fixed inset-x-0 bottom-0 top-[68px] z-30 flex-col overflow-y-auto bg-background lg:hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200",
          )}
          style={{ display: "flex" }}
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-6 py-6">
            <ul className="flex flex-col">
              {visibleNavItems.map((item, index) => (
                <li key={item.id}>
                  <Link
                    href={`#${item.id}`}
                    ref={index === 0 ? firstMenuItemRef : undefined}
                    aria-current={activeSection === item.id ? "true" : undefined}
                    className={cn(
                      "flex min-h-[52px] items-center justify-between border-b border-border/50 px-1 text-lg font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeSection === item.id
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                    onClick={handleMenuNavigate}
                  >
                    <span>{item.label}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-[6px] w-[6px] rounded-full transition-colors duration-200",
                        activeSection === item.id
                          ? "bg-coral"
                          : "bg-transparent",
                      )}
                    />
                  </Link>
                </li>
              ))}
            </ul>

            {persona === "qa" && <Link
              href="#contact"
              aria-current={activeSection === CONTACT_ID ? "true" : undefined}
              className="mt-6 flex min-h-[52px] items-center justify-center rounded-md bg-foreground px-4 text-base font-medium text-background transition-colors duration-200 hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={handleMenuNavigate}
            >
              Get in Touch
            </Link>}
          </div>
        </div>
      ), portalRoot)}
    </header>
  );
}
