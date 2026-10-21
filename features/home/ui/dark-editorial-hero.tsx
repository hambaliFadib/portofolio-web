"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { MarkedText } from "@/components/marked-text";
import { AsciiLens } from "@/features/home/ui/ascii-lens";

/**
 * Dark Editorial Hero (HERO-ASCII-01).
 *
 * Editorial split: oversized typography left, portrait with
 * interactive ASCII Cursor Lens right. Dark near-black bg,
 * warm white text, restrained coral accent.
 *
 * The Tesseract is NOT restored. ASCII is the primary
 * technical visual accent. All substantive content preserved.
 *
 * Scroll exit: text drifts up + fades, preparing transition
 * to the next section.
 */
export function DarkEditorialHero() {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  const heroHeadline = "Clarity before speed. Quality before release.";

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const textY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0.4]);
  const portraitScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);

  return (
    <section
      id="top"
      ref={heroRef}
      className="relative py-16 sm:py-20 lg:py-28"
      aria-label="QUALITY ENGINEERING"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-6 sm:gap-12 lg:grid-cols-[1.3fr_minmax(300px,0.7fr)] lg:gap-16 lg:px-8">
      {/* ── Typography column ────────────────────────────────────── */}
      <motion.div
        className="mx-auto max-w-3xl lg:mx-0"
        style={
          reduceMotion ? undefined : { y: textY, opacity: textOpacity }
        }
      >
        <motion.p
          className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-coral"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          QUALITY ENGINEERING
        </motion.p>

        <motion.div
          className="mt-3 mb-2 h-px w-16 bg-coral/30"
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        />

        <motion.p
          className="mt-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Software Quality Assurance Engineer
        </motion.p>

        <motion.h1
          className="mt-6 font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-[3.2rem] lg:text-[3.8rem]"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
        >
          {heroHeadline.split(/(?<=\.)\s+/).map((phrase, i) => (
            <span
              key={i}
              className="block last:mt-1 sm:last:mt-2"
            >
              {phrase}
            </span>
          ))}
        </motion.h1>

        <motion.p
          className="mt-6 max-w-md text-lg leading-8 text-foreground/70 sm:text-xl sm:leading-9"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Making business-critical system risk visible, test evidence traceable,
          and release decisions measurable.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap items-center gap-3"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.6 }}
        >
          <Link
            href="#qa-motion"
            className="inline-flex items-center gap-2 rounded-md bg-coral px-6 py-3 text-sm font-semibold text-background shadow-[0_6px_20px_-8px_rgba(0,0,0,.55)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-8px_rgba(0,0,0,.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <MarkedText text="Explore the journey" />
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <Link
            href="#projects"
            className="inline-flex items-center gap-2 rounded-md border border-border/40 bg-card/40 px-6 py-3 text-sm font-medium text-foreground/90 backdrop-blur transition-colors duration-200 hover:border-coral/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <MarkedText text="View work" />
          </Link>
        </motion.div>
      </motion.div>

      {/* ── Portrait column ─────────────────────────────────────── */}
      <motion.div
        className="relative mx-auto lg:mx-0"
        style={reduceMotion ? undefined : { scale: portraitScale }}
      >
        <div className="relative w-[260px] sm:w-[300px] lg:w-[340px]">
          <AsciiLens
            src="/fotoAbout.jpg"
            alt="Hambali Fadib"
            width={340}
            height={425}
            className="shadow-[0_24px_56px_-20px_rgba(0,0,0,.5)]"
          />
        </div>
      </motion.div>
      </div>
    </section>
  );
}
