"use client";

import { type PropsWithChildren, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

export function PageMotion({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevLocaleRef = useRef(locale);

  // Handle locale change with fade transition
  useEffect(() => {
    if (prevLocaleRef.current !== locale) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
      prevLocaleRef.current = locale;
      return () => clearTimeout(timer);
    }
  }, [locale]);

  useEffect(() => {
    const page = pageRef.current;

    if (!page) {
      return;
    }

    const revealTargets = Array.from(
      page.querySelectorAll<HTMLElement>("section, [data-motion-reveal]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12,
      },
    );

    for (const target of revealTargets) {
      target.classList.add("scroll-reveal");
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <main className="flex-1 overflow-hidden">
      <div
        key={pathname}
        ref={pageRef}
        className={`route-transition-page transition-opacity duration-300 ${
          isTransitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        {children}
      </div>
    </main>
  );
}
