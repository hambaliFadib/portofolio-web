"use client";

import { Fragment, useState } from "react";
import { ArrowRight, ChevronDown, GitBranch, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { MarkedText } from "@/components/marked-text";
import { SectionHeading } from "@/components/portfolio/section-heading";
import { localizedContent } from "@/data/localized-content";
import { cn } from "@/lib/utils";

export function FrameworkSection() {
  const { locale } = useLanguage();
  const content = localizedContent[locale].framework;
  const [activeStep, setActiveStep] = useState(0);
  const [activeUsage, setActiveUsage] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const activeBlock = content.blocks[activeStep] ?? content.blocks[0];

  return (
    <section id="framework" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl space-y-10">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
          <div className="grid-bg rounded-lg border border-border/70 bg-card/88 p-4 shadow-[0_24px_70px_-56px_rgba(20,33,61,0.36)]">
            <div className="rounded-lg border border-primary/18 bg-background/90 p-4">
              <p className="font-mono text-[11px] uppercase text-primary/80">
                <MarkedText text={content.positioningLabel} />
              </p>
              <div className="mt-4 space-y-3">
                {content.introduction.map((item) => (
                  <p key={item} className="text-sm leading-7 text-muted-foreground">
                    <MarkedText text={item} />
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {content.corePositioning.map((item, index) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-lg border border-border/70 bg-background/76 px-3 py-3 text-sm leading-6 text-muted-foreground"
                >
                  <span className="font-mono text-[11px] text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <MarkedText text={item} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-card/94 p-4 shadow-[0_28px_80px_-58px_rgba(20,33,61,0.4)] sm:p-5">
            <div className="grid gap-3 md:grid-cols-4">
              {content.blocks.map((block, index) => {
                const isActive = index === activeStep;

                return (
                  <button
                    key={block.title}
                    type="button"
                    aria-pressed={isActive}
                    className={cn(
                      "group rounded-lg border px-3 py-3 text-left transition-[transform,border-color,background-color,box-shadow] duration-300 motion-safe:hover:-translate-y-px",
                      isActive
                        ? "border-primary/30 bg-primary/8 shadow-[0_16px_42px_-34px_rgba(20,33,61,0.45)]"
                        : "border-border/70 bg-background/74 hover:border-primary/20 hover:bg-background/94",
                    )}
                    onClick={() => setActiveStep(index)}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md border font-mono text-[11px] transition-colors",
                        isActive
                          ? "border-primary/30 bg-primary text-primary-foreground"
                          : "border-border/80 bg-card text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="mt-3 block text-sm font-semibold leading-5 text-foreground">
                      <MarkedText text={block.title} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-border/70 bg-background/82">
              <div className="border-b border-border/70 p-5">
                <p className="font-mono text-[11px] uppercase text-primary/80">
                  <MarkedText text={`${content.activeStepLabel} ${activeStep + 1}`} />
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-foreground">
                  <MarkedText text={activeBlock.title} />
                </h3>
                <p className="mt-3 max-w-prose text-sm leading-7 text-muted-foreground">
                  <MarkedText text={activeBlock.summary} />
                </p>
              </div>

              <div className="grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)_2rem_minmax(0,1fr)] md:items-stretch">
                {activeBlock.steps.map((step, index) => (
                  <Fragment key={step}>
                    <div className="flex min-h-[9.25rem] flex-col rounded-lg border border-border/70 bg-card/80 p-4">
                      <p className="font-mono text-[10px] uppercase text-primary/75">
                        <MarkedText text={`${content.checkpointLabel} ${index + 1}`} />
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        <MarkedText text={step} />
                      </p>
                    </div>
                    {index < activeBlock.steps.length - 1 ? (
                      <div className="hidden h-full items-center justify-center md:flex">
                        <ArrowRight className="h-4 w-4 text-primary/50" />
                      </div>
                    ) : null}
                  </Fragment>
                ))}
              </div>
            </div>

            <button
              type="button"
              aria-expanded={rulesOpen}
              className="mt-4 flex w-full items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-left transition-colors hover:bg-destructive/8"
              onClick={() => setRulesOpen((current) => !current)}
            >
              <span className="flex items-center gap-3">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                  <span>
                  <span className="block text-sm font-semibold text-foreground">
                    <MarkedText text={content.releaseRulesTitle} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <MarkedText text={content.releaseRulesDescription} />
                  </span>
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-300",
                  rulesOpen ? "rotate-180" : "",
                )}
              />
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-500 ease-out",
                rulesOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <ul className="grid gap-3 pt-3 md:grid-cols-2">
                  {content.releaseDecisionRules.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-destructive/18 bg-background/82 px-4 py-4 text-sm leading-6 text-muted-foreground"
                    >
                      <MarkedText text={item} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-lg border border-border/70 bg-card/90 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[11px] font-medium uppercase text-primary/80">
                  <MarkedText text={content.whereUsedTitle} />
                </p>
                <p className="mt-1 max-w-prose text-sm leading-6 text-muted-foreground">
                  <MarkedText text={content.whereUsedDescription} />
                </p>
              </div>
              <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 font-mono text-[10px] uppercase text-primary">
                {String(activeUsage + 1).padStart(2, "0")} / {content.usage.length}
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              {content.usage.map((item, index) => {
                const isActive = index === activeUsage;

                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={isActive}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-left transition-[transform,border-color,background-color,box-shadow] duration-300 motion-safe:hover:-translate-y-px",
                      isActive
                        ? "border-primary/28 bg-primary/8 shadow-[0_16px_42px_-34px_rgba(20,33,61,0.28)]"
                        : "border-border/70 bg-background/72 hover:border-primary/20 hover:bg-background/92",
                    )}
                    onClick={() => setActiveUsage(index)}
                  >
                    <GitBranch
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="mt-3 block text-sm font-semibold text-foreground">
                      <MarkedText text={content.usageLabels[index] ?? `Use ${index + 1}`} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-border/70 bg-background/82">
              <div
                key={activeUsage}
                className="p-5 transition-opacity duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
              >
                <p className="font-mono text-[11px] uppercase text-primary/80">
                  <MarkedText
                    text={content.usageLabels[activeUsage] ?? "Selected context"}
                  />
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground/88">
                  <MarkedText text={content.usage[activeUsage]} />
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-primary/18 bg-primary/6 p-5">
            <p className="font-mono text-[11px] font-medium uppercase text-primary/80">
              <MarkedText text={content.finalPrincipleLabel} />
            </p>
            <p className="mt-4 text-base leading-8 text-foreground/90">
              <MarkedText text={content.closingPrinciple} />
            </p>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              <MarkedText text={content.note} />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
