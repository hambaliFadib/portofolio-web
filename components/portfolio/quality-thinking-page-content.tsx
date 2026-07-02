"use client";

import Link from "next/link";
import { ArrowRight, BrainCircuit, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkedText } from "@/components/marked-text";
import { QualityThinkingSection } from "@/components/portfolio/quality-thinking-section";
import { useLanguage } from "@/components/language-provider";
import { localizedContent } from "@/data/localized-content";

function ThoughtVisual() {
  const { t } = useLanguage();

  return (
    <div className="grid-bg relative min-h-[25rem] overflow-hidden rounded-lg border border-border/70 bg-card/82 shadow-[0_28px_80px_-54px_rgba(20,33,61,0.48)]">
      <div className="absolute left-1/2 top-1/2 w-[min(24rem,82%)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border/70 bg-background/84 p-8 text-center backdrop-blur">
        <BrainCircuit className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-4 text-2xl font-semibold text-foreground">
          <MarkedText text={t.thinking.visualTitle} />
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          <MarkedText text={t.thinking.visualDescription} />
        </p>
        <div className="mt-6 grid grid-cols-3 gap-2">
          <span className="h-12 rounded-md bg-primary/18" />
          <span className="h-12 rounded-md bg-accent/70" />
          <span className="h-12 rounded-md bg-foreground/10" />
        </div>
      </div>
    </div>
  );
}

export function QualityThinkingPageContent() {
  const { locale, t } = useLanguage();
  const thinkingContent = localizedContent[locale].thinking;

  return (
    <div>
      <section className="px-6 py-20 sm:py-24 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div className="max-w-3xl space-y-8">
            <div className="space-y-6">
              <p className="font-mono text-xs font-medium uppercase text-primary/80">
                <MarkedText text={t.thinking.eyebrow} />
              </p>
              <h1 className="text-5xl font-semibold leading-[1.2] text-foreground sm:text-6xl">
                <MarkedText text={t.thinking.title} />
              </h1>
              <p className="max-w-prose text-lg leading-8 text-muted-foreground">
                <MarkedText text={thinkingContent.pageSubtitle} />
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {thinkingContent.pageStatements.map((statement) => (
                <div
                  key={statement}
                  className="rounded-lg border border-border/70 bg-card/94 px-4 py-4 text-sm leading-6 text-muted-foreground"
                >
                  <MarkedText text={statement} />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-6 py-1">
                <Link href="/projects">
                  <MarkedText text={t.thinking.projectsCta} />
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-full border-border/80 bg-background/80 px-6 py-1"
              >
                <Link href="#quality-thinking">
                  <GitBranch className="h-4 w-4" />
                  <MarkedText text={t.thinking.modelCta} />
                </Link>
              </Button>
            </div>
          </div>

          <ThoughtVisual />
        </div>
      </section>

      <QualityThinkingSection />
    </div>
  );
}
