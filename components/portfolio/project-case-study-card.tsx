import { ArrowUpRight, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type PortfolioProject } from "@/data/projects";

interface ProjectCaseStudyCardProps {
  project: PortfolioProject;
}

function ProjectVisual({ project }: ProjectCaseStudyCardProps) {
  return (
    <div className="grid-bg relative h-44 overflow-hidden border-b border-border/70 bg-secondary/35">
      <div className="absolute inset-x-6 top-6 grid gap-3">
        <div className="h-3 w-28 rounded-full bg-primary/25" />
        <div className="grid grid-cols-[1fr_0.72fr] gap-3">
          <div className="rounded-lg border border-border/70 bg-card/78 p-3 shadow-sm">
            <div className="h-2 w-24 rounded-full bg-foreground/18" />
            <div className="mt-4 grid gap-2">
              <div className="h-2 rounded-full bg-primary/18" />
              <div className="h-2 w-4/5 rounded-full bg-primary/12" />
              <div className="h-2 w-2/3 rounded-full bg-primary/10" />
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/72 p-3 shadow-sm">
            <div className="h-8 rounded-md bg-accent/70" />
            <div className="mt-3 h-2 rounded-full bg-foreground/16" />
            <div className="mt-2 h-2 w-3/4 rounded-full bg-foreground/12" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between rounded-lg border border-border/70 bg-background/86 px-4 py-3 backdrop-blur">
        <span className="text-xs font-medium text-foreground/80">
          {project.variant === "decision-system" ? "Decision system" : "NDA-safe case study"}
        </span>
        <ArrowUpRight className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DetailBlock({
  title,
  children,
  emphasized = false,
}: {
  title: string;
  children: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div
      className={
        emphasized
          ? "rounded-lg border border-primary/18 bg-primary/6 p-4"
          : "rounded-lg border border-border/70 bg-secondary/38 p-4"
      }
    >
      <p className="font-mono text-[11px] font-medium uppercase text-primary/80">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function ProjectCaseStudyCard({ project }: ProjectCaseStudyCardProps) {
  const isDecisionSystem = project.variant === "decision-system";

  return (
    <Card className="group h-full overflow-hidden border-border/70 bg-card/94 py-1.5 shadow-[0_24px_70px_-52px_rgba(20,33,61,0.28)]">
      <ProjectVisual project={project} />

      <CardHeader className="gap-4 px-6 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          {project.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="rounded-full border-primary/15 bg-primary/6 px-3 py-1 text-primary"
            >
              {tag}
            </Badge>
          ))}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl leading-tight text-foreground">
            {project.title}
          </CardTitle>
          {project.domain ? (
            <p className="text-sm leading-6 text-muted-foreground">{project.domain}</p>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 px-6 pb-6">
        {isDecisionSystem ? (
          <>
            <DetailBlock title="Decision problem">
              <BulletList items={project.decisionProblem ?? []} />
            </DetailBlock>
            <DetailBlock title="What this system changed">
              <BulletList items={project.whatThisSystemChanged ?? []} />
            </DetailBlock>
            <DetailBlock title="Decision impact" emphasized>
              <BulletList items={project.decisionImpact} />
            </DetailBlock>
            {project.evidence?.length ? (
              <DetailBlock title="Evidence">
                <ul className="space-y-2 text-sm leading-6">
                  {project.evidence.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noreferrer" : undefined}
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80"
                      >
                        {item.label}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </DetailBlock>
            ) : null}
          </>
        ) : (
          <>
            {project.context ? (
              <p className="text-sm leading-7 text-muted-foreground">{project.context}</p>
            ) : null}
            {project.problem ? (
              <DetailBlock title="Problem">
                <p className="text-sm leading-6 text-muted-foreground">{project.problem}</p>
              </DetailBlock>
            ) : null}
            {project.whatIOwned?.length ? (
              <DetailBlock title="What I owned">
                <BulletList items={project.whatIOwned} />
              </DetailBlock>
            ) : null}
            {project.risksHandled?.length ? (
              <DetailBlock title="Risk handled">
                <BulletList items={project.risksHandled} />
              </DetailBlock>
            ) : null}
            <DetailBlock title="Decision impact" emphasized>
              <BulletList items={project.decisionImpact} />
            </DetailBlock>
            {project.businessImpact?.length ? (
              <DetailBlock title="Business impact">
                <BulletList items={project.businessImpact} />
              </DetailBlock>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
