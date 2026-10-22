import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { aboutCvAction, aboutProfile } from "@/data/about";
import { frameworkBlocks } from "@/data/framework";
import { builtSystemsProjects } from "@/data/projects";
import { contactChannels } from "@/data/profile";
import { decisionPrinciplesSection, problemBreakdownSection } from "@/data/thinking";

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

const motionStages = [
  {
    code: "01 / SIGNAL",
    title: "Find what matters.",
    detail: "Understand the business intent and expose the behavior that could put it at risk.",
  },
  {
    code: "02 / CONNECTION",
    title: "Trace the dependency.",
    detail: "Follow the handoffs between requirements, modules, data, and release decisions.",
  },
  {
    code: "03 / EVIDENCE",
    title: "Make the proof visible.",
    detail: "Validate the critical boundary with reproducible tests and traceable observations.",
  },
  {
    code: "04 / DECISION",
    title: "Release with clarity.",
    detail: "Separate verified behavior, accepted risk, and unresolved uncertainty.",
  },
] as const;

export function HomepageSections() {
  return (
    <>
      <section
        id="qa-motion"
        aria-labelledby="qa-motion-heading"
        className="scroll-mt-24 border-t border-border/60 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div id="qa-motion-heading">
            <SectionHeading
              eyebrow="From signal to decision"
              title="Quality is a connected process."
              description="An engineering path from the first risk signal to a decision backed by evidence, not assumption."
            />
          </div>
          <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {motionStages.map((stage) => (
              <li key={stage.code} className="group relative min-h-56 rounded-2xl border border-border/70 bg-card/70 p-6 transition-colors hover:border-coral/70 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs tracking-wider text-coral">{stage.code}</span>
                  <ArrowDownRight aria-hidden="true" className="h-5 w-5 text-muted-foreground/70" />
                </div>
                <h3 className="mt-10 font-display text-xl font-semibold text-foreground">{stage.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{stage.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="projects"
        aria-labelledby="projects-heading"
        className="scroll-mt-24 border-t border-border/60 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div id="projects-heading">
            <SectionHeading
              eyebrow="Selected work"
              title="Systems built around testable trust."
              description="Two public engineering projects where reproducibility, governance, and traceability matter more than generated output."
            />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {builtSystemsProjects.map((project, index) => {
              const repository = project.evidence?.find((item) => item.label === "GitHub repo");
              return (
                <article key={project.id} className="flex min-h-80 flex-col rounded-3xl border border-border/70 bg-card p-7 shadow-sm sm:p-9">
                  <div className="flex items-start justify-between gap-6">
                    <span className="font-mono text-xs text-coral">PROJECT / 0{index + 1}</span>
                    {repository && (
                      <Link
                        href={repository.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={"View source for " + project.title}
                        className="rounded-full border border-border p-3 text-foreground transition-colors hover:border-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                  <h3 className="mt-10 font-display text-2xl font-semibold text-foreground sm:text-3xl">
                    {project.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium text-coral">{project.domain}</p>
                  <p className="mt-5 text-sm leading-7 text-muted-foreground">{project.problem}</p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-8">
                    {project.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

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
          <div className="grid gap-4 md:grid-cols-2">
            {decisionPrinciplesSection.items.map((principle, index) => (
              <article key={principle.id} className="rounded-2xl border border-border/60 bg-card/60 p-7">
                <span className="font-mono text-xs text-coral">0{index + 1}</span>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{principle.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{principle.description}</p>
              </article>
            ))}
          </div>
          <Link href="#field-guide" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-foreground underline decoration-coral underline-offset-8 hover:text-coral">
            Follow the reasoning path <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section
        id="framework"
        aria-labelledby="framework-heading"
        className="scroll-mt-24 border-t border-border/60 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div id="framework-heading">
            <SectionHeading
              eyebrow="Framework"
              title="Four boundaries. One defensible decision."
              description="A working structure for managing uncertainty before a system reaches release."
            />
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2">
            {frameworkBlocks.map((block, index) => (
              <article key={block.title} className="bg-card p-7 sm:p-9">
                <span className="font-mono text-sm text-coral">0{index + 1}</span>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{block.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{block.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="field-guide"
        aria-labelledby="field-guide-heading"
        className="scroll-mt-24 border-t border-border/60 py-20 sm:py-28"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8">
          <div id="field-guide-heading">
            <SectionHeading
              eyebrow="Field guide"
              title="Start with the right questions."
              description="A compact decision guide drawn from the way I break down ambiguous system behavior."
            />
          </div>
          <ol className="divide-y divide-border/70 border-t border-border/70">
            {problemBreakdownSection.items.map((item, index) => (
              <li key={item.id} className="grid grid-cols-[2.5rem_1fr] gap-4 py-6">
                <span className="pt-1 font-mono text-xs text-coral">0{index + 1}</span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="about"
        aria-labelledby="about-heading"
        className="scroll-mt-24 border-t border-border/60 py-20 sm:py-28"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-20 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <img
              src={aboutProfile.image.src}
              alt={aboutProfile.image.alt}
              width={680}
              height={850}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover lg:aspect-[4/5]"
            />
          </div>
          <div id="about-heading">
            <SectionHeading eyebrow="About" title="Clarity as a working habit." description={aboutProfile.summary} />
            <p className="border-l-2 border-coral pl-5 text-lg font-medium leading-8 text-foreground">{aboutProfile.principle}</p>
            <Link
              href={aboutCvAction.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {aboutCvAction.label} <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="contact"
        aria-labelledby="contact-heading"
        className="scroll-mt-24 border-t border-border/60 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div id="contact-heading">
            <SectionHeading
              eyebrow="Contact"
              title="Bring clarity to the next challenge."
              description="For quality engineering, thoughtful collaboration, or a conversation about making complex systems more trustworthy."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {contactChannels.filter((channel) => ["Email", "LinkedIn", "GitHub"].includes(channel.label)).map((channel) => (
              <Link
                key={channel.label}
                href={channel.href}
                target={channel.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={channel.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                className="group flex min-h-44 flex-col justify-between rounded-2xl border border-border bg-card p-7 transition-colors hover:border-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-semibold text-foreground">{channel.label}</span>
                  <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-coral transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                </div>
                <span className="mt-5 text-sm leading-7 text-muted-foreground">{channel.description}</span>
              </Link>
            ))}
          </div>
          <div className="mt-16 flex flex-wrap items-center justify-between gap-5 border-t border-border/70 pt-7 text-xs text-muted-foreground">
            <span>Quality before speed. Clarity before release.</span>
            <Link href="#top" className="inline-flex items-center gap-2 text-foreground hover:text-coral">
              Back to top <ArrowRight aria-hidden="true" className="h-4 w-4 -rotate-90" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
