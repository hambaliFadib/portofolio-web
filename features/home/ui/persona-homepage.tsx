"use client";

import { useEffect } from "react";
import { DarkEditorialHero } from "./dark-editorial-hero";
import { HomepageSections } from "./homepage-sections";
import { useIdentity, type Persona } from "@/components/identity/identity-provider";

export function PersonaHomepage({ personaTitles }: { personaTitles: Readonly<Record<Persona, string>> }) {
  const { persona } = useIdentity();

  useEffect(() => {
    const title = personaTitles[persona];
    document.title = title;
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  }, [persona, personaTitles]);

  return (
    <>
      <DarkEditorialHero />
      {persona === "qa" ? (
        <HomepageSections />
      ) : (
        <p className="mx-auto mb-20 max-w-3xl px-6 text-center text-sm leading-7 text-muted-foreground sm:px-8">
          Full Stack perspective — conceptual identity study. Content, projects, and experience are intentionally pending.
        </p>
      )}
    </>
  );
}
