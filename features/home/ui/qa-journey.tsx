"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleAlert, Play, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotionPreference } from "@/components/motion/use-reduced-motion";

const chapters = [
  { id: "signal", label: "Signal", title: "A message is a clue." },
  { id: "connection", label: "Connection", title: "Follow the write." },
  { id: "evidence", label: "Evidence", title: "Replay the evidence." },
  { id: "decision", label: "Decision", title: "Choose the next move." },
] as const;

const handoffs = [
  {
    label: "User intent",
    detail: "Nadia submits a profile name change.",
  },
  {
    label: "Interface",
    detail: "The screen reports that the profile was saved.",
  },
  {
    label: "Write request",
    detail: "The acknowledgement says the write completed; inspect what it confirms.",
  },
  {
    label: "Stored value",
    detail: "A reload returns the previous name, so persistence remains unproven.",
  },
] as const;

const replaySteps = [
  "Submit the profile update",
  "Reload the profile",
  "Compare expected and observed",
  "Record the mismatch",
] as const;

type ChapterId = (typeof chapters)[number]["id"];
type DecisionId = "inspect-write" | "hold-release";

const sceneTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

const canvasFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--identity-paper-dark-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101B29]";
const sectionFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function SignalScene({ reduceMotion }: { reduceMotion: boolean }) {
  const [observed, setObserved] = useState(false);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
      transition={reduceMotion ? { duration: 0 } : sceneTransition}
      className="grid min-h-[340px] items-center gap-9 p-6 sm:min-h-[360px] sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14"
    >
      <div className="max-w-md">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--identity-paper-dark-ink)]">The first signal</p>
        <h3 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl">
          “Saved” is what the screen said.
        </h3>
        <p className="mt-5 text-base leading-8 text-white/70">
          Nadia changed her profile name. The confirmation appeared, but the value after reload tells a different story.
        </p>
      </div>

      <div className="min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] items-center gap-3 sm:gap-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-white/55 sm:text-xs">Expected after save</p>
            <p className="mt-3 break-words font-display text-xl font-medium leading-tight text-white sm:text-2xl">Nadia Putri</p>
          </div>
          <ArrowRight aria-hidden="true" className="mx-auto size-5 text-[var(--identity-paper-dark-ink)]" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-white/55 sm:text-xs">After reload</p>
            <p className={`mt-3 break-words font-display text-xl font-medium leading-tight sm:text-2xl ${observed ? "text-[var(--identity-paper-dark-ink)]" : "text-white/50"}`}>
              {observed ? "Maya Putri" : "Not checked"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setObserved(true)}
          className={`mt-8 inline-flex min-h-11 cursor-pointer items-center gap-2 border-b border-[var(--identity-paper-dark-ink)] pb-1 text-sm font-semibold text-white transition-colors hover:text-[var(--identity-paper-dark-ink)] motion-reduce:transition-none ${canvasFocusClass}`}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          {observed ? "Reload checked" : "Check after reload"}
        </button>
        <p role="status" aria-live="polite" className="mt-3 min-h-6 border-l-2 border-[var(--identity-paper-dark-ink)] pl-4 text-base leading-7 text-white/70">
          {observed ? "The earlier value returned. The confirmation alone did not prove persistence." : "The next step is to compare the value that returns."}
        </p>
      </div>
    </motion.div>
  );
}

function ConnectionScene({ reduceMotion }: { reduceMotion: boolean }) {
  const [selectedHandoff, setSelectedHandoff] = useState(0);
  const activeHandoff = handoffs[selectedHandoff];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
      transition={reduceMotion ? { duration: 0 } : sceneTransition}
      className="min-h-[340px] p-6 sm:min-h-[360px] sm:p-10"
    >
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--identity-paper-dark-ink)]">Trace the handoff</p>
        <h3 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl">
          Where did the value stop travelling?
        </h3>
        <p className="mt-4 text-base leading-8 text-white/70">
          Select a point in the write path to see what still needs proof. Each point is a question, not a root-cause claim.
        </p>
      </div>

      <ol aria-label="Profile update handoff" className="relative mt-10 grid gap-2 sm:grid-cols-4 sm:gap-4">
        <span aria-hidden="true" className="absolute bottom-5 left-[13px] top-5 w-px bg-white/20 sm:bottom-auto sm:left-[8%] sm:right-[8%] sm:top-[13px] sm:h-px sm:w-auto" />
        {handoffs.map((handoff, index) => {
          const selected = selectedHandoff === index;
          return (
            <li key={handoff.label} className="relative min-w-0">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedHandoff(index)}
                className={`group flex min-h-11 w-full cursor-pointer items-center gap-3 text-left sm:flex-col sm:items-start sm:gap-4 ${canvasFocusClass}`}
              >
                <span className={`grid size-[27px] shrink-0 place-items-center rounded-full border font-mono text-[10px] transition-colors motion-reduce:transition-none sm:size-7 ${selected ? "border-[var(--identity-paper-dark-ink)] bg-[var(--identity-paper-dark-ink)] text-[#101B29]" : "border-white/35 bg-[#101B29] text-white/70 group-hover:border-white group-hover:text-white"}`}>
                  {selected ? <Check aria-hidden="true" className="size-3.5" /> : `0${index + 1}`}
                </span>
                <span className={`text-sm font-medium leading-snug transition-colors motion-reduce:transition-none ${selected ? "text-white" : "text-white/65 group-hover:text-white"}`}>
                  {handoff.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div aria-live="polite" className="mt-8 min-h-[70px] border-l-2 border-[var(--identity-paper-dark-ink)] pl-4">
        <p className="font-mono text-xs uppercase tracking-[0.13em] text-white/55">{activeHandoff.label}</p>
        <p className="mt-2 max-w-2xl text-base leading-8 text-white">{activeHandoff.detail}</p>
      </div>
    </motion.div>
  );
}

function EvidenceScene({ reduceMotion }: { reduceMotion: boolean }) {
  const [step, setStep] = useState(-1);
  const running = step >= 0 && step < replaySteps.length - 1;
  const complete = step === replaySteps.length - 1;

  useEffect(() => {
    if (!running) return;
    if (reduceMotion) {
      queueMicrotask(() => {
        setStep((current) => (current >= 0 && current < replaySteps.length - 1 ? replaySteps.length - 1 : current));
      });
      return;
    }

    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(current + 1, replaySteps.length - 1));
    }, 420);

    return () => window.clearTimeout(timer);
  }, [reduceMotion, running, step]);

  function runReplay() {
    setStep(reduceMotion ? replaySteps.length - 1 : 0);
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
      transition={reduceMotion ? { duration: 0 } : sceneTransition}
      className="min-h-[340px] p-6 sm:min-h-[360px] sm:p-10"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--identity-paper-dark-ink)]">Run the check</p>
          <h3 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl">
            A repeatable path turns doubt into evidence.
          </h3>
          <p className="mt-4 text-base leading-8 text-white/70">
            Replay the same update, reload the profile, and compare what was requested with what came back.
          </p>
        </div>
        <button
          type="button"
          onClick={runReplay}
          disabled={running}
          className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 self-start border-b border-[var(--identity-paper-dark-ink)] pb-1 text-sm font-semibold text-white transition-colors hover:text-[var(--identity-paper-dark-ink)] disabled:cursor-wait disabled:text-white/55 motion-reduce:transition-none sm:self-auto ${canvasFocusClass}`}
        >
          {running ? <RotateCcw aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <Play aria-hidden="true" className="size-4" />}
          {running ? "Checking evidence" : complete ? "Run it again" : "Run evidence replay"}
        </button>
      </div>

      <ol aria-label="Evidence replay steps" className="relative mt-10 grid gap-3 sm:grid-cols-4 sm:gap-4">
        <span aria-hidden="true" className="absolute bottom-8 left-[4px] top-3 w-px bg-white/20 sm:bottom-auto sm:left-[12.5%] sm:right-[12.5%] sm:top-[4px] sm:h-px sm:w-auto" />
        {replaySteps.map((label, index) => {
          const reached = step >= index;
          const isCurrent = running && step === index;
          return (
            <li key={label} data-evidence-step={index} className="relative min-h-11 min-w-0 pl-5 sm:min-h-[72px] sm:pl-0 sm:pt-6">
              <span aria-hidden="true" className={`absolute left-0 top-[7px] size-[9px] rounded-full sm:top-0 ${reached ? "bg-[var(--identity-paper-dark-ink)]" : "bg-white/30"}`} />
              <p className={`text-sm leading-6 ${reached ? "font-semibold text-white" : "text-white/55"}`}>{label}</p>
              {isCurrent && <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--identity-paper-dark-ink)]">In progress</span>}
              {complete && index === replaySteps.length - 1 && <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--identity-paper-dark-ink)]">Mismatch found</span>}
            </li>
          );
        })}
      </ol>

      <p role="status" aria-live="polite" className="mt-8 min-h-7 border-l-2 border-[var(--identity-paper-dark-ink)] pl-4 text-base leading-7 text-white/75">
        {complete ? (
          <span className="inline-flex items-start gap-2"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--identity-paper-dark-ink)]" /> Evidence confirms a mismatch in this example: the previous name returned after reload.</span>
        ) : running ? "The profile is being reloaded and compared in this local simulation." : "No result is assumed. Run the replay to see the observed state."}
      </p>
    </motion.div>
  );
}

function DecisionScene({ reduceMotion }: { reduceMotion: boolean }) {
  const [decision, setDecision] = useState<DecisionId | null>(null);
  const choices: { id: DecisionId; label: string; detail: string }[] = [
    { id: "inspect-write", label: "Inspect the write acknowledgement", detail: "Compare its confirmation with the value returned after reload." },
    { id: "hold-release", label: "Hold release until persistence is verified", detail: "Wait for a confirmed read-back before release." },
  ];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
      transition={reduceMotion ? { duration: 0 } : sceneTransition}
      className="min-h-[340px] p-6 sm:min-h-[360px] sm:p-10"
    >
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--identity-paper-dark-ink)]">Choose a proportionate next step</p>
        <h3 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl">
          The mismatch is evidence. The cause is still open.
        </h3>
        <p className="mt-4 text-base leading-8 text-white/70">
          Choose a QA next step. The simulation does not decide release ownership.
        </p>
      </div>

      <div className="mt-8 grid gap-2 sm:grid-cols-2 sm:gap-6">
        {choices.map((choice) => {
          const selected = decision === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setDecision(choice.id)}
              className={`group flex min-h-11 cursor-pointer items-start gap-3 py-3 text-left ${canvasFocusClass}`}
            >
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors motion-reduce:transition-none ${selected ? "border-[var(--identity-paper-dark-ink)] bg-[var(--identity-paper-dark-ink)] text-[#101B29]" : "border-white/45 text-transparent group-hover:border-white"}`}>
                {selected && <Check aria-hidden="true" className="size-3.5" />}
              </span>
              <span>
                <span className={`block text-sm font-semibold leading-6 transition-colors motion-reduce:transition-none ${selected ? "text-white" : "text-white/75 group-hover:text-white"}`}>{choice.label}</span>
                <span className="mt-1 block text-base leading-7 text-white/60">{choice.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      {decision && <p role="status" aria-live="polite" className="mt-5 min-h-7 border-l-2 border-[var(--identity-paper-dark-ink)] pl-4 text-base leading-7 text-white/75">Next step selected for this scenario.</p>}
    </motion.div>
  );
}

function ChapterScene({ chapter, reduceMotion }: { chapter: ChapterId; reduceMotion: boolean }) {
  switch (chapter) {
    case "signal":
      return <SignalScene reduceMotion={reduceMotion} />;
    case "connection":
      return <ConnectionScene reduceMotion={reduceMotion} />;
    case "evidence":
      return <EvidenceScene reduceMotion={reduceMotion} />;
    case "decision":
      return <DecisionScene reduceMotion={reduceMotion} />;
  }
}

export function QaJourney() {
  const [activeChapter, setActiveChapter] = useState<ChapterId>("signal");
  const [sceneHeight, setSceneHeight] = useState(0);
  const sceneMeasureRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotionPreference();
  const chapterIndex = chapters.findIndex((chapter) => chapter.id === activeChapter);
  const active = chapters[chapterIndex];

  useEffect(() => {
    const scene = sceneMeasureRef.current;
    if (!scene) return;

    const updateHeight = () => {
      const nextHeight = Math.ceil(scene.getBoundingClientRect().height);
      if (nextHeight > 0) setSceneHeight((current) => current === nextHeight ? current : nextHeight);
    };
    const observer = new ResizeObserver(updateHeight);
    observer.observe(scene);
    updateHeight();

    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:px-8">
      <header className="grid items-end gap-6 pb-10 sm:pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.72fr)] lg:gap-20">
        <h2 id="qa-motion-heading" className="max-w-4xl font-display text-4xl font-semibold leading-[1.09] tracking-[-0.045em] text-foreground sm:text-6xl">
          A success message is only the start of the story.
        </h2>
        <p className="max-w-xl text-base leading-8 text-muted-foreground lg:pb-1">
          Follow one profile update from the first signal to a defensible next step. Move through the evidence; leave the cause open until it is proven.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="QA investigation chapters" className="min-w-0 lg:pt-2">
          <ol className="grid grid-cols-2 gap-x-2 gap-y-1 min-[360px]:grid-cols-4 lg:grid-cols-1 lg:gap-2">
            {chapters.map((chapter, index) => {
              const selected = chapter.id === activeChapter;
              const reached = index <= chapterIndex;
              return (
                <li key={chapter.id} className="min-w-0">
                  <button
                    type="button"
                    aria-current={selected ? "step" : undefined}
                    onClick={() => setActiveChapter(chapter.id)}
                    className={`group relative flex min-h-[58px] w-full min-w-0 cursor-pointer flex-col items-start justify-center gap-1 rounded-sm px-2 text-left transition-colors duration-200 hover:bg-foreground/5 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-[360px]:min-h-[64px] lg:min-h-[58px] lg:flex-row lg:items-center lg:gap-4 lg:px-3 ${selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <span aria-hidden="true" className={`absolute bottom-1 left-2 right-2 h-px rounded-full bg-coral transition-opacity duration-200 motion-reduce:transition-none lg:bottom-2 lg:left-0 lg:right-auto lg:top-2 lg:h-auto lg:w-0.5 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`} />
                    <span className={`font-mono text-[10px] tracking-[0.12em] ${reached ? "text-coral" : "text-muted-foreground"}`}>0{index + 1}</span>
                    <span className={`text-xs font-semibold sm:text-sm ${selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{chapter.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 hidden text-xs leading-5 text-muted-foreground lg:block">Select a chapter or follow the evidence in order.</p>
        </nav>

        <div className="min-w-0">
          <div
            data-qa-canvas
            className="border border-border/60 bg-[#101B29] text-white"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)", backgroundSize: "48px 48px" }}
          >
            <div className="flex min-h-12 items-center justify-between gap-4 border-b border-white/15 px-6 py-3 sm:px-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/65 sm:text-xs">Profile persistence / evidence trail</p>
              <p className="shrink-0 font-mono text-[10px] tracking-[0.12em] text-[var(--identity-paper-dark-ink)]">0{chapterIndex + 1} / 04</p>
            </div>
            <div aria-live="polite" aria-atomic="true" className="sr-only">{active.title}</div>
            <motion.div
              animate={{ height: sceneHeight || "auto" }}
              transition={reduceMotion ? { duration: 0 } : { height: { ...sceneTransition, duration: 0.26 } }}
              className="overflow-hidden"
            >
              <div ref={sceneMeasureRef}>
                <AnimatePresence mode="wait" initial={false}>
                  <ChapterScene key={activeChapter} chapter={activeChapter} reduceMotion={reduceMotion} />
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
            Conceptual example only — this local simulation represents no client project or real test result.
          </p>

          <div className="mt-5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setActiveChapter(chapters[Math.max(0, chapterIndex - 1)].id)}
              disabled={chapterIndex === 0}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none ${sectionFocusClass}`}
            >
              <span aria-hidden="true" className="rotate-180"><ArrowRight className="size-4" /></span>
              Previous
            </button>
            <button
              type="button"
              onClick={() => setActiveChapter(chapters[Math.min(chapters.length - 1, chapterIndex + 1)].id)}
              disabled={chapterIndex === chapters.length - 1}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-coral disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none ${sectionFocusClass}`}
            >
              Continue <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
