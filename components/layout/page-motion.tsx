"use client";

import { type PropsWithChildren, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function PageMotion({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const page = pageRef.current;

    if (!page) {
      return;
    }

    const revealTargets = Array.from(
      page.querySelectorAll<HTMLElement>("section, [data-motion-reveal]"),
    ).filter((target) => target.id !== "top");
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
        className="route-transition-page transition-opacity duration-300 opacity-100"
      >
        {children}
      </div>
    </main>
  );
}
