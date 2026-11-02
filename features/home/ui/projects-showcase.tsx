import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { builtSystemsProjects } from "@/data/projects";
import { AsciiLens } from "./ascii-lens";

const entries = {
  "ai-test-case-generator": {
    number: "01",
    kicker: "From ambiguity to evidence",
    statement: "Requirements are not test cases.",
    body: "A five-layer pipeline turns what a requirement actually says into reviewable scenarios. Missing coverage stays visible instead of being invented.",
    boundary: "Traceability before generation",
    image: "/project-evidence-flow.svg",
    imageAlt: "Conceptual requirement-to-coverage illustration: source, scenario plan, and traceable output.",
  },
  "playwright-quality-framework": {
    number: "02",
    kicker: "Automation with a firm boundary",
    statement: "A verdict is not an opinion.",
    body: "Playwright assertions decide PASS or FAIL. AI can help explain the evidence, but never overwrite, skip, or reinterpret the result.",
    boundary: "The test oracle remains deterministic",
    image: "/project-oracle-boundary.svg",
    imageAlt: "Conceptual illustration of authoritative Playwright assertions separated from advisory AI analysis.",
  },
} as const;

export function ProjectsShowcase() {
  return (
    <section id="projects" aria-labelledby="projects-heading" className="scroll-mt-24 border-t border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-6 border-b border-border/70 pb-12 lg:grid-cols-[1fr_0.8fr] lg:items-end lg:gap-20">
          <div>
            <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-coral">Selected work / 2026</p>
            <h2 id="projects-heading" className="max-w-3xl font-display text-4xl font-semibold leading-[1.09] tracking-[-0.045em] text-foreground sm:text-6xl">
              Built to be questioned.<br /><span className="text-muted-foreground">Made to be trusted.</span>
            </h2>
          </div>
          <p className="max-w-lg text-base leading-8 text-muted-foreground lg:pb-1">
            Two public systems. Not a list of tools — a closer look at the decisions that keep their outputs defensible.
          </p>
        </div>
        <div>
          {builtSystemsProjects.map((project) => {
            const entry = entries[project.id as keyof typeof entries];
            if (!entry) return null;
            const repository = project.evidence?.find((item) => item.label === "GitHub repo");
            const references = project.evidence?.filter((item) => item.label !== "GitHub repo").slice(0, 2) ?? [];
            return (
              <article key={project.id} data-project-feature={project.id} className="border-b border-border/70 py-12 sm:py-16">
                <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,0.87fr)_minmax(0,1.13fr)] lg:gap-16 xl:gap-24">
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-coral">
                      <span className="text-3xl leading-none tracking-tight text-foreground sm:text-4xl">{entry.number}</span>
                      <span className="h-px w-9 bg-coral/70" />
                      <span>{entry.kicker}</span>
                    </div>
                    <h3 className="mt-8 max-w-xl font-display text-3xl font-semibold leading-tight tracking-[-0.035em] text-foreground sm:text-4xl">
                      {project.title}
                    </h3>
                    <p className="mt-5 max-w-lg text-xl font-medium leading-snug text-foreground">{entry.statement}</p>
                    <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">{entry.body}</p>
                    <div className="mt-8 border-l-2 border-coral pl-5">
                      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Engineering boundary</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{entry.boundary}</p>
                    </div>
                    <p className="mt-7 font-mono text-xs text-muted-foreground">
                      {project.tags.slice(0, 3).join(" / ")}
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                      {repository && (
                        <Link href={repository.href} target="_blank" rel="noopener noreferrer"
                          aria-label={`Explore ${project.title} source on GitHub`}
                          className="group inline-flex cursor-pointer items-center gap-2 border-b border-coral pb-1 text-sm font-semibold text-foreground transition-colors hover:text-coral focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                          Explore source <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                      )}
                      {references.map((reference) => (
                        <Link key={reference.href} href={reference.href} target="_blank" rel="noopener noreferrer"
                          className="inline-flex cursor-pointer items-center gap-1 border-b border-border pb-1 text-xs text-muted-foreground transition-colors hover:border-coral hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                          {reference.label.split(" — ")[0]} <ArrowUpRight aria-hidden="true" className="size-3" />
                        </Link>
                      ))}
                    </div>
                  </div>
                  <figure className="min-w-0">
                    <div className="overflow-hidden border border-border/60 bg-[#101B29]">
                      <AsciiLens src={entry.image} alt={entry.imageAlt} width={1200} height={720}
                        transitionStage="idle" className="!max-w-none !rounded-none"
                        imageClassName="!object-cover" />
                    </div>
                    <figcaption className="mt-3 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      <span>Conceptual system diagram / not a product screenshot</span>
                      <span className="hidden sm:inline">Hover to inspect</span>
                    </figcaption>
                  </figure>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-8 max-w-3xl text-sm leading-7 text-muted-foreground">
          These descriptions reflect architectural decisions, not benchmark claims. Linked source and documentation remain the evidence.
        </p>
      </div>
    </section>
  );
}
