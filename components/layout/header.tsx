"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/data/profile";
import { cn } from "@/lib/utils";

// ── Timing constants ────────────────────────────────────────────────────────
const SLIDE_DURATION   = 340;  // container slide-down / slide-up duration (ms)
const SLIDE_EASE       = "cubic-bezier(0.4, 0, 0.2, 1)";
const ITEM_START_DELAY = 60;   // extra ms after slide finishes before first item
const ITEM_STAGGER_IN  = 65;   // ms between items appearing
const ITEM_STAGGER_OUT = 55;   // ms between items disappearing
const ITEM_DURATION    = 300;  // item fade/slide transition (ms)

export function Header() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navigationLabels = {
    "/": t.nav.home,
    "/projects": t.nav.projects,
    "/quality-thinking": t.nav.thinking,
    "/about": t.nav.about,
    "/contact": t.nav.contact,
  } as const;

  const navItems = siteConfig.navigation;
  // slots = all nav items + language toggle at the end
  const totalSlots = navItems.length + 1;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // containerMounted  → controls DOM presence (true = rendered in DOM)
  // containerSlid     → controls CSS transform (false = at -100% top, true = at 0)
  const [containerMounted, setContainerMounted] = useState(false);
  const [containerSlid,    setContainerSlid]    = useState(false);

  // Per-slot visibility for staggered items
  const [visibleSlots, setVisibleSlots] = useState<boolean[]>(
    () => Array<boolean>(totalSlots).fill(false)
  );

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    clearTimers();

    if (mobileMenuOpen) {
      // ── OPEN sequence ──────────────────────────────────────────────────
      // 1. Mount container at top position (translateY(-100%))
      setContainerMounted(true);
      setContainerSlid(false);
      setVisibleSlots(Array<boolean>(totalSlots).fill(false));

      // 2. On next paint, start slide-down (gives browser a frame to mount first)
      const slideDownTimer = setTimeout(() => {
        setContainerSlid(true);
      }, 20);
      timersRef.current.push(slideDownTimer);

      // 3. After slide completes, stagger items in top → bottom
      for (let i = 0; i < totalSlots; i++) {
        const itemTimer = setTimeout(() => {
          setVisibleSlots((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, SLIDE_DURATION + ITEM_START_DELAY + i * ITEM_STAGGER_IN);
        timersRef.current.push(itemTimer);
      }
    } else {
      // ── CLOSE sequence ─────────────────────────────────────────────────
      // 1. Stagger items OUT top → bottom (Home first → lang toggle last)
      for (let i = 0; i < totalSlots; i++) {
        const itemTimer = setTimeout(() => {
          setVisibleSlots((prev) => {
            const next = [...prev];
            next[i] = false;
            return next;
          });
        }, i * ITEM_STAGGER_OUT);
        timersRef.current.push(itemTimer);
      }

      // 2. After last item finishes disappearing, slide container back up
      const slideUpStart = (totalSlots - 1) * ITEM_STAGGER_OUT + ITEM_DURATION + 30;
      const slideUpTimer = setTimeout(() => {
        setContainerSlid(false);
      }, slideUpStart);
      timersRef.current.push(slideUpTimer);

      // 3. After slide-up animation finishes, unmount container
      const unmountTimer = setTimeout(() => {
        setContainerMounted(false);
      }, slideUpStart + SLIDE_DURATION + 40);
      timersRef.current.push(unmountTimer);
    }

    return clearTimers;
  }, [mobileMenuOpen, totalSlots, clearTimers]);

  return (
    <header
      className={cn(
        "sticky top-0 border-b border-border/70 bg-background/88 transition-[z-index] duration-300",
        containerMounted ? "z-[9999]" : "z-40 backdrop-blur-xl"
      )}
    >
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          aria-label={`${siteConfig.author.name} home`}
          className="flex min-w-0 items-center gap-3 rounded-md text-xl font-semibold text-foreground transition-[transform,opacity] duration-300 hover:opacity-80 motion-safe:hover:-translate-y-px"
        >
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            priority
            className="h-8 w-8 shrink-0 rounded-md"
          />
          <span className="block max-w-[12rem] truncate whitespace-nowrap sm:max-w-none">
            Hambali Fadib
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "relative px-0.5 py-2 text-sm font-medium transition-[transform,color,opacity] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-safe:hover:-translate-y-px",
                  "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[3px] after:w-5 after:rounded-full after:bg-primary after:origin-center after:transition-all after:duration-300",
                  pathname === item.href
                    ? "text-foreground after:scale-x-100 after:opacity-100"
                    : "text-muted-foreground hover:text-foreground after:scale-x-0 after:opacity-0 hover:after:scale-x-100 hover:after:opacity-100",
                )}
              >
                {navigationLabels[item.href as keyof typeof navigationLabels] ?? item.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop right actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <LanguageToggle />
          <Button asChild className="h-10 rounded-full px-5">
            <Link href="/contact">{t.common.getInTouch}</Link>
          </Button>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="relative z-[10000] rounded-full"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <div className="relative flex h-5 w-5 flex-col items-center justify-center">
              <span
                className={cn(
                  "absolute h-[2px] w-5 rounded-full bg-foreground transition-all duration-300 ease-in-out",
                  mobileMenuOpen ? "rotate-45 translate-y-0" : "-translate-y-[6px]"
                )}
              />
              <span
                className={cn(
                  "absolute h-[2px] w-5 rounded-full bg-foreground transition-all duration-300 ease-in-out",
                  mobileMenuOpen ? "opacity-0 scale-x-0" : "opacity-100"
                )}
              />
              <span
                className={cn(
                  "absolute h-[2px] w-5 rounded-full bg-foreground transition-all duration-300 ease-in-out",
                  mobileMenuOpen ? "-rotate-45 translate-y-0" : "translate-y-[6px]"
                )}
              />
            </div>
          </Button>
        </div>
      </nav>

      {/* ── Mobile full-screen overlay (curtain) ─────────────────────────── */}
      {containerMounted && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center backdrop-blur-2xl lg:hidden"
          style={{
            backgroundColor: "var(--background)",
            transform: containerSlid ? "translateY(0)" : "translateY(-100%)",
            transition: `transform ${SLIDE_DURATION}ms ${SLIDE_EASE}`,
          }}
        >
          <div className="flex w-full max-w-md flex-col items-center px-6 py-8">
            {/* Nav items */}
            <ul className="w-full space-y-1">
              {navItems.map((item, i) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "relative block py-4 text-center text-lg font-medium focus-visible:outline-none",
                      "after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-[3px] after:w-5 after:rounded-full after:bg-primary after:origin-center after:transition-all after:duration-300",
                      pathname === item.href
                        ? "text-foreground after:scale-x-100 after:opacity-100"
                        : "text-muted-foreground hover:text-foreground after:scale-x-0 after:opacity-0 hover:after:scale-x-100 hover:after:opacity-100",
                    )}
                    style={{
                      opacity:    visibleSlots[i] ? 1 : 0,
                      transform:  visibleSlots[i] ? "translateY(0)" : "translateY(12px)",
                      transition: `opacity ${ITEM_DURATION}ms ease-out, transform ${ITEM_DURATION}ms ease-out`,
                    }}
                  >
                    {navigationLabels[item.href as keyof typeof navigationLabels] ?? item.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Language toggle — last stagger slot */}
            <div
              className="mt-8 flex w-full justify-center border-t border-border/30 pt-8"
              style={{
                opacity:    visibleSlots[navItems.length] ? 1 : 0,
                transform:  visibleSlots[navItems.length] ? "translateY(0)" : "translateY(12px)",
                transition: `opacity ${ITEM_DURATION}ms ease-out, transform ${ITEM_DURATION}ms ease-out`,
              }}
            >
              <LanguageToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
