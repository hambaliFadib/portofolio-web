"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  FileSearch,
  LockKeyhole,
  Minus,
  Network,
  Plus,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { MarkedText } from "@/components/marked-text";
import { SectionHeading } from "@/components/portfolio/section-heading";
import { Badge } from "@/components/ui/badge";
import { localizedContent } from "@/data/localized-content";
import { cn } from "@/lib/utils";

const mapWidth = 1160;
const mapHeight = 820;
const childNodeWidth = 320;
const detailNodeLeft = 820;
const detailNodeWidth = 260;
const minMapZoom = 0.5;
const maxMapZoom = 1.24;
const detailFocusZoom = 1.08;
const rootOpenPosition = { x: 58, y: 318, width: 280, height: 230 };
const rootClosedPosition = { x: 390, y: 282, width: 380, height: 258 };
const childNodePositions = [
  { x: 370, y: 34 },
  { x: 500, y: 112 },
  { x: 410, y: 190 },
  { x: 530, y: 268 },
  { x: 410, y: 346 },
  { x: 500, y: 424 },
  { x: 370, y: 502 },
  { x: 520, y: 580 },
] as const;

interface MapPan {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function RealDecisionCasesSection() {
  const { locale } = useLanguage();
  const content = localizedContent[locale].realDecision;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [expandedStepId, setExpandedStepId] = useState("");
  const [expandedCaseId, setExpandedCaseId] = useState("");
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState<MapPan>({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const activeStepIndex = content.structure.findIndex(
    (item) => item.id === expandedStepId,
  );
  const activeStep =
    activeStepIndex >= 0 ? content.structure[activeStepIndex] : null;
  const activePosition =
    activeStepIndex >= 0
      ? childNodePositions[activeStepIndex % childNodePositions.length]
      : null;
  const detailNodeTop = activePosition
    ? clamp(activePosition.y - 28, 28, mapHeight - 190)
    : 0;

  function getViewportRect() {
    return viewportRef.current?.getBoundingClientRect() ?? null;
  }

  function centerRootNode() {
    const rect = getViewportRect();

    if (!rect) {
      return;
    }

    const zoom = clamp(
      Math.min(
        (rect.width - 72) / rootClosedPosition.width,
        (rect.height - 72) / rootClosedPosition.height,
      ),
      0.82,
      1.08,
    );

    setMapZoom(zoom);
    setMapPan({
      x:
        rect.width / 2 -
        (rootClosedPosition.x + rootClosedPosition.width / 2) * zoom,
      y:
        rect.height / 2 -
        (rootClosedPosition.y + rootClosedPosition.height / 2) * zoom,
    });
  }

  function fitMapToViewport() {
    const rect = getViewportRect();

    if (!rect) {
      return;
    }

    const bounds = {
      minX: 40,
      minY: 24,
      maxX: detailNodeLeft + detailNodeWidth + 56,
      maxY: 704,
    };
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const zoom = clamp(
      Math.min((rect.width - 64) / contentWidth, (rect.height - 64) / contentHeight),
      0.56,
      0.92,
    );

    setMapZoom(zoom);
    setMapPan({
      x: (rect.width - contentWidth * zoom) / 2 - bounds.minX * zoom,
      y: (rect.height - contentHeight * zoom) / 2 - bounds.minY * zoom,
    });
  }

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const syncPlacement = () => {
      if (isMapOpen) {
        fitMapToViewport();
        return;
      }

      centerRootNode();
    };

    syncPlacement();

    const resizeObserver = new ResizeObserver(syncPlacement);
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isMapOpen]);

  function toggleMap() {
    setIsMapOpen((current) => {
      const next = !current;

      if (!next) {
        setExpandedStepId("");
        setExpandedCaseId("");
      }

      return next;
    });
  }

  function changeZoom(delta: number) {
    const rect = getViewportRect();
    const nextZoom = clamp(Number((mapZoom + delta).toFixed(2)), minMapZoom, maxMapZoom);

    if (!rect) {
      setMapZoom(nextZoom);
      return;
    }

    zoomAtViewportPoint(nextZoom, rect.width / 2, rect.height / 2);
  }

  function zoomAtViewportPoint(
    nextZoom: number,
    viewportX: number,
    viewportY: number,
  ) {
    const currentZoom = mapZoom || 1;
    const worldX = (viewportX - mapPan.x) / currentZoom;
    const worldY = (viewportY - mapPan.y) / currentZoom;

    setMapZoom(nextZoom);
    setMapPan({
      x: viewportX - worldX * nextZoom,
      y: viewportY - worldY * nextZoom,
    });
  }

  function resetZoom() {
    if (isMapOpen) {
      fitMapToViewport();
      return;
    }

    centerRootNode();
  }

  function focusStepDetail(stepIndex: number) {
    const rect = getViewportRect();
    const position = childNodePositions[stepIndex % childNodePositions.length];

    if (!rect || !position) {
      return;
    }

    const nextZoom = clamp(
      Math.max(mapZoom, detailFocusZoom),
      minMapZoom,
      maxMapZoom,
    );
    const detailTop = clamp(position.y - 28, 28, mapHeight - 190);
    const targetX = detailNodeLeft + detailNodeWidth / 2;
    const targetY = detailTop + 104;

    setMapZoom(nextZoom);
    setMapPan({
      x: rect.width / 2 - targetX * nextZoom,
      y: rect.height / 2 - targetY * nextZoom,
    });
  }

  function toggleStepNode(stepId: string, stepIndex: number) {
    if (expandedStepId === stepId) {
      setExpandedStepId("");
      return;
    }

    setExpandedStepId(stepId);
    focusStepDetail(stepIndex);
  }

  function handleMapPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      event.target instanceof Element && event.target.closest("[data-map-control]")
    ) {
      return;
    }

    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: mapPan.x,
      originY: mapPan.y,
    };
    setIsDraggingMap(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMapPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    setMapPan({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    });
  }

  function finishMapDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (drag.pointerId === event.pointerId) {
      dragRef.current.active = false;
      setIsDraggingMap(false);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleMapWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    const rect = getViewportRect();

    if (!rect) {
      return;
    }

    event.preventDefault();

    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    const nextZoom = clamp(
      Number((mapZoom + delta).toFixed(2)),
      minMapZoom,
      maxMapZoom,
    );

    zoomAtViewportPoint(
      nextZoom,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  }

  return (
    <section id="real-decision-cases" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="space-y-4">
          <SectionHeading
            eyebrow={content.intro.eyebrow}
            title={content.intro.title}
            description={content.intro.description}
          />
          <p className="max-w-[46rem] text-sm leading-7 text-muted-foreground">
            <MarkedText text={content.intro.supportingSentence} />
          </p>
        </div>

        <div className="grid-bg relative overflow-hidden rounded-lg border border-border/70 bg-card/90 shadow-[0_30px_90px_-62px_rgba(20,33,61,0.28)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/82 px-4 py-3">
            <div>
              <p className="font-mono text-[11px] uppercase text-primary/80">
                <MarkedText text={content.labels.decisionMap} />
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                <MarkedText text={content.labels.mapInstruction} />
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={content.labels.zoomOut}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => changeZoom(-0.1)}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-14 text-center font-mono text-[11px] text-muted-foreground">
                {Math.round(mapZoom * 100)}%
              </span>
              <button
                type="button"
                aria-label={content.labels.zoomIn}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => changeZoom(0.1)}
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={content.labels.resetZoom}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground transition-colors hover:text-foreground"
                onClick={resetZoom}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={viewportRef}
            className={cn(
              "relative h-[32rem] overflow-hidden bg-background/18 select-none sm:h-[38rem]",
              isDraggingMap ? "cursor-grabbing" : "cursor-grab",
            )}
            style={{ touchAction: "none" }}
            onPointerDown={handleMapPointerDown}
            onPointerMove={handleMapPointerMove}
            onPointerUp={finishMapDrag}
            onPointerCancel={finishMapDrag}
            onWheel={handleMapWheel}
          >
            <div
              className={cn(
                "absolute left-0 top-0",
                isDraggingMap ? "" : "transition-transform duration-300 ease-out",
              )}
              style={{
                transform: `translate3d(${mapPan.x}px, ${mapPan.y}px, 0)`,
              }}
            >
              <div
                className={cn(
                  "relative origin-top-left",
                  isDraggingMap ? "" : "transition-transform duration-300 ease-out",
                )}
                style={{
                  width: `${mapWidth}px`,
                  height: `${mapHeight}px`,
                  transform: `scale(${mapZoom})`,
                }}
              >
                <svg
                  className={cn(
                    "pointer-events-none absolute inset-0 h-full w-full text-primary/28 transition-opacity duration-500",
                    isMapOpen ? "opacity-100" : "opacity-0",
                  )}
                  viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                  aria-hidden="true"
                >
                  {content.structure.map((item, index) => {
                    const position =
                      childNodePositions[index % childNodePositions.length];
                    const rootX = rootOpenPosition.x + rootOpenPosition.width;
                    const rootY = rootOpenPosition.y + rootOpenPosition.height / 2;
                    const endX = position.x;
                    const endY = position.y + 28;

                    return (
                      <path
                        key={item.id}
                        d={`M ${rootX} ${rootY} C ${rootX + 120} ${rootY}, ${endX - 150} ${endY}, ${endX} ${endY}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                    );
                  })}

                  {activeStep && activePosition ? (
                    <path
                      d={`M ${activePosition.x + childNodeWidth} ${activePosition.y + 28} C ${activePosition.x + childNodeWidth + 70} ${activePosition.y + 28}, ${detailNodeLeft - 90} ${detailNodeTop + 70}, ${detailNodeLeft} ${detailNodeTop + 70}`}
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="7 8"
                      strokeWidth="1.4"
                    />
                  ) : null}
                </svg>

                <button
                  type="button"
                  aria-expanded={isMapOpen}
                  data-map-control="true"
                  className={cn(
                    "absolute rounded-lg border border-primary/24 bg-background/96 p-5 text-left shadow-[0_18px_54px_-38px_rgba(20,33,61,0.28)] transition-[left,top,width,min-height,border-color,background-color,box-shadow] duration-500 hover:border-primary/36",
                  )}
                  style={{
                    left: isMapOpen
                      ? `${rootOpenPosition.x}px`
                      : `${rootClosedPosition.x}px`,
                    top: isMapOpen
                      ? `${rootOpenPosition.y}px`
                      : `${rootClosedPosition.y}px`,
                    width: isMapOpen
                      ? `${rootOpenPosition.width}px`
                      : `${rootClosedPosition.width}px`,
                    minHeight: isMapOpen
                      ? `${rootOpenPosition.height}px`
                      : `${rootClosedPosition.height}px`,
                  }}
                  onClick={toggleMap}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Network className="h-5 w-5" />
                  </span>
                  <p className="mt-5 font-mono text-[10px] uppercase text-primary/80">
                    <MarkedText text={content.labels.rootNode} />
                  </p>
                  <h3 className="mt-2 text-xl font-semibold leading-tight text-foreground">
                    <MarkedText text={content.intro.title} />
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    <MarkedText
                      text={
                        isMapOpen
                          ? content.structureTitle
                          : content.labels.closedRootInstruction
                      }
                    />
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase text-primary">
                    <MarkedText
                      text={
                        isMapOpen
                          ? content.labels.collapseMap
                          : content.labels.revealBranches
                      }
                    />
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-300",
                        isMapOpen ? "rotate-180" : "",
                      )}
                    />
                  </span>
                </button>

                {content.structure.map((item, index) => {
                  const position =
                    childNodePositions[index % childNodePositions.length];
                  const isExpanded = item.id === expandedStepId;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "absolute transition-[opacity,transform] duration-500",
                        isMapOpen
                          ? "opacity-100 translate-x-0"
                          : "pointer-events-none opacity-0 -translate-x-5",
                      )}
                      style={{
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        width: `${childNodeWidth}px`,
                        transitionDelay: isMapOpen ? `${index * 45}ms` : "0ms",
                      }}
                    >
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        data-map-control="true"
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-[transform,border-color,background-color,box-shadow] duration-300 motion-safe:hover:-translate-y-px",
                          isExpanded
                            ? "border-primary/30 bg-primary/8 shadow-[0_16px_42px_-34px_rgba(20,33,61,0.28)]"
                            : "border-border/70 bg-background/90 hover:border-primary/20 hover:bg-background/98",
                        )}
                        onClick={() => toggleStepNode(item.id, index)}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border font-mono text-[11px]",
                            isExpanded
                              ? "border-primary/30 bg-primary text-primary-foreground"
                              : "border-border/80 bg-card text-muted-foreground",
                          )}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-foreground">
                          <MarkedText text={item.title} />
                        </span>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/5 text-primary">
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform duration-300",
                              isExpanded ? "rotate-90" : "",
                            )}
                          />
                        </span>
                      </button>
                    </div>
                  );
                })}

                {activeStep ? (
                  <div
                    key={activeStep.id}
                    className="absolute rounded-lg border border-primary/22 bg-card/96 p-4 shadow-[0_24px_70px_-44px_rgba(20,33,61,0.30)] transition-opacity duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3"
                    style={{
                      left: `${detailNodeLeft}px`,
                      top: `${detailNodeTop}px`,
                      width: `${detailNodeWidth}px`,
                    }}
                  >
                    <p className="font-mono text-[10px] uppercase text-primary/80">
                      <MarkedText text={content.labels.expandedDetail} />
                    </p>
                    <h4 className="mt-2 text-base font-semibold text-foreground">
                      <MarkedText text={activeStep.title} />
                    </h4>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      <MarkedText text={activeStep.description} />
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {content.labels.detailChips.map((label) => (
                        <div
                          key={label}
                          className="rounded-md border border-border/70 bg-background/74 px-2 py-2"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          <p className="mt-1 text-[11px] font-semibold text-foreground">
                            <MarkedText text={label} />
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {isMapOpen ? (
          <>
            <div className="rounded-lg border border-primary/18 bg-primary/5 p-5">
              <p className="font-mono text-[11px] uppercase text-primary/80">
                <MarkedText text={content.principle.title} />
              </p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">
                <MarkedText text={content.principle.title} />
              </h3>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
                <MarkedText text={content.principle.body} />
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-card/92 p-4 shadow-[0_26px_76px_-58px_rgba(20,33,61,0.28)] sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase text-primary/80">
                    <MarkedText text={content.labels.evidenceSlots} />
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-foreground">
                    <MarkedText text={content.labels.evidenceSlotsTitle} />
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit rounded-full border-primary/15 bg-primary/5 text-primary"
                >
                  <MarkedText text={content.labels.publicSafe} />
                </Badge>
              </div>

              <div className="mt-5 space-y-3">
                {content.cases.map((decisionCase, index) => {
                  const isExpanded = decisionCase.id === expandedCaseId;
                  const publicationLabel = decisionCase.isPublished
                    ? content.labels.publishedCase
                    : content.placeholderLabel;

                  return (
                    <div
                      key={decisionCase.id}
                      className="rounded-lg border border-border/70 bg-background/76"
                    >
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        className="flex w-full items-start gap-3 px-4 py-4 text-left"
                        onClick={() =>
                          setExpandedCaseId(isExpanded ? "" : decisionCase.id)
                        }
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-[11px]",
                            isExpanded
                              ? "border-primary/30 bg-primary text-primary-foreground"
                              : "border-border/80 bg-card text-muted-foreground",
                          )}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-[10px] uppercase text-muted-foreground">
                            <MarkedText text={publicationLabel} />
                          </span>
                          <span className="mt-1 block text-base font-semibold leading-6 text-foreground">
                            <MarkedText text={decisionCase.title} />
                          </span>
                          <span className="mt-2 flex items-center gap-2 text-xs leading-5 text-muted-foreground">
                            <LockKeyhole className="h-3.5 w-3.5 text-primary" />
                            <MarkedText text={decisionCase.status} />
                          </span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                            isExpanded ? "rotate-180" : "",
                          )}
                        />
                      </button>

                      <div
                        className={cn(
                          "grid transition-[grid-template-rows,opacity] duration-500 ease-out",
                          isExpanded
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="grid gap-3 border-t border-border/70 px-4 pb-4 pt-4 md:grid-cols-3">
                            {content.fields.map((field) => (
                              <div
                                key={field.key}
                                className="rounded-lg border border-border/70 bg-card/80 p-4"
                              >
                                <FileSearch className="h-4 w-4 text-primary" />
                                <p className="mt-3 font-mono text-[10px] uppercase text-primary/80">
                                  <MarkedText text={field.label} />
                                </p>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                  <MarkedText text={decisionCase[field.key]} />
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="max-w-[48rem] text-sm leading-7 text-muted-foreground">
              <MarkedText text={content.footerNote} />
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
