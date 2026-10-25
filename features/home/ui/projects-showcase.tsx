import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";
import { builtSystemsProjects } from "@/data/projects";

type PreviewVariant = "evidence" | "oracle";

const projectNarratives: Record<
  string,
  { number: string; summary: string; outcome: string; preview: PreviewVariant }
> = {
  "ai-test-case-generator": {
    number: "01",
    summary:
      "Requirement evidence becomes reviewable test cases — with coverage gaps surfaced instead of invented.",
    outcome: "Traceable test design",
    preview: "evidence",
  },
  "playwright-quality-framework": {
    number: "02",
    summary:
      "Playwright owns the verdict. AI can explain failures, but it cannot change an assertion or a result.",
    outcome: "An authoritative test oracle",
    preview: "oracle",
  },
};

function SystemPreview({ variant }: { variant: PreviewVariant }) {
  if (variant === "evidence") {
    return (
      <div
        aria-hidden="true"
        className="relative isolate flex min-h-60 flex-col justify-between overflow-hidden rounded-[1.4rem] bg-[#17202B] p-5 text-[#F1EFE8] sm:p-7"
      >
        <div className="pointer-events-none absolute -right-12 -top-24 size-64 rounded-full bg-[#FF7057]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-2 size-72 rounded-full bg-[#8299FF]/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.17em] text-[#C9D8FF]">
          <span>Evidence-bound generation</span>
          <span className="rounded-full border border-[#C9D8FF]/30 px-2.5 py-1">Source first</span>
        </div>
        <div className="relative grid grid-cols-3 items-center gap-2 sm:gap-3">
          {[
            { step: "01", label: "Requirements" },
            { step: "02", label: "Scenario plan" },
            { step: "03", label: "Test cases" },
          ].map((step) => (
            <div
              key={step.step}
              className="relative min-w-0 rounded-xl border border-white/15 bg-white/10 px-2 py-4 backdrop-blur-sm sm:px-3 sm:py-5"
            >
              <span className="block font-mono text-[10px] text-[#FFAA97]">{step.step}</span>
              <span className="mt-2 block text-[11px] font-semibold leading-4 sm:text-xs">
                {step.label}
              </span>
            </div>
          ))}
        </div>
        <div className="relative flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#D9F17A]">
          <span className="size-1.5 rounded-full bg-[#D9F17A]" />
          Coverage audited · gaps disclosed
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="relative isolate flex min-h-60 flex-col justify-between overflow-hidden rounded-[1.4rem] bg-[#17202B] p-5 text-[#F1EFE8] sm:p-7"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#8299FF]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-5 size-64 rounded-full bg-[#A6E5DC]/15 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.17em] text-[#C9D8FF]">
        <span>Separated decision lanes</span>
        <ShieldCheck className="size-5 text-[#D9F17A]" strokeWidth={1.5} />
      </div>
      <div className="relative space-y-2.5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#D9F17A]/35 bg-[#D9F17A]/10 px-4 py-3">
          <div className="min-w-0">
            <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[#D9F17A]">
              Test oracle
            </span>
            <span className="mt-1 block text-sm font-semibold">Playwright assertions</span>
          </div>
          <span className="shrink-0 rounded-full bg-[#D9F17A] px-2.5 py-1 font-mono text-[10px] font-bold text-[#17202B]">
            PASS / FAIL
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#C9D8FF]/35 bg-[#C9D8FF]/5 px-4 py-3">
          <div className="min-w-0">
            <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[#C9D8FF]">
              Advisory layer
            </span>
            <span className="mt-1 block text-sm font-semibold">AI failure triage</span>
          </div>
          <span className="shrink-0 rounded-full border border-[#C9D8FF]/40 px-2.5 py-1 font-mono text-[10px] text-[#C9D8FF]">
            NO VERDICT
          </span>
        </div>
      </div>
      <div className="relative flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#C9D8FF]">
        <span className="size-1.5 rounded-full bg-[#8299FF]" />
        Policy-enforced boundaries
      </div>
    </div>
  );
}

export function ProjectsShowcase() {
  return (
    <section
      id="projects"
      aria-labelledby="projects-heading"
      className="scroll-mt-24 border-t border-border/60 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-10 grid items-end gap-6 sm:mb-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
          <div>
            <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-coral">
              Selected work / Built systems
            </p>
            <h2
              id="projects-heading"
              className="max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl"
            >
              Engineered to make quality visible.
            </h2>
          </div>
          <p className="max-w-lg text-base leading-8 text-muted-foreground lg:pb-1">
            Two public projects that show how I connect requirements, architecture,
            and evidence — beyond a list of tools.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {builtSystemsProjects.map((project, index) => {
            const narrative = projectNarratives[project.id];
            if (!narrative) return null;
            const repository = project.evidence?.find((item) => item.label === "GitHub repo");
            const references = project.evidence?.filter((item) => item.label !== "GitHub repo").slice(0, 2) ?? [];

            return (
              <article
                key={project.id}
                className="group flex min-w-0 flex-col gap-6 rounded-[2rem] border border-border/70 bg-card/80 p-4 shadow-[var(--shadow-cast-sm)] transition-[border-color,box-shadow,transform] duration-300 hover:border-coral/50 hover:shadow-[var(--shadow-cast-md)] motion-safe:hover:-translate-y-1 sm:p-6"
              >
                <SystemPreview variant={narrative.preview} />
                <div className="flex flex-1 flex-col px-2 pb-2 sm:px-3 sm:pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-coral">
                      Project / {narrative.number}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {project.domain}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
                    {project.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                    {narrative.summary}
                  </p>
                  <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-coral" />
                    {narrative.outcome}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2" aria-label={project.title + " technologies and practices"}>
                    {project.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border/90 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-5 gap-y-4 border-t border-border/70 pt-6 sm:mt-8">
                    {repository && (
                      <Link
                        href={repository.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={"Explore " + project.title + " source on GitHub"}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-foreground underline decoration-coral/70 underline-offset-8 transition-colors hover:text-coral focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      >
                        Explore source <ArrowUpRight aria-hidden="true" className="size-4 transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" />
                      </Link>
                    )}
                    {references.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span className="sr-only">Further evidence:</span>
                        {references.map((reference) => (
                          <Link
                            key={reference.href}
                            href={reference.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                          >
                            {reference.label.split(" — ")[0]}
                            <ArrowRight aria-hidden="true" className="size-3" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-8 max-w-3xl text-sm leading-7 text-muted-foreground">
          These are engineering case studies, not benchmark claims. Source code and supporting
          documentation are linked so you can inspect the decisions behind each system.
        </p>
      </div>
    </section>
  );
}
