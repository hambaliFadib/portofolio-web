import Link from "next/link";
import { ArrowDownRight, ArrowRight, Plus } from "lucide-react";
import { decisionPrinciplesSection } from "@/data/thinking";

/**
 * Editorial disclosure of existing QA principles.
 * Native <details>/<summary> works without JS, including keyboard and reduced motion.
 */
export function ThinkingEditorial() {
  return (
    <section
      id="thinking"
      aria-labelledby="thinking-heading"
      className="scroll-mt-24 border-t border-border/60 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-8 border-b border-border/70 pb-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:gap-16">
          <div>
            <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-coral">
              Thinking / Decision principles
            </p>
            <h2
              id="thinking-heading"
              className="max-w-3xl font-display text-4xl font-semibold leading-[1.09] tracking-[-0.045em] text-foreground sm:text-6xl"
            >
              Passing is a signal.<br />
              <span className="text-muted-foreground">Proof is the question.</span>
            </h2>
          </div>
          <p className="max-w-lg text-base leading-8 text-muted-foreground">
            Testing tells me what happened. The next question is whether that behavior protects the business intent. Four principles guide the answer.
          </p>
        </div>

        <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)] lg:gap-20 lg:py-14">
          <aside className="self-start lg:sticky lg:top-28">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-coral">
              Inspect the reasoning
            </p>
            <p className="mt-5 max-w-sm font-display text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-3xl">
              A passed check doesn't close a question.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
              Expand a principle to see the distinction that matters before a release decision.
            </p>
            <ArrowDownRight aria-hidden="true" className="mt-6 hidden size-8 text-coral lg:block" strokeWidth={1.5} />
          </aside>
          <div className="border-y border-border/70" aria-label="Four QA decision principles">
            {decisionPrinciplesSection.items.map((principle, index) => (
              <details
                key={principle.id}
                data-thinking-principle={principle.id}
                className="group border-b border-border/70 last:border-b-0"
                open={index === 0}
              >
                <summary
                  className="flex min-h-20 cursor-pointer list-none items-center gap-5 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden sm:gap-8 sm:py-7"
                >
                  <span className="w-8 shrink-0 self-start pt-1 font-mono text-[11px] font-semibold text-coral sm:w-10">
                    0{index + 1}
                  </span>
                  <span className="min-w-0 flex-1 font-display text-xl font-semibold leading-snug tracking-[-0.015em] text-foreground sm:text-2xl">
                    {principle.title}
                  </span>
                  <Plus aria-hidden="true" className="size-5 shrink-0 text-coral transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" />
                </summary>
                <div className="pb-7 pl-[3.25rem] pr-9 sm:pb-9 sm:pl-[4.5rem]">
                  <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                    {principle.description}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-border/70 pt-7">
          <p className="max-w-xl text-sm leading-7 text-muted-foreground">
            This is a decision lens, not a guarantee that passing tests make a release safe.
          </p>
          <Link
            href="#field-guide"
            className="group inline-flex min-h-11 cursor-pointer items-center gap-2 border-b border-coral text-sm font-semibold text-foreground transition-colors hover:text-coral focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Explore the field guide
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
          </Link>
        </div>
      </div>
    </section>
  );
}
