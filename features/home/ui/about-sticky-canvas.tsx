"use client";

import { AnimatePresence, motion, type MotionValue } from "motion/react";

type CanvasNode = { label: string; x: number; y: number; width?: number };
type CanvasScene = {
  key: string; title: string; caption: string; center: string;
  nodes: CanvasNode[]; connections: string[]; description: string;
};

const scenes: CanvasScene[] = [
  {
    key: "data-processing",
    title: "Operational accuracy",
    caption: "Records, inventory, and warehouse operations must agree.",
    center: "ACCURACY",
    nodes: [
      { label: "PRODUCTION DATA", x: 42, y: 108 },
      { label: "INVENTORY", x: 42, y: 298 },
      { label: "WAREHOUSE", x: 446, y: 108 },
      { label: "VALIDATION", x: 446, y: 298 },
    ],
    connections: [
      "M 192 136 C 230 136 244 189 267 211",
      "M 192 326 C 230 326 244 273 267 251",
      "M 373 211 C 398 189 410 136 446 136",
      "M 373 251 C 398 273 410 326 446 326",
    ],
    description: "Production data, physical inventory, warehouse operations, and validation converge on accuracy.",
  },
  {
    key: "technical-support",
    title: "Systems beneath the interface",
    caption: "Infrastructure health and logs reveal reliability risks.",
    center: "RELIABILITY",
    nodes: [
      { label: "STORAGE", x: 42, y: 108 },
      { label: "MONITORING", x: 42, y: 298 },
      { label: "NETWORK", x: 446, y: 108 },
      { label: "LOG ANALYSIS", x: 446, y: 298 },
    ],
    connections: [
      "M 192 136 C 230 136 244 189 267 211",
      "M 192 326 C 230 326 244 273 267 251",
      "M 373 211 C 398 189 410 136 446 136",
      "M 373 251 C 398 273 410 326 446 326",
    ],
    description: "Storage, system monitoring, networking, and log analysis contribute to operational reliability.",
  },
  {
    key: "quality-assurance",
    title: "Evidence before release",
    caption: "Business rules, integration, automation, and risk converge at the quality gate.",
    center: "QUALITY GATE",
    nodes: [
      { label: "BUSINESS RULES", x: 42, y: 108 },
      { label: "UI / API", x: 42, y: 298 },
      { label: "INTEGRATION", x: 446, y: 108 },
      { label: "AUTOMATION", x: 446, y: 298 },
    ],
    connections: [
      "M 192 136 C 230 136 244 189 267 211",
      "M 192 326 C 230 326 244 273 267 251",
      "M 373 211 C 398 189 410 136 446 136",
      "M 373 251 C 398 273 410 326 446 326",
    ],
    description: "Quality assurance combines business rules, interface and API checks, integration, and automation under an evidence-based release gate.",
  },
  {
    key: "education",
    title: "Learning foundations",
    caption: "Two educational paths sit in parallel, not on a work timeline.",
    center: "FOUNDATIONS",
    nodes: [
      { label: "INFORMATION SYSTEMS", x: 42, y: 108, width: 206 },
      { label: "NETWORK ENGINEERING", x: 392, y: 108, width: 206 },
    ],
    connections: [
      "M 145 164 C 177 207 235 233 267 238",
      "M 495 164 C 463 207 405 233 373 238",
    ],
    description: "Two educational foundations are shown side by side without implying when they occurred relative to work.",
  },
  {
    key: "personal-note",
    title: "Considered decisions",
    caption: "Several perspectives resolve into one decision point.",
    center: "JUDGEMENT",
    nodes: [
      { label: "EVIDENCE", x: 42, y: 108 },
      { label: "ASSUMPTIONS", x: 42, y: 298 },
      { label: "RISKS", x: 446, y: 108 },
    ],
    connections: [
      "M 192 136 C 230 136 244 189 267 211",
      "M 192 326 C 230 326 244 273 267 251",
      "M 446 136 C 407 152 394 207 373 223",
    ],
    description: "Evidence, assumptions, and risks meet at a considered decision point.",
  },
];

type AboutStickyCanvasProps = {
  activeIndex: number;
  scrollProgress: MotionValue<number> | number;
  reduceMotion: boolean;
  experienceCount: number;
  totalMilestones: number;
};

export function AboutStickyCanvas({ activeIndex, scrollProgress, reduceMotion, experienceCount, totalMilestones }: AboutStickyCanvasProps) {
  const sceneIndex = activeIndex < experienceCount
    ? activeIndex
    : activeIndex < totalMilestones - 1 ? experienceCount : experienceCount + 1;
  const scene = scenes[sceneIndex] ?? scenes[0];
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <aside aria-label="Contextual journey visualization" className="hidden min-w-0 xl:block xl:self-stretch">
      <div className="sticky top-28 pt-1">
        <figure data-about-canvas data-about-canvas-state={scene.key}>
          <figcaption className="mb-5 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h4 className="font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-foreground 2xl:text-3xl">
                {scene.title}
              </h4>
              <p className="mt-2 max-w-[36ch] text-sm leading-6 text-muted-foreground">
                {scene.caption}
              </p>
            </div>
            <span aria-hidden="true" className="shrink-0 pb-1 font-mono text-xs tabular-nums text-muted-foreground">
              {String(activeIndex + 1).padStart(2, "0")} / {String(totalMilestones).padStart(2, "0")}
            </span>
          </figcaption>

          <svg
            aria-hidden="true"
            className="block h-auto w-full overflow-visible"
            viewBox="0 0 640 430"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="20.5" y="20.5" width="599" height="389" stroke="var(--border)" />
            <path d="M 42 388 H 598" stroke="var(--border)" strokeWidth="1" />
            <motion.path
              data-about-canvas-progress
              d="M 42 388 H 598"
              pathLength={1}
              stroke="var(--color-coral)"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ pathLength: scrollProgress }}
            />

            <AnimatePresence initial={false} mode="sync">
              <motion.g
                key={scene.key}
                data-about-canvas-scene={scene.key}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={transition}
              >
              {scene.connections.map((connection, index) => (
                <path
                  key={`${scene.key}-connection-${index}`}
                  d={connection}
                  stroke="var(--color-coral)"
                  strokeWidth="1.25"
                  strokeOpacity="0.78"
                  strokeLinecap="round"
                />
              ))}

              <circle cx="320" cy="232" r="58" fill="var(--background)" stroke="var(--color-coral)" strokeWidth="1.5" />
              <circle cx="320" cy="232" r="45" stroke="var(--border)" strokeWidth="1" />
              <text x="320" y="236" textAnchor="middle" fill="var(--foreground)" className="fill-foreground font-mono text-[11px] font-semibold tracking-[0.12em]">
                {scene.center}
              </text>

              {scene.nodes.map((node) => {
                const width = node.width ?? 150;
                const centerX = node.x + width / 2;
                return (
                  <g key={`${scene.key}-${node.label}`}>
                    <rect
                      x={node.x}
                      y={node.y}
                      width={width}
                      height="56"
                      rx="2"
                      fill="var(--background)"
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                    <circle cx={node.x + 12} cy={node.y + 28} r="2.5" fill="var(--color-coral)" />
                    <text
                      x={centerX + 6}
                      y={node.y + 32}
                      textAnchor="middle"
                      fill="var(--foreground)"
                      className="fill-foreground font-mono text-[10px] font-medium tracking-[0.08em]"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
              </motion.g>
            </AnimatePresence>
          </svg>

          <p className="sr-only">{scene.description}</p>
        </figure>
      </div>
    </aside>
  );
}
