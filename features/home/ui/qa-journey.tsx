"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useIsPresent,
  type Variants,
} from "motion/react";
import { useReducedMotionPreference } from "@/components/motion/use-reduced-motion";

const stages = [
  {
    id: "signal",
    label: "Signal",
    title: "It said saved. It wasn't.",
    summary: "The success message and the name shown after reload can disagree.",
  },
  {
    id: "connection",
    label: "Connection",
    title: "Follow the path of the change.",
    summary: "Trace each handoff before deciding where the change was lost.",
  },
  {
    id: "evidence",
    label: "Evidence",
    title: "Turn suspicion into proof.",
    summary: "Reproduce the mismatch, then compare the value after reload.",
  },
  {
    id: "decision",
    label: "Decision",
    title: "Evidence changes the decision.",
    summary: "Use what was observed to choose a proportionate next step.",
  },
] as const;

type StageId = (typeof stages)[number]["id"];
type Direction = 1 | -1;
type MotionSettings = { direction: Direction; reduceMotion: boolean };

const sceneVariants: Variants = {
  enter: ({ direction, reduceMotion }: MotionSettings) => ({
    x: reduceMotion ? 0 : `${direction * 100}%`,
    opacity: reduceMotion ? 1 : 0.35,
  }),
  center: { x: 0, opacity: 1 },
  exit: ({ direction, reduceMotion }: MotionSettings) => ({
    x: reduceMotion ? 0 : `${direction * -100}%`,
    opacity: reduceMotion ? 1 : 0.35,
    transition: reduceMotion
      ? { duration: 0 }
      : { x: { duration: 0.38, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.3, ease: "easeIn" } },
  }),
};

const artifactLabelClass = "font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:text-[10px]";
const detailLabelClass = "font-mono text-[9px] uppercase tracking-[0.11em] text-muted-foreground sm:text-[10px]";
const artifactBodyClass = "text-[13px] leading-[1.62] text-muted-foreground sm:text-[15px] sm:leading-[1.7]";
const artifactValueClass = "mt-1 block font-display text-[18px] font-medium leading-[1.3] text-foreground sm:text-[20px]";
const actionClass = "inline-flex min-h-11 cursor-pointer items-center gap-2 border-b border-border py-2 text-left text-[13px] font-semibold text-foreground transition-colors hover:border-coral hover:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:border-border disabled:hover:text-muted-foreground motion-reduce:transition-none sm:text-sm";
const actionEase = [0.22, 1, 0.36, 1] as const;

function AnimatedText({
  value,
  reduceMotion,
  className = "inline-block",
}: {
  value: string;
  reduceMotion: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={value}
        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: actionEase }}
        className={className}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

const artifactLayoutTransition = { layout: { duration: 0.24, ease: actionEase } };

function ArtifactFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-h-[290px] w-full min-w-0 border-y border-border py-5 sm:min-h-[270px] sm:py-6">
      <p className={artifactLabelClass}>{label}</p>
      <div className="mt-5 sm:mt-6">{children}</div>
    </div>
  );
}

function SignalArtifact() {
  const observedName = "Nadia Putri";
  const [name, setName] = useState("Maya Putri");
  const [savedName, setSavedName] = useState("Maya Putri");
  const [saved, setSaved] = useState(true);
  const [reloaded, setReloaded] = useState(false);
  const mismatch = reloaded && savedName !== observedName;
  const reduceMotion = useReducedMotionPreference();

  return (
    <ArtifactFrame label="01 / Profile snapshot - local simulation">
      <motion.div layout={!reduceMotion} transition={artifactLayoutTransition} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <form className="min-w-0 flex-1" onSubmit={(event) => { event.preventDefault(); setSavedName(name.trim()); setSaved(true); setReloaded(false); }}>
          <label htmlFor="qa-profile-name" className={detailLabelClass}>Profile name - local simulation</label>
          <input id="qa-profile-name" value={name} maxLength={48} required onChange={(event) => { setName(event.target.value); setSaved(false); setReloaded(false); }} className="mt-2 block min-h-11 w-full max-w-sm border-b border-border bg-transparent py-2 font-display text-[18px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
          <button type="submit" className="mt-3 inline-flex min-h-11 items-center rounded-[10px] bg-coral px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">Save profile</button>
        </form>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-end">
          <motion.span layout={!reduceMotion} className="min-w-[22ch] font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-coral sm:text-[10px]">
            <AnimatedText value={reloaded ? mismatch ? "Previous name returned" : "Profile reloaded" : saved ? "Profile saved" : "Edits are not saved"} reduceMotion={reduceMotion} />
          </motion.span>
          <button type="button" onClick={() => setReloaded(true)} disabled={reloaded} className={actionClass}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            <AnimatedText value={reloaded ? "Reloaded" : "Reload profile"} reduceMotion={reduceMotion} />
          </button>
        </div>
      </motion.div>
      <motion.div layout={!reduceMotion} transition={artifactLayoutTransition} className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:mt-6 sm:gap-6">
        <div className="min-w-0">
          <span className={detailLabelClass}>After reload - observed</span>
          <strong className={`${artifactValueClass} ${mismatch ? "text-coral" : reloaded ? "text-primary" : "text-muted-foreground"}`}>
            <AnimatedText value={reloaded ? observedName : "Not checked"} reduceMotion={reduceMotion} />
          </strong>
        </div>
        <div className="min-w-0">
          <span className={detailLabelClass}>Expected value</span>
          <strong className={artifactValueClass}><AnimatedText value={savedName} reduceMotion={reduceMotion} /></strong>
        </div>
      </motion.div>
      <motion.div layout={!reduceMotion} transition={artifactLayoutTransition} role="status" aria-live="polite" className={`mt-4 border-t border-border pt-3 ${artifactBodyClass} sm:mt-5`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={mismatch ? "mismatch" : reloaded ? "match" : "awaiting-evidence"}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: actionEase }}
          >
            {mismatch
              ? "Mismatch - the earlier profile name is still shown. This simulation does not change an account."
              : reloaded
                ? "Match - the saved value is visible after reload in this local simulation."
                : "A confirmation is feedback; persistence still needs evidence."}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </ArtifactFrame>
  );
}

const traceNodes = [
  {
    label: "User action",
    question: "Which new name did the user submit?",
    note: "Confirm the intended value before tracing the handoff.",
  },
  {
    label: "Frontend",
    question: "Was success shown before stored data was confirmed?",
    note: "An optimistic interface state is a hypothesis, not a finding.",
  },
  {
    label: "API",
    question: "Did the write operation receive an acknowledgement?",
    note: "Check what the operation reported; do not infer the result.",
  },
  {
    label: "Data persistence",
    question: "Was the updated name actually stored?",
    note: "Verify the stored value independently after the write.",
  },
] as const;

function ConnectionArtifact() {
  const [selectedNode, setSelectedNode] = useState(1);
  const reduceMotion = useReducedMotionPreference();
  const selected = traceNodes[selectedNode];

  return (
    <ArtifactFrame label="02 / Follow the handoff - questions are hypotheses">
      <ol aria-label="Investigation path from user action to data persistence" className="grid grid-cols-1 gap-1 sm:grid-cols-4 sm:gap-0">
        {traceNodes.map((node, index) => {
          const isSelected = selectedNode === index;
          return (
            <li key={node.label} className={`relative min-w-0 border-l pl-3 sm:border-l-0 sm:pl-0 ${isSelected ? "border-coral" : "border-border"}`}>
              {index < traceNodes.length - 1 && (
                <span aria-hidden="true" className="absolute left-1/2 top-[13px] hidden h-px w-full overflow-hidden bg-border sm:block">
                  <motion.span initial={false} animate={{ scaleX: index < selectedNode ? 1 : 0 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: actionEase }} className="block h-full origin-left bg-coral" />
                </span>
              )}
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedNode(index)}
                className={`group relative z-[1] flex min-h-11 w-full cursor-pointer items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-[76px] sm:flex-col sm:items-center sm:gap-2 sm:text-center`}
              >
                <span className={`grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full border bg-background font-mono text-[9px] transition-colors duration-150 motion-reduce:transition-none sm:text-[10px] ${isSelected ? "border-coral text-coral" : "border-border text-muted-foreground group-hover:border-foreground group-hover:text-foreground"}`}>
                  0{index + 1}
                </span>
                <span className={`text-[13px] font-medium leading-snug transition-colors duration-150 motion-reduce:transition-none sm:text-sm ${isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                  {node.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <motion.div layout={!reduceMotion} transition={artifactLayoutTransition} aria-live="polite" className="mt-4 min-h-[74px] border-t border-border pt-3 sm:mt-5 sm:min-h-[70px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={selectedNode} initial={reduceMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: actionEase }}>
            <p className={detailLabelClass}>Investigation question - hypothesis only</p>
            <p className="mt-1 font-display text-[16px] font-medium leading-[1.35] text-foreground sm:text-[18px]">{selected.question}</p>
            <p className={`mt-1 ${artifactBodyClass}`}>{selected.note}</p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <p className={`mt-3 border-t border-border pt-3 ${artifactBodyClass} sm:mt-4`}>
        Trace the relationship - keep the cause open until evidence narrows it.
      </p>
    </ArtifactFrame>
  );
}

const verificationSteps = ["Save", "Reload", "Compare", "Result"] as const;

function EvidenceArtifact() {
  const [step, setStep] = useState(-1);
  const reduceMotion = useReducedMotionPreference();
  const isRunning = step >= 0 && step < verificationSteps.length - 1;
  const hasResult = step === verificationSteps.length - 1;
  const observed = step >= 2;

  useEffect(() => {
    if (!isRunning) return;
    if (reduceMotion) {
      queueMicrotask(() => setStep((current) => current >= 0 && current < verificationSteps.length - 1 ? verificationSteps.length - 1 : current));
      return;
    }
    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(current + 1, verificationSteps.length - 1));
    }, 210);
    return () => window.clearTimeout(timer);
  }, [isRunning, reduceMotion, step]);

  function runVerification() {
    if (isRunning) return;
    setStep(reduceMotion ? verificationSteps.length - 1 : 0);
  }

  return (
    <ArtifactFrame label="03 / Expected against observed - simulated verification">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] sm:items-start sm:gap-5">
        <div className="min-w-0">
          <span className={detailLabelClass}>Expected after reload</span>
          <strong className={artifactValueClass}>Maya Putri</strong>
        </div>
        <div aria-hidden="true" className="h-px w-full bg-border sm:h-[58px] sm:w-px" />
        <div className="min-w-0">
          <span className={detailLabelClass}>Observed after reload</span>
          <strong className={`${artifactValueClass} ${observed ? "text-coral" : "text-muted-foreground"}`}>
            <AnimatedText value={observed ? "Nadia Putri" : "Not checked"} reduceMotion={reduceMotion} />
          </strong>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">
        <ol aria-label="Simulated verification steps" className="flex flex-wrap items-center gap-x-1 font-mono text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">
          {verificationSteps.map((name, index) => (
            <li key={name} className="flex items-center gap-1">
              <span aria-current={step === index ? "step" : undefined} className={`transition-colors duration-150 motion-reduce:transition-none ${step === index ? "font-semibold text-coral" : step > index ? "text-foreground" : "text-muted-foreground"}`}>{name}</span>
              {index < verificationSteps.length - 1 && <ArrowRight aria-hidden="true" className="h-3 w-3 text-muted-foreground" />}
            </li>
          ))}
        </ol>
        <button type="button" onClick={runVerification} disabled={isRunning} aria-busy={isRunning} className={actionClass}>
          {isRunning ? "Simulating verification" : hasResult ? "Run verification again" : "Run verification"}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <motion.div layout={!reduceMotion} transition={artifactLayoutTransition} role="status" aria-live="polite" aria-atomic="true" className={`mt-3 min-h-[34px] border-t border-border pt-3 ${artifactBodyClass} sm:mt-4`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={hasResult ? "result" : "idle"} initial={reduceMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: actionEase }}>
            {hasResult ? <><span className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-coral sm:text-[10px]">Assertion failed - simulated</span><br />Expected Maya Putri; observed Nadia Putri after reload.</> : "Simulated only - this interaction does not call a backend or run a production test suite."}
          </motion.p>
        </AnimatePresence>
      </motion.div>
      <motion.div layout={!reduceMotion} transition={artifactLayoutTransition} className={`mt-3 ${artifactBodyClass} sm:mt-4`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={hasResult ? "evidence-result" : "evidence-idle"} initial={reduceMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: actionEase }}>
            {hasResult ? "Evidence confirms a mismatch in this example; it does not establish the cause." : "A reproducible comparison makes the mismatch reviewable."}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </ArtifactFrame>
  );
}

const assessment = [
  { label: "Observed failure", text: "The previous name returned after reload." },
  { label: "Potential impact", text: "A user may repeat a change they believe was saved." },
  { label: "Still unresolved", text: "The evidence does not locate where the write failed." },
  { label: "Next action", text: "Trace the write before attributing a cause." },
  { label: "Retest", text: "Save the new name, reload, and assert it persists." },
] as const;

function DecisionArtifact() {
  const [revealed, setRevealed] = useState(false);
  const reduceMotion = useReducedMotionPreference();

  return (
    <ArtifactFrame label="04 / Quality assessment - illustrative scope">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 sm:gap-y-4">
        {assessment.map((item) => (
          <div key={item.label} className="min-w-0 border-t border-border pt-2 first:border-0 first:pt-0 sm:first:border-t sm:first:pt-2">
            <dt className={detailLabelClass}>{item.label}</dt>
            <dd className={`mt-1 ${artifactBodyClass} text-foreground`}>{item.text}</dd>
          </div>
        ))}
      </dl>
      <motion.div layout={!reduceMotion} transition={artifactLayoutTransition} className="mt-4 border-t border-border pt-3 sm:mt-5 sm:pt-4">
        <button type="button" aria-expanded={revealed} onClick={() => setRevealed((value) => !value)} className={actionClass}>
          {revealed ? "Hide assessment" : "Reveal assessment"}
          <ArrowRight aria-hidden="true" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${revealed ? "rotate-90" : ""}`} />
        </button>
        <AnimatePresence initial={false}>
          {revealed && (
            <motion.p key="assessment-recommendation" role="status" aria-live="polite" initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: actionEase }} className="mt-3 max-w-[58ch] font-display text-[16px] font-medium leading-[1.4] text-foreground sm:text-[18px]">
              Do not mark this profile-save flow verified until the issue is resolved and regression checks pass.
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </ArtifactFrame>
  );
}

function Artifact({ id }: { id: StageId }) {
  if (id === "signal") return <SignalArtifact />;
  if (id === "connection") return <ConnectionArtifact />;
  if (id === "evidence") return <EvidenceArtifact />;
  return <DecisionArtifact />;
}

function SlidingScene({ stage, index, direction, reduceMotion }: { stage: (typeof stages)[number]; index: number; direction: Direction; reduceMotion: boolean }) {
  const isPresent = useIsPresent();
  return (
    <motion.article aria-hidden={!isPresent} inert={!isPresent} custom={{ direction, reduceMotion }} variants={sceneVariants} initial="enter" animate="center" exit="exit"
      transition={reduceMotion ? { duration: 0 } : { x: { duration: 0.38, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.3, ease: "easeOut" }}}
      className="col-start-1 row-start-1 grid min-w-0 items-center gap-6 py-3 sm:gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-[clamp(44px,7vw,104px)]">
      <div className="order-2 max-w-[410px] lg:order-1">
        <div className="mb-3 flex items-center gap-3 sm:mb-[17px]">
          <span className="font-mono text-xs tracking-[0.12em] text-coral">0{index + 1}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{stage.label}</span>
        </div>
        <h3 className="font-display text-[30px] font-semibold leading-[1.06] tracking-[-0.045em] text-foreground sm:text-[clamp(31px,3.2vw,43px)] sm:leading-[1.05]">{stage.title}</h3>
        <p className="mt-3 max-w-[39ch] text-[13px] leading-[1.62] text-muted-foreground sm:mt-5 sm:text-[15px] sm:leading-[1.75]">{stage.summary}</p>
      </div>
      <div className="order-1 min-w-0 lg:order-2"><Artifact id={stage.id} /></div>
    </motion.article>
  );
}

export function QaJourney() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>(1);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reduceMotion = useReducedMotionPreference();
  const activeStage = stages[activeIndex];

  function navigateTo(index: number) {
    if (index < 0 || index >= stages.length || index === activeIndex) return;
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = Math.min(currentIndex + 1, stages.length - 1);
    else if (event.key === "ArrowLeft") nextIndex = Math.max(currentIndex - 1, 0);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = stages.length - 1;
    else return;
    event.preventDefault();
    navigateTo(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="mx-auto flex min-h-[100svh] w-[calc(100%-2.5rem)] max-w-[1280px] flex-col pb-7 pt-[18px] sm:w-[calc(100%-3.5rem)] sm:py-7 xl:w-[calc(100%-7rem)]">
      <div className="flex h-[38px] shrink-0 items-center border-b border-border pb-[13px] font-display text-[11px] font-semibold tracking-[0.04em] text-foreground sm:h-11 sm:pb-[17px] sm:text-xs">
        SIGNAL TRACE <span className="ml-2 font-mono text-[8px] font-normal uppercase tracking-[0.1em] text-muted-foreground sm:text-[10px] sm:tracking-[0.11em]">/ Kinetic editorial</span>
      </div>
      <header className="grid grid-cols-1 items-end gap-4 pb-8 pt-9 sm:grid-cols-[minmax(0,8fr)_minmax(210px,3fr)] sm:gap-7 sm:pb-[38px] sm:pt-[54px] lg:gap-[52px]">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.17em] text-coral sm:text-[10px]">An interactive QA investigation</p>
          <h2 id="qa-motion-heading" className="mt-3 max-w-[880px] font-display text-[clamp(37px,10vw,43px)] font-semibold leading-[1.02] tracking-[-0.05em] text-foreground sm:text-[clamp(46px,5.3vw,74px)] sm:leading-[.99] sm:tracking-[-0.055em]">A profile says saved.<br className="hidden sm:block" /> Reload says otherwise.</h2>
        </div>
        <p className="max-w-[300px] border-l border-border pl-3 text-xs leading-[1.55] text-muted-foreground sm:mb-[5px] sm:pl-[18px] sm:text-sm sm:leading-[1.7]">
          <span className="mb-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.17em] text-coral sm:mb-2 sm:text-[10px]">Illustrative profile update</span>
          A user changes their profile name. The interface confirms it was saved; after reload, the previous name remains.
        </p>
      </header>
      <div className="flex flex-col border-y border-border sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <LayoutGroup id="qa-motion-chapter-tabs">
          <div role="tablist" aria-label="Signal Trace chapters" aria-orientation="horizontal" onPointerLeave={() => setHoveredIndex(null)} className="grid h-[53px] w-full grid-cols-4 sm:h-[62px] sm:max-w-[740px]">
            {stages.map((stage, index) => {
              const selected = index === activeIndex;
              return (
                <button key={stage.id} ref={(node) => { tabRefs.current[index] = node; }} type="button" role="tab" id={`qa-motion-tab-${stage.id}`} aria-controls="qa-motion-panel" aria-selected={selected} tabIndex={selected ? 0 : -1} onPointerEnter={(event) => { if (event.pointerType !== "touch") setHoveredIndex(index); }} onClick={() => navigateTo(index)} onKeyDown={(event) => handleTabKeyDown(event, index)} className={`qa-chapter relative flex min-h-11 cursor-pointer items-center gap-1 px-[2px] text-left font-mono text-[9px] uppercase tracking-[0.01em] transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-[62px] sm:gap-[10px] sm:px-4 sm:text-[11px] sm:tracking-[0.07em] sm:first:pl-0 motion-reduce:transition-none ${selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <span className="text-[8px] text-coral sm:text-[10px]">0{index + 1}</span><span>{stage.label}</span>
                  {hoveredIndex === index && <motion.span layoutId="qa-motion-hover-indicator" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: selected ? 0 : 1 }} transition={{ layout: reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: reduceMotion ? 0 : 0.16, ease: "easeOut" } }} className="absolute inset-x-0 -bottom-px h-px bg-foreground/55 sm:right-4 sm:left-0" />}
                  {selected && <motion.span layoutId="qa-motion-active-indicator" aria-hidden="true" initial={false} transition={{ layout: reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }} className="absolute inset-x-0 -bottom-px h-0.5 bg-coral sm:right-4 sm:left-0" />}
                </button>
              );
            })}
          </div>
          <p className="pb-2 text-[10px] text-muted-foreground sm:pb-0 sm:text-xs">Select a chapter or follow the trace.</p>
        </LayoutGroup>
      </div>
      <div className="mt-6 min-h-0 flex-1 sm:mt-[42px]">
        <motion.div layout={!reduceMotion} transition={reduceMotion ? { duration: 0 } : { duration: 0.36, ease: [0.22, 1, 0.36, 1] }} className="relative overflow-hidden">
          <div id="qa-motion-panel" role="tabpanel" aria-labelledby={`qa-motion-tab-${activeStage.id}`} tabIndex={0} className="grid min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <AnimatePresence initial={false} mode="sync" custom={{ direction, reduceMotion }}>
              <SlidingScene key={activeStage.id} stage={activeStage} index={activeIndex} direction={direction} reduceMotion={reduceMotion} />
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
      <div className="mt-5 grid grid-cols-2 items-center gap-x-2 border-t border-border pt-3 sm:mt-[31px] sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:pt-4">
        <button type="button" onClick={() => navigateTo(activeIndex - 1)} disabled={activeIndex === 0} className="group flex min-h-11 cursor-pointer items-center gap-[7px] text-left disabled:cursor-not-allowed disabled:opacity-40 sm:gap-[11px]">
          <ArrowLeft aria-hidden="true" className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:-translate-x-1 motion-reduce:transition-none" />
          <span><small className="mb-[3px] block font-mono text-[8px] uppercase tracking-[0.11em] text-muted-foreground sm:text-[9px]">Previous chapter</small><strong className="block font-display text-xs font-medium text-foreground sm:text-[13px]">{activeIndex ? stages[activeIndex - 1].label : "Start of trace"}</strong></span>
        </button>
        <p className="col-span-2 row-start-1 mb-2 font-mono text-[9px] tracking-[0.1em] text-muted-foreground sm:col-span-1 sm:row-auto sm:mb-0 sm:text-center sm:text-[10px]">0{activeIndex + 1} / 04</p>
        <button type="button" onClick={() => navigateTo(activeIndex + 1)} disabled={activeIndex === stages.length - 1} className="group col-start-2 row-start-2 flex min-h-11 cursor-pointer items-center justify-self-end gap-[7px] text-right disabled:cursor-not-allowed disabled:opacity-40 sm:col-start-auto sm:row-auto sm:gap-[11px]">
          <span><small className="mb-[3px] block font-mono text-[8px] uppercase tracking-[0.11em] text-muted-foreground sm:text-[9px]">Continue to</small><strong className="block font-display text-xs font-medium text-foreground sm:text-[13px]">{activeIndex < stages.length - 1 ? stages[activeIndex + 1].label : "Trace complete"}</strong></span>
          <ArrowRight aria-hidden="true" className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
        </button>
      </div>
      <p className="mt-4 font-mono text-[8px] tracking-[0.04em] text-muted-foreground sm:mt-6 sm:text-[10px]">Conceptual example only - no client project or real test result is represented.</p>
    </div>
  );
}
