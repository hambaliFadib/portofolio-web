"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CornerDownLeft,
  Eraser,
  Expand,
  Lightbulb,
  MessageSquareText,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { MarkedText, stripInlineMarkers } from "@/components/marked-text";
import { type AssistantMessage } from "@/data/assistant";
import { localizedContent } from "@/data/localized-content";
import { AssistantMessageContent } from "@/components/portfolio/assistant-message-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type WidgetMode = "closed" | "compact" | "workspace";

interface AssistantRouteResponse {
  message?: AssistantMessage;
  error?: string;
}

type AiParticleMode = "snow" | "code";

interface AiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  sway: number;
  symbol: string;
  rotation: number;
  rotationSpeed: number;
}

const aiParticleMode: AiParticleMode = "code";
const codeParticleSymbols = [
  "{}",
  "[]",
  "()",
  "</>",
  "=>",
  "&&",
  "||",
  "if",
  "fn",
  "API",
  "01",
  ";",
] as const;

function ThinkingLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="thinking-bulb relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/8 text-primary">
        <span className="thinking-orbit absolute inset-[-5px] rounded-[0.8rem] border border-primary/18">
          <span className="absolute -right-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary/70" />
        </span>
        <Lightbulb className="relative h-[18px] w-[18px]" />
      </span>

      <span>
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="mt-1 flex items-center gap-1.5" aria-hidden="true">
          <span className="thinking-bar h-1.5 w-5 rounded-full bg-primary/55" />
          <span className="thinking-bar h-1.5 w-3 rounded-full bg-primary/38 [animation-delay:160ms]" />
          <span className="thinking-bar h-1.5 w-4 rounded-full bg-primary/28 [animation-delay:320ms]" />
        </span>
      </span>
    </div>
  );
}

function AiLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="23"
      viewBox="0 0 14 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M0.179488 22.5641L0 21.1692L3.44103 11.6769C3.62052 11.8342 3.80641 11.9585 3.99872 12.05C4.19103 12.1414 4.38975 12.2171 4.59488 12.2769L1.2359 21.5744L0.179488 22.5641ZM13.1539 22.5641L12.0974 21.5744L8.73846 12.2769C8.94359 12.2171 9.14231 12.1414 9.33462 12.05C9.52693 11.9585 9.71283 11.8342 9.89231 11.6769L13.3333 21.1692L13.1539 22.5641ZM6.66667 10C5.74359 10 4.95727 9.67522 4.30769 9.02564C3.65812 8.37607 3.33333 7.58974 3.33333 6.66667C3.33333 5.8 3.6047 5.07479 4.14744 4.49102C4.69017 3.90726 5.30769 3.55897 6 3.44615V0H7.33334V3.44615C8.02565 3.55897 8.64317 3.90726 9.1859 4.49102C9.72864 5.07479 10 5.8 10 6.66667C10 7.58974 9.67522 8.37607 9.02565 9.02564C8.37607 9.67522 7.58975 10 6.66667 10ZM6.66667 8.66666C7.21539 8.66666 7.6859 8.47051 8.07821 8.0782C8.47051 7.6859 8.66667 7.21538 8.66667 6.66667C8.66667 6.11795 8.47051 5.64744 8.07821 5.25513C7.6859 4.86282 7.21539 4.66667 6.66667 4.66667C6.11795 4.66667 5.64744 4.86282 5.25514 5.25513C4.86283 5.64744 4.66667 6.11795 4.66667 6.66667C4.66667 7.21538 4.86283 7.6859 5.25514 8.0782C5.64744 8.47051 6.11795 8.66666 6.66667 8.66666Z"
        fill="currentColor"
      />
    </svg>
  );
}

function AiParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d");

    if (!canvas || !host || !context) {
      return;
    }

    const currentCanvas = canvas;
    const currentHost = host;
    const currentContext = context;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles: AiParticle[] = [];
    let width = 0;
    let height = 0;
    let animationFrame = 0;

    function randomCodeSymbol() {
      return codeParticleSymbols[Math.floor(Math.random() * codeParticleSymbols.length)];
    }

    function resetParticle(particle: AiParticle, fromTop = false) {
      particle.x = Math.random() * width;
      particle.y = fromTop ? -16 - Math.random() * 80 : Math.random() * height;
      particle.vx = (Math.random() - 0.5) * (aiParticleMode === "code" ? 0.24 : 0.16);
      particle.vy =
        aiParticleMode === "code"
          ? 0.2 + Math.random() * 0.32
          : 0.18 + Math.random() * 0.36;
      particle.size =
        aiParticleMode === "code"
          ? 10 + Math.random() * 6
          : 1.6 + Math.random() * 2.4;
      particle.alpha =
        aiParticleMode === "code"
          ? 0.24 + Math.random() * 0.28
          : 0.5 + Math.random() * 0.36;
      particle.sway = Math.random() * Math.PI * 2;
      particle.symbol = randomCodeSymbol();
      particle.rotation = (Math.random() - 0.5) * 0.28;
      particle.rotationSpeed = (Math.random() - 0.5) * 0.003;
    }

    function syncSize() {
      const rect = currentCanvas.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(rect.width));
      const nextHeight = Math.max(1, Math.floor(rect.height));
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      width = nextWidth;
      height = nextHeight;
      currentCanvas.width = Math.floor(width * devicePixelRatio);
      currentCanvas.height = Math.floor(height * devicePixelRatio);
      currentContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      const targetCount = Math.min(
        80,
        Math.max(26, Math.floor((width * height) / 21000)),
      );

      while (particles.length < targetCount) {
        const particle: AiParticle = {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          size: 1,
          alpha: 0.4,
          sway: 0,
          symbol: randomCodeSymbol(),
          rotation: 0,
          rotationSpeed: 0,
        };

        resetParticle(particle);
        particles.push(particle);
      }

      particles.length = targetCount;
    }

    function drawSnowParticle(particle: AiParticle) {
      currentContext.save();
      currentContext.shadowBlur = 9;
      currentContext.shadowColor = "rgba(28, 55, 78, 0.2)";
      currentContext.fillStyle = `rgba(245, 245, 245, ${particle.alpha})`;
      currentContext.strokeStyle = `rgba(92, 111, 126, ${particle.alpha * 0.18})`;
      currentContext.lineWidth = 1;
      currentContext.beginPath();
      currentContext.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      currentContext.fill();
      currentContext.stroke();
      currentContext.restore();
    }

    function drawCodeParticle(particle: AiParticle) {
      currentContext.save();
      currentContext.translate(particle.x, particle.y);
      currentContext.rotate(particle.rotation);
      currentContext.font = `${particle.size}px "Cascadia Code", "JetBrains Mono", Consolas, monospace`;
      currentContext.textAlign = "center";
      currentContext.textBaseline = "middle";
      currentContext.shadowBlur = 8;
      currentContext.shadowColor = "rgba(255, 255, 255, 0.55)";
      currentContext.fillStyle = `rgba(43, 70, 86, ${particle.alpha})`;
      currentContext.fillText(particle.symbol, 0, 0);
      currentContext.restore();
    }

    function drawParticle(particle: AiParticle) {
      if (aiParticleMode === "code") {
        drawCodeParticle(particle);
        return;
      }

      drawSnowParticle(particle);
    }

    function render() {
      currentContext.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.sway += 0.012;
        particle.rotation += particle.rotationSpeed;
        particle.x += particle.vx + Math.sin(particle.sway) * 0.08;
        particle.y += particle.vy;

        if (particle.y > height + 20 || particle.x < -24 || particle.x > width + 24) {
          resetParticle(particle, true);
        }

        drawParticle(particle);
      }

      animationFrame = window.requestAnimationFrame(render);
    }

    syncSize();

    if (reduceMotion) {
      for (const particle of particles) {
        drawParticle(particle);
      }

      return;
    }

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(currentHost);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="ai-particle-field pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

function AssistantStatusBadge({
  isLoading,
  hasError,
  labels,
}: {
  isLoading: boolean;
  hasError: boolean;
  labels: (typeof localizedContent)["en"]["assistant"]["status"];
}) {
  const label = hasError
    ? labels.offline
    : isLoading
      ? labels.thinking
      : labels.active;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex h-10 items-center gap-2 rounded-full border bg-background/80 px-3 text-sm font-medium shadow-sm",
        hasError
          ? "border-destructive/25 text-destructive"
          : "border-primary/20 text-foreground",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          hasError ? "bg-destructive" : "bg-primary",
          isLoading && !hasError ? "animate-pulse" : null,
        )}
      />
      {label}
    </div>
  );
}

function MessageList({
  messages,
  isLoading,
  loadingLabel,
  className,
}: {
  messages: AssistantMessage[];
  isLoading: boolean;
  loadingLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {messages.map((message, index) => (
        <div
          key={`${message.role}-${index}`}
          className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
        >
          <div
            className={cn(
              "min-w-0 max-w-[92%] overflow-hidden break-words rounded-lg px-3.5 py-3 text-sm leading-6",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "border border-border/70 bg-card text-foreground",
            )}
          >
            {message.role === "assistant" ? (
              <AssistantMessageContent content={message.content} />
            ) : (
              <p className="whitespace-pre-wrap text-pretty">{message.content}</p>
            )}
          </div>
        </div>
      ))}

      {isLoading ? (
        <div className="flex justify-start">
          <div className="max-w-[92%] rounded-lg border border-border/70 bg-card/96 px-3.5 py-3 text-sm text-muted-foreground shadow-sm">
            <ThinkingLoader label={loadingLabel} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ClarityAIWidget() {
  const { locale } = useLanguage();
  const assistantText = localizedContent[locale].assistant;
  const [mode, setMode] = useState<WidgetMode>("closed");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const compactViewportRef = useRef<HTMLDivElement | null>(null);
  const workspaceViewportRef = useRef<HTMLDivElement | null>(null);

  // Animation state: true while the compact card is playing its exit animation
  // before transitioning to workspace mode.
  const [compactExiting, setCompactExiting] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const viewport =
      mode === "workspace" ? workspaceViewportRef.current : compactViewportRef.current;

    if (!viewport) {
      return;
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: messages.length > 0 || isLoading ? "smooth" : "auto",
    });
  }, [isLoading, messages, mode]);

  function clearSession() {
    setMessages([]);
    setDraft("");
    setError(null);
    setIsLoading(false);
  }

  function closeWidget() {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    setCompactExiting(false);
    clearSession();
    setMode("closed");
  }

  /** Open the compact card with its unfold animation. */
  function openCompact() {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    setCompactExiting(false);
    setMode("compact");
  }

  /**
   * Trigger compact card fold-out animation, then switch to workspace mode.
   * The timer duration matches .chat-compact-exit animation duration (240ms).
   */
  function startExpandToWorkspace() {
    setCompactExiting(true);
    exitTimerRef.current = setTimeout(() => {
      setMode("workspace");
      setCompactExiting(false);
    }, 210);
  }

  async function requestAssistantReply(conversation: AssistantMessage[]) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: conversation, locale }),
      });

      const payload = (await response.json().catch(() => null)) as AssistantRouteResponse | null;

      if (!response.ok || !payload?.message) {
        throw new Error(payload?.error ?? assistantText.errorMessage);
      }

      setMessages((current) => [...current, payload.message as AssistantMessage]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : assistantText.errorMessage,
      );
    } finally {
      setIsLoading(false);
    }
  }

  function submitPrompt(prompt: string) {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt || isLoading) {
      return;
    }

    const userMessage: AssistantMessage = {
      role: "user",
      content: trimmedPrompt,
    };
    const nextConversation = [...messages, userMessage];

    setDraft("");
    setError(null);
    setMessages(nextConversation);
    void requestAssistantReply(nextConversation);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitPrompt(draft);
  }

  function handleWorkspaceKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    submitPrompt(draft);
  }

  const hasConversation = messages.length > 0;

  return (
    <>
      {mode === "closed" ? (
        <button
          type="button"
          aria-label={assistantText.aria.open}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_18px_45px_-18px_rgba(20,33,61,0.30)] transition-[transform,box-shadow,opacity] duration-300 hover:opacity-95 hover:shadow-[0_22px_55px_-18px_rgba(20,33,61,0.35)] motion-safe:hover:-translate-y-1 motion-safe:active:translate-y-0"
          onClick={openCompact}
        >
          <MessageSquareText className="h-5 w-5" />
        </button>
      ) : null}

      {mode === "compact" ? (
        <div
          className="fixed inset-0 z-50 bg-background/45 backdrop-blur-sm"
          style={{
            opacity:    compactExiting ? 0 : undefined,
            transition: compactExiting ? "opacity 240ms ease" : undefined,
          }}
        >
          <div
            className={cn(
              "ai-system-grid absolute bottom-6 right-6 flex h-[min(42rem,calc(100vh-3rem))] w-[min(26rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-lg border border-border/80 bg-card/98 shadow-[0_28px_70px_-36px_rgba(20,33,61,0.30)]",
              compactExiting ? "chat-compact-exit" : "chat-compact-enter",
            )}
          >
            <AiParticleField />
            <div className="border-b border-border/70 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/90 text-foreground">
                    <AiLogoIcon className="h-[23px] w-[14px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground">
                      <MarkedText text={assistantText.title} />
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      <MarkedText text={assistantText.compactDescription} />
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                    aria-label={assistantText.aria.expand}
                    onClick={startExpandToWorkspace}
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                    aria-label={assistantText.aria.close}
                    onClick={closeWidget}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div
              ref={compactViewportRef}
              className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
            >
              {hasConversation || isLoading ? (
                <MessageList
                  messages={messages}
                  isLoading={isLoading}
                  loadingLabel={assistantText.loadingLabel}
                />
              ) : (
                <div className="flex min-h-full flex-col justify-between gap-6">
                  <div className="rounded-lg border border-border/70 bg-secondary/45 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <MarkedText text={assistantText.suggestedPrompts} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {assistantText.quickQuestions.slice(0, 4).map((question) => (
                        <Button
                          key={question}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto rounded-full bg-background/85 px-3 py-2 text-left text-xs leading-5 text-muted-foreground hover:text-foreground"
                          onClick={() => submitPrompt(question)}
                        >
                          <MarkedText text={question} />
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error ? (
              <div className="mx-5 mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm leading-6 text-foreground/85">
                {error}
              </div>
            ) : null}

            <form className="border-t border-border/70 p-4" onSubmit={handleSubmit}>
              <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-background/95 p-2">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={stripInlineMarkers(assistantText.placeholder)}
                  className="h-11 min-w-0 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-11 w-11 rounded-md"
                  aria-label={assistantText.aria.send}
                  disabled={isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                <MarkedText text={assistantText.disclaimer} />
              </p>
            </form>
          </div>
        </div>
      ) : null}

      {mode === "workspace" ? (
        <div className="fixed inset-0 z-50 flex bg-background text-foreground chat-workspace-enter">
          <aside className="hidden w-72 shrink-0 border-r border-border/70 bg-card/92 p-5 md:flex md:flex-col">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-background/90 text-foreground">
                <AiLogoIcon className="h-[23px] w-[14px]" />
              </div>
              <div>
                <p className="font-semibold">
                  <MarkedText text={assistantText.title} />
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  <MarkedText text={assistantText.compactDescription} />
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                <MarkedText text={assistantText.knowledgeDomainsLabel} />
              </p>
              {assistantText.knowledgeDomains.map((domain) => (
                <div
                  key={domain}
                  className="rounded-lg border border-border/70 bg-background/70 px-3 py-3 text-sm text-foreground/85"
                >
                  <MarkedText text={domain} />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-auto h-10 rounded-full bg-background/80"
              onClick={clearSession}
            >
              <Eraser className="h-4 w-4" />
              <MarkedText text={assistantText.newSession} />
            </Button>
          </aside>

          <main className="grid-bg ai-system-grid relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <AiParticleField />
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-background/88 px-4 backdrop-blur md:px-6">
              <div className="min-w-0 md:hidden">
                <p className="font-semibold">
                  <MarkedText text={assistantText.title} />
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  <MarkedText text={assistantText.compactDescription} />
                </p>
              </div>
              <div className="hidden min-w-0 md:block">
                <p className="text-sm text-muted-foreground">
                  <MarkedText text={assistantText.workspaceLabel} />
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AssistantStatusBadge
                  isLoading={isLoading}
                  hasError={Boolean(error)}
                  labels={assistantText.status}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label={assistantText.aria.closeWorkspace}
                  onClick={closeWidget}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div ref={workspaceViewportRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-36 pt-8 md:px-8">
              <div className="mx-auto max-w-3xl">
                {hasConversation || isLoading ? (
                  <MessageList
                    messages={messages}
                    isLoading={isLoading}
                    loadingLabel={assistantText.loadingLabel}
                  />
                ) : (
                  <div className="flex min-h-[calc(100vh-18rem)] items-center justify-center">
                    <div className="max-w-xl text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-border/70 bg-card text-primary shadow-sm">
                        <CornerDownLeft className="h-6 w-6" />
                      </div>
                      <h2 className="mt-6 text-3xl font-semibold text-foreground">
                        <MarkedText text={assistantText.emptyTitle} />
                      </h2>
                      <p className="mt-4 text-sm leading-7 text-muted-foreground">
                        <MarkedText text={assistantText.emptyDescription} />
                      </p>
                      <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {assistantText.quickQuestions.map((question) => (
                          <Button
                            key={question}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-auto rounded-full bg-background/85 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => submitPrompt(question)}
                          >
                            <MarkedText text={question} />
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error ? (
              <div className="absolute bottom-28 left-4 right-4 mx-auto max-w-3xl rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm leading-6 text-foreground/85 md:left-8 md:right-8">
                {error}
              </div>
            ) : null}

            <form
              className="absolute bottom-0 left-0 right-0 border-t border-border/70 bg-background/86 px-4 py-4 backdrop-blur md:px-8"
              onSubmit={handleSubmit}
            >
              <div className="mx-auto max-w-3xl">
                <div className="flex items-end gap-2 rounded-lg border border-border/80 bg-card/95 p-2 shadow-[0_24px_60px_-44px_rgba(20,33,61,0.45)]">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleWorkspaceKeyDown}
                    placeholder={stripInlineMarkers(assistantText.workspacePlaceholder)}
                    className="max-h-32 min-h-12 flex-1 resize-none border-0 bg-transparent px-3 py-3 text-sm shadow-none focus-visible:ring-0"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    className="h-11 rounded-md px-4"
                    disabled={isLoading}
                  >
                    <MarkedText text={assistantText.send} />
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  <MarkedText text={assistantText.disclaimer} />
                </p>
              </div>
            </form>
          </main>
        </div>
      ) : null}
    </>
  );
}
