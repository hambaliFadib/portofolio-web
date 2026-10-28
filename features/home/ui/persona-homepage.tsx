"use client";

import { DarkEditorialHero } from "./dark-editorial-hero";
import { HomepageSections } from "./homepage-sections";
import { useIdentity } from "@/components/identity/identity-provider";

export function PersonaHomepage() {
  const { persona } = useIdentity();
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
