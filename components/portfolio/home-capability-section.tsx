"use client";

import { GitBranch, ShieldCheck, Workflow } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { MarkedText } from "@/components/marked-text";
import { Card, CardContent } from "@/components/ui/card";

const capabilityIcons = [Workflow, ShieldCheck, GitBranch] as const;

export function HomeCapabilitySection() {
  const { t } = useLanguage();

  return (
    <section className="px-6 pb-28">
      <div className="mx-auto grid max-w-7xl auto-rows-fr gap-4 md:grid-cols-3">
        {t.home.capabilities.map((capability, index) => {
          const Icon = capabilityIcons[index] ?? ShieldCheck;

          return (
            <Card
              key={capability.title}
              className="h-full border-border/70 bg-card/92 py-0 shadow-[0_24px_70px_-52px_rgba(20,33,61,0.42)]"
            >
              <CardContent className="flex h-full flex-col gap-5 p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/15 bg-primary/8 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-foreground">
                    <MarkedText text={capability.title} />
                  </h2>
                  <p className="text-sm leading-7 text-muted-foreground">
                    <MarkedText text={capability.description} />
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
