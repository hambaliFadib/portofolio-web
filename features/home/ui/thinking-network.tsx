"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownRight, Focus, RotateCcw } from "lucide-react";
import {
  decisionPatternsSection,
  decisionPrinciplesSection,
  problemBreakdownSection,
  riskThinkingModelSection,
} from "@/data/thinking";

type NetworkScene = {
  focus: (id: string) => void;
  reset: () => void;
  select: (id: string | null) => void;
  dispose: () => void;
};

const principles = decisionPrinciplesSection.items;
const breakdown = problemBreakdownSection.items;
const riskFactors = riskThinkingModelSection.items;
const releasePatterns = decisionPatternsSection.items;

const concepts = [
  {
    id: "business",
    title: "Business Understanding",
    summary: breakdown[0].description,
    detail: "Start by naming the outcome and invariant that must remain true. That gives every later test a purpose.",
    color: "coral",
  },
  {
    id: "problem",
    title: "Problem Breakdown",
    summary: `${breakdown[1].description} ${breakdown[2].description}`,
    detail: "Trace intent through system behavior, failure paths, and dependencies before choosing what to validate.",
    color: "cobalt",
  },
  {
    id: "risk",
    title: "Risk Analysis",
    summary: riskThinkingModelSection.description ?? "Explore the four dimensions that shape risk.",
    detail: "Risk becomes clearer when uncertainty, impact, dependency, and detectability are considered together.",
    color: "coral",
  },
  {
    id: "evidence",
    title: "Evidence & Validation",
    summary: principles[0].description,
    detail: "System behavior is evidence. Business validation checks whether the outcome and its invariants are correct.",
    color: "mint",
  },
  {
    id: "decision",
    title: "Decision Making",
    summary: principles[3].description,
    detail: "Use the evidence to decide whether to release, accept a bounded trade-off, or escalate uncertainty.",
    color: "lime",
  },
] as const;

const conceptById = new Map<string, (typeof concepts)[number]>(concepts.map((concept) => [concept.id, concept]));
const conceptColorClasses: Record<(typeof concepts)[number]["color"], string> = {
  coral: "bg-coral",
  cobalt: "bg-cobalt",
  mint: "bg-mint",
  lime: "bg-lime",
};

export function ThinkingNetwork() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<NetworkScene | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const selectConcept = useCallback((id: string) => {
    setSelectedId(id);
    sceneRef.current?.select(id);
    if (sceneReady) sceneRef.current?.focus(id);
  }, [sceneReady]);

  const resetView = useCallback(() => {
    setSelectedId(null);
    sceneRef.current?.select(null);
    sceneRef.current?.reset();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let scene: NetworkScene | undefined;
    let loadStarted = false;
    const loadScene = async () => {
      if (loadStarted || disposed) return;
      loadStarted = true;
      try {
        const { mountThinkingNetwork } = await import("./thinking-anatomical-scene");
        if (disposed) return;
        scene = mountThinkingNetwork(host, (id) => {
          setSelectedId(id);
          sceneRef.current?.select(id);
          if (id) sceneRef.current?.focus(id);
        }, setHoveredId, () => setSceneReady(true), () => setWebglAvailable(false));
        sceneRef.current = scene;
      } catch {
        setWebglAvailable(false);
      }
    };

    if (typeof IntersectionObserver === "undefined") {
      void loadScene();
    } else {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void loadScene();
        }
      }, { rootMargin: "160px" });
      observer.observe(host);
    }

    return () => {
      disposed = true;
      scene?.dispose();
      sceneRef.current = null;
    };
    // The scene is mounted once; pending selection is replayed when the model is ready.
  }, []);

  useEffect(() => {
    if (!sceneReady) return;
    const selection = selectedIdRef.current;
    sceneRef.current?.select(selection);
    if (selection) sceneRef.current?.focus(selection);
  }, [sceneReady]);

  const selected = selectedId ? conceptById.get(selectedId) : undefined;
  const hovered = hoveredId ? conceptById.get(hoveredId) : undefined;

  return (
    <div className="space-y-8">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)] lg:items-center lg:gap-12">
        <div className="relative min-w-0">
          <div
            ref={hostRef}
            aria-hidden="true"
            className="relative h-[19rem] overflow-hidden rounded-[1.75rem] sm:h-[25rem] lg:h-[32rem]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,color-mix(in_srgb,var(--color-cobalt)_11%,transparent),transparent_66%)]" />
            <span className={`pointer-events-none absolute left-5 top-5 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground transition-opacity ${hovered ? "opacity-100" : "opacity-0"}`}>
              {hovered ? hovered.title : ""}
            </span>
          </div>
          {!webglAvailable && (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              3D is unavailable in this browser. Explore every concept from the list below.
            </p>
          )}
          {!sceneReady && webglAvailable && (
            <p className="sr-only" role="status">Preparing the concept network visualization.</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => selectedId ? sceneRef.current?.focus(selectedId) : sceneRef.current?.reset()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label={selectedId ? "Focus the selected concept" : "Focus the full network"}
            >
              <Focus aria-hidden="true" className="h-4 w-4 text-coral" />
              Focus
            </button>
            <button
              type="button"
              onClick={resetView}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Reset view and concept selection"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Reset view
            </button>
            <span className="ml-auto hidden text-xs text-muted-foreground md:inline">Drag to rotate · right-drag to pan · scroll to zoom</span>
            <span className="ml-auto text-xs text-muted-foreground md:hidden">Drag to rotate · two-finger pan and zoom</span>
          </div>
        </div>

        <aside aria-live="polite" aria-atomic="true" className="min-h-48 lg:pl-2">
          {selected ? (
            <div key={selected.id}>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Selected concept</p>
              <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                {selected.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{selected.summary}</p>
              <p className="mt-3 text-sm leading-7 text-foreground">{selected.detail}</p>
              {selected.id === "risk" && (
                <div className="mt-5 space-y-3">
                  {riskFactors.map((factor) => (
                    <div key={factor.id} className="border-l border-coral/70 pl-3">
                      <h4 className="text-sm font-semibold text-foreground">{factor.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{factor.description}</p>
                    </div>
                  ))}
                  <p className="pt-1 text-xs leading-5 text-muted-foreground">
                    A conceptual illustration of the reasoning model, not a client case report.
                  </p>
                </div>
              )}
              {selected.id === "decision" && (
                <div className="mt-5 space-y-3">
                  {releasePatterns.slice(0, 3).map((pattern) => (
                    <p key={pattern.id} className="text-sm leading-6 text-muted-foreground">
                      <span className="font-semibold text-foreground">{pattern.title}:</span> {pattern.points[0]}.
                    </p>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={resetView}
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground underline decoration-coral underline-offset-4 hover:text-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Back to the network <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">How I Think</p>
              <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                From intent to decision.
              </h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Select a region to explore how business understanding, problem breakdown, risk, evidence, and decisions connect.
              </p>
            </div>
          )}
        </aside>
      </div>

      <nav aria-label="Explore thinking concepts" className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-5">
        {concepts.map((concept, index) => {
          const active = concept.id === selectedId;
          return (
            <button
              key={concept.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectConcept(concept.id)}
              className={`group flex min-h-14 items-center gap-3 border-t py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active ? "border-coral text-foreground" : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"}`}
            >
              <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${conceptColorClasses[concept.color]} ${active ? "ring-4 ring-coral/15" : "opacity-70 group-hover:opacity-100"}`} />
              <span className="min-w-0">
                <span className="block font-mono text-[0.65rem] uppercase tracking-[0.16em]">0{index + 1}</span>
                <span className="mt-1 block text-sm font-semibold leading-5">{concept.title}</span>
              </span>
            </button>
          );
        })}
      </nav>
      <p className="text-xs leading-5 text-muted-foreground">
        Brain, Female, 3DPX-020959, Human Reference Atlas (HRA), v1.3, CC BY 4.0. {" "}
        <a
          href="/models/HRA-Brain-Attribution.md"
          className="underline decoration-coral underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Source and modification details
        </a>
      </p>
      <p className="sr-only" aria-live="polite">
        {hovered ? `${hovered.title} region. Activate to select.` : selected ? `${selected.title} selected.` : "No concept selected. The full network is shown."}
      </p>
    </div>
  );
}
