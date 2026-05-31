"use client";

import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const label = mounted
    ? `Switch to ${nextTheme} mode`
    : "Toggle color mode";

  function toggleTheme() {
    const root = document.documentElement;

    root.dataset.themeTarget = nextTheme;
    root.classList.add("theme-transitioning");
    window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
      delete root.dataset.themeTarget;
    }, 380); // must exceed CSS transition-duration (320ms) + small buffer
    setTheme(nextTheme);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      title={label}
      className={cn(
        "relative h-10 w-10 rounded-full border-border/80 bg-background/85 text-foreground/80 shadow-none backdrop-blur-sm hover:bg-background dark:bg-background/75",
        className,
      )}
      onClick={toggleTheme}
    >
      <SunMedium
        className={cn(
          "h-4 w-4 transition-all duration-300",
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
      <MoonStar
        className={cn(
          "absolute h-4 w-4 transition-all duration-300",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
        )}
      />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
