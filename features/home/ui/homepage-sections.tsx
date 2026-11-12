import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { aboutCvAction, aboutProfile } from "@/data/about";
import { AsciiLens } from "./ascii-lens";
import { QaJourney } from "./qa-journey";
import { ProjectsShowcase } from "./projects-showcase";
import { ThinkingNetwork } from "./thinking-network";
import { AboutDirectionA } from "./about-direction-a";
import { ContactFooterExperience } from "./contact-footer-experience";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="mb-10 max-w-3xl sm:mb-14">
      <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-coral">
        {eyebrow}
      </p>
      <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
        {description}
      </p>
    </div>
  );
}

export function HomepageSections() {
  return (
    <>
      <section
        id="qa-motion"
        aria-labelledby="qa-motion-heading"
        className="scroll-mt-24 border-t border-border/60 py-0"
      >
        <QaJourney />
      </section>

      <ProjectsShowcase />

      <section
        id="thinking"
        aria-labelledby="thinking-heading"
        className="scroll-mt-24 border-t border-border/60 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div id="thinking-heading">
            <SectionHeading
              eyebrow="Thinking"
              title="The questions behind the test."
              description="A practical reasoning model for ambiguity, business correctness, and evidence-driven decisions."
            />
          </div>
          <ThinkingNetwork />
        </div>
      </section>

      <section
        id="about"
        aria-labelledby="about-heading"
        className="scroll-mt-24 border-t border-border/60 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:gap-20">
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <AsciiLens
                src={aboutProfile.image.src}
                alt={aboutProfile.image.alt}
                width={680}
                height={850}
                transitionStage="idle"
                aspectRatioClassName="aspect-[4/3] lg:aspect-[4/5]"
                idleZoom={false}
                className="!max-w-none !rounded-none"
              />
            </div>
            <div>
              <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-coral">About</p>
              <h2 id="about-heading" className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
                {aboutProfile.heading}
              </h2>
              <div className="mt-6 max-w-2xl space-y-4 text-base leading-8 text-muted-foreground sm:text-lg">
                {aboutProfile.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <Link
                href={aboutCvAction.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {aboutCvAction.label} <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-16 sm:mt-20">
            <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Professional Journey</h3>
            <AboutDirectionA />
          </div>
        </div>
      </section>

      <ContactFooterExperience />
    </>
  );
}
