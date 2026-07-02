"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { MarkedText } from "@/components/marked-text";
import { heroContent } from "@/data/profile";

export function HomeHero() {
  const { t } = useLanguage();

  return (
    <section className="px-6 py-20 sm:py-24 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
        <div className="max-w-3xl space-y-8">
          <div className="space-y-6">
            <p className="font-mono text-xs font-medium uppercase text-primary/80">
              <MarkedText text={t.home.role} />
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] text-foreground sm:text-6xl lg:text-7xl">
              Hambali Fadib
            </h1>
            <p className="max-w-prose text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
              <MarkedText text={t.home.description} />
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-full px-6 py-1">
              <Link href={heroContent.primaryCta.href}>
                <MarkedText text={t.home.primaryCta} />
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-full border-border/80 bg-background/80 px-6 py-1"
            >
              <Link href="/quality-thinking">
                <MarkedText text={t.home.secondaryCta} />
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[37rem] lg:mx-0 lg:justify-self-end">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-border/70 bg-secondary/40 shadow-[0_30px_80px_-50px_rgba(20,33,61,0.30)]">
            <Image
              src="/profile.jpg"
              alt="Hambali Fadib"
              fill
              priority
              sizes="(min-width: 1280px) 592px, (min-width: 1024px) 46vw, 92vw"
              className="object-cover object-[center_58%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/26 via-transparent to-white/8 dark:from-black/36" />
          </div>
        </div>
      </div>
    </section>
  );
}
