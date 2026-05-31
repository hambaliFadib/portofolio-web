"use client";

import Link from "next/link";
import { ArrowRight, Network, ShieldCheck } from "lucide-react";
import { builtSystemsProjects, enterpriseCaseStudies } from "@/data/projects";
import { Button } from "@/components/ui/button";
import { MarkedText } from "@/components/marked-text";
import { FrameworkSection } from "@/components/portfolio/framework-section";
import { ProjectJourneySection } from "@/components/portfolio/project-journey-section";
import { RealDecisionCasesSection } from "@/components/portfolio/real-decision-cases-section";
import { useLanguage } from "@/components/language-provider";

function SystemVisualization() {
  const { t } = useLanguage();

  return (
    <div className="grid-bg relative h-[31rem] overflow-hidden rounded-lg border border-border/70 bg-card/80 shadow-[0_28px_80px_-54px_rgba(20,33,61,0.48)]">
      <div className="absolute inset-10 rounded-lg border border-border/70 bg-background/78 p-8 backdrop-blur">
        <div className="grid h-full grid-rows-[auto_1fr_auto] gap-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                <MarkedText text={t.projects.visual.releaseControl} />
              </p>
              <p className="text-xs text-muted-foreground">
                <MarkedText text={t.projects.visual.releaseMeta} />
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-card/88 p-4">
              <Network className="h-5 w-5 text-primary" />
              <div className="mt-5 space-y-2">
                <div className="h-2 rounded-full bg-primary/24" />
                <div className="h-2 w-4/5 rounded-full bg-foreground/14" />
                <div className="h-2 w-2/3 rounded-full bg-foreground/10" />
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/88 p-4">
              <div className="grid grid-cols-3 gap-2">
                <span className="h-12 rounded-md bg-accent/70" />
                <span className="h-12 rounded-md bg-primary/18" />
                <span className="h-12 rounded-md bg-foreground/10" />
              </div>
              <div className="mt-5 space-y-2">
                <div className="h-2 w-3/4 rounded-full bg-foreground/14" />
                <div className="h-2 rounded-full bg-primary/16" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-primary/18 bg-primary/6 px-4 py-3">
              <p className="text-xs font-medium text-primary">
                <MarkedText text={t.projects.visual.decisionSignal} />
              </p>
              <p className="mt-1 text-sm text-foreground/85">
                <MarkedText text={t.projects.visual.riskBoundary} />
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/88 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">
                <MarkedText text={t.projects.visual.evidence} />
              </p>
              <p className="mt-1 text-sm text-foreground/85">
                <MarkedText text={t.projects.visual.proof} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsPageContent() {
  const { t } = useLanguage();

  return (
    <div>
      <section className="px-6 py-20 sm:py-24 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div className="max-w-3xl space-y-8">
            <div className="space-y-6">
              <p className="font-mono text-xs font-medium uppercase text-primary/80">
                <MarkedText text={t.projects.eyebrow} />
              </p>
              <h1 className="text-5xl font-semibold leading-[1.05] text-foreground sm:text-6xl">
                <MarkedText text={t.projects.title} />
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                <MarkedText text={t.projects.description} />
              </p>
            </div>

            <Button asChild size="lg" className="h-12 rounded-full px-6">
              <Link href="#enterprise-case-studies">
                <MarkedText text={t.projects.cta} />
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <SystemVisualization />
        </div>
      </section>

      <ProjectJourneySection
        enterpriseItems={enterpriseCaseStudies}
        builtItems={builtSystemsProjects}
      />

      <FrameworkSection />
      <RealDecisionCasesSection />

      <section className="px-6 py-24">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h2 className="mt-8 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            <MarkedText text={t.projects.final} />
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-12 rounded-full px-6">
              <Link href="/quality-thinking">
                <MarkedText text={t.common.viewThinking} />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-border/80 bg-background/80 px-6"
            >
              <Link href="/contact">
                <MarkedText text={t.common.getInTouch} />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
