"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { AboutStickyCanvas } from "./about-sticky-canvas";
import { useReducedMotionPreference } from "@/components/motion/use-reduced-motion";
import { aboutProfile } from "@/data/about";

const stageIds = ["about-stage-01", "about-stage-02"];
const milestoneCount = aboutProfile.journey.length + aboutProfile.education.length + 1;

export function AboutDirectionA() {
  const reduceMotion = useReducedMotionPreference();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const timelineRef = useRef<HTMLOListElement | null>(null);
  const milestonesRef = useRef<Array<HTMLElement | null>>([]);

  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start center", "end center"],
  });
  const scrollFill = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    const milestones = milestonesRef.current.filter((item): item is HTMLElement => item !== null);
    if (!milestones.length) return;

    let frame = 0;
    const updateActive = (initial = false) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const readingLine = window.innerHeight * 0.46;
        const distances = milestones.map((item) => {
          const bounds = item.getBoundingClientRect();
          return Math.abs(bounds.top + bounds.height * 0.24 - readingLine);
        });
        const nearestIndex = distances.reduce(
          (best, distance, index) => distance < distances[best] ? index : best,
          0,
        );
        const currentDistance = distances[activeIndexRef.current] ?? Number.POSITIVE_INFINITY;
        if (initial || nearestIndex === activeIndexRef.current || distances[nearestIndex] + 48 < currentDistance) {
          activeIndexRef.current = nearestIndex;
          setActiveIndex(nearestIndex);
        }
      });
    };

    const observer = new IntersectionObserver(
      () => updateActive(),
      { rootMargin: "-42% 0px -48% 0px", threshold: 0 },
    );
    milestones.forEach((milestone) => observer.observe(milestone));

    const refresh = () => updateActive(true);
    const resizeObserver = new ResizeObserver(refresh);
    if (timelineRef.current) resizeObserver.observe(timelineRef.current);
    window.addEventListener("resize", refresh, { passive: true });
    window.addEventListener("pageshow", refresh);
    refresh();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  const discreteProgress = activeIndex / (milestoneCount - 1);

  return (
    <div className="mt-8 min-w-0">
      <nav aria-label="Professional Journey chapters" className="mb-8">
        <ol className="flex flex-wrap gap-x-2 gap-y-1 sm:gap-x-3">
          {aboutProfile.journey.map((stage, index) => (
            <li key={stage.number}>
              <button
                type="button"
                aria-current={activeIndex === index ? "step" : undefined}
                aria-controls={stageIds[index]}
                onClick={() => {
                  const target = milestonesRef.current[index];
                  if (!target) return;
                  const bounds = target.getBoundingClientRect();
                  const targetScroll = window.scrollY + bounds.top + bounds.height * 0.24 - window.innerHeight * 0.46;
                  window.scrollTo({ top: Math.max(0, targetScroll), behavior: reduceMotion ? "auto" : "smooth" });
                }}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none ${activeIndex === index ? "bg-card font-semibold text-foreground" : "text-muted-foreground hover:bg-card/60 hover:text-foreground"}`}
              >
                <span className={`font-mono text-xs tabular-nums ${activeIndex === index ? "text-coral" : "text-muted-foreground"}`}>{stage.number}</span>
                <span>{stage.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Current journey point: {activeIndex < 2
          ? aboutProfile.journey[activeIndex]?.title
          : activeIndex < 4
            ? aboutProfile.education[activeIndex - 2]?.institution
            : "Personal Note"}
      </p>

      <div className="grid min-w-0 items-start gap-10 xl:grid-cols-[minmax(0,1.12fr)_minmax(23rem,0.88fr)] xl:gap-12 2xl:gap-20">
        <div className="relative isolate min-w-0 xl:pb-10 before:absolute before:bottom-5 before:left-[0.375rem] before:top-2 before:w-px before:bg-border sm:before:left-[0.4375rem]">
          <motion.div
            aria-hidden="true"
            data-about-progress
            className="pointer-events-none absolute bottom-5 left-[0.375rem] top-2 z-0 w-px origin-top bg-coral sm:left-[0.4375rem]"
            style={{ scaleY: reduceMotion ? discreteProgress : scrollFill }}
          />

          <ol
            ref={timelineRef}
            aria-label="Professional experience, education, and personal note"
            data-about-timeline
            className="relative space-y-0 pl-9 sm:pl-11"
          >
        {aboutProfile.journey.map((stage, index) => (
          <li
            key={stage.number}
            id={stageIds[index]}
            ref={(node) => { milestonesRef.current[index] = node; }}
            data-about-milestone
            data-active={activeIndex === index}
            className="relative pb-9 last:pb-0 sm:pb-11"
          >
            <span
              aria-hidden="true"
              className={`absolute -left-9 top-0.5 z-10 grid size-3 place-items-center rounded-full border bg-background font-mono text-[9px] leading-none transition-colors duration-200 motion-reduce:transition-none sm:-left-11 ${activeIndex === index ? "border-coral text-coral" : "border-border text-muted-foreground"}`}
            >
              <span className="sr-only">{stage.number}</span>
            </span>
            <article>
              <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-coral">
                {index === 0 ? "Professional Experience" : "Experience"}
              </p>
              <h4 className={`font-display text-xl leading-tight transition-colors duration-200 motion-reduce:transition-none sm:text-2xl ${activeIndex === index ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                {stage.number} — {stage.title}
              </h4>
              <p className="mt-3 max-w-[68ch] text-sm leading-7 text-muted-foreground sm:text-base">
                {stage.description}
              </p>
            </article>
          </li>
        ))}

        {aboutProfile.education.map((item, index) => {
          const milestoneIndex = aboutProfile.journey.length + index;
          return (
            <li
              key={item.institution}
              id={`about-education-${String(index + 1).padStart(2, "0")}`}
              ref={(node) => { milestonesRef.current[milestoneIndex] = node; }}
              data-about-milestone
              data-active={activeIndex === milestoneIndex}
              className="relative pb-8 last:pb-0 sm:pb-10"
            >
              <span
                aria-hidden="true"
                className={`absolute -left-[2.0625rem] top-1.5 z-10 size-2.5 rounded-full border bg-background transition-colors duration-200 motion-reduce:transition-none sm:-left-[2.5625rem] ${activeIndex === milestoneIndex ? "border-coral" : "border-muted-foreground/50"}`}
              />
              <article>
                {index === 0 && <h4 className="mb-4 font-display text-xl font-semibold text-foreground">Education</h4>}
                <p className={`font-semibold transition-colors duration-200 motion-reduce:transition-none ${activeIndex === milestoneIndex ? "text-foreground" : "text-foreground/80"}`}>
                  {item.institution}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground sm:text-base">{item.qualification}</p>
                {item.status && <p className="mt-1 text-sm italic text-muted-foreground">{item.status}</p>}
              </article>
            </li>
          );
        })}

        <li
          id="about-personal-note"
          ref={(node) => { milestonesRef.current[milestoneCount - 1] = node; }}
          data-about-milestone
          data-active={activeIndex === milestoneCount - 1}
          className="relative pb-1 pt-2"
        >
          <span
            aria-hidden="true"
            className={`absolute -left-[2.0625rem] top-4 z-10 size-2.5 rounded-full border bg-background transition-colors duration-200 motion-reduce:transition-none sm:-left-[2.5625rem] ${activeIndex === milestoneCount - 1 ? "border-coral" : "border-muted-foreground/50"}`}
          />
          <article>
            <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-coral">Personal Note</h4>
            <blockquote className={`mt-3 max-w-[62ch] text-base leading-7 transition-colors duration-200 motion-reduce:transition-none sm:text-lg ${activeIndex === milestoneCount - 1 ? "font-medium text-foreground" : "text-foreground/85"}`}>
              {aboutProfile.personalNote}
            </blockquote>
          </article>
        </li>
          </ol>
        </div>

        <AboutStickyCanvas
          activeIndex={activeIndex}
          scrollProgress={reduceMotion ? discreteProgress : scrollFill}
          reduceMotion={reduceMotion}
        />
      </div>
    </div>
  );
}
