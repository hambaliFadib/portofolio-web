"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useRef } from "react";
import { useIdentity } from "@/components/identity/identity-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { appearance, setAppearance, transitioning } = useIdentity();
  const transitionTimerRef = useRef<number | null>(null);
  const isDark = appearance === "dark";
  const label = `Switch to ${isDark ? "light" : "dark"} mode`;

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
        const root = document.documentElement;
        root.classList.remove("theme-transitioning");
      }
    };
  }, []);

  function handleClick() {
    const nextAppearance = isDark ? "light" : "dark";
    const root = document.documentElement;

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }

    root.classList.add("theme-transitioning");
    setAppearance(nextAppearance);

    transitionTimerRef.current = window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
      transitionTimerRef.current = null;
    }, 220);
  }

  return (
    <button
      type="button"
      disabled={transitioning}
      data-theme-toggle
      aria-label={label}
      onClick={handleClick}
      className={cn(
        "theme-toggle-control relative inline-flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center overflow-hidden rounded-md border border-border bg-background p-0 text-foreground transition-colors duration-200 ease-out hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
        className,
      )}
    >
      <Sun
        aria-hidden="true"
        className={cn(
          "absolute h-5 w-5 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
          isDark ? "rotate-[-35deg] scale-75 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
      <Moon
        aria-hidden="true"
        className={cn(
          "absolute h-5 w-5 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
          isDark ? "rotate-0 scale-100 opacity-100" : "rotate-[35deg] scale-75 opacity-0",
        )}
      />
      <span className="sr-only">{label}</span>
    </button>
  );
}
