"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PERSONA_ENTER_DURATION_MS,
  PERSONA_EXIT_DURATION_MS,
  type PersonaTransitionStage,
} from "@/components/identity/identity-provider";
import { useReducedMotionPreference } from "@/components/motion/use-reduced-motion";

/**
 * ASCII Cursor Lens — renders an image-derived ASCII representation
 * inside a circular lens that follows the pointer.
 *
 * Coordinate systems (all in CSS pixels unless noted):
 *
 *   lensPos          : pointer position in displayed-image space (0..width, 0..height)
 *   lens canvas      : up to 180×180 CSS pixels, sized to the portrait on mobile
 *   ZOOM_FACTOR      : 1.7 — lens diameter / source crop diameter
 *
 * Magnification mapping (ZOOM_FACTOR = 1.7):
 *   The lens shows a ~106px source crop (180 / 1.7) enlarged to 180px.
 *   Source crop is centered on the pointer, converted to intrinsic image
 *   coordinates via scale = naturalWidth / width.
 *   Facial features inside the lens appear 1.7× larger than outside.
 *
 * Character rendering:
 *   Characters are drawn at FONT_PX size, spaced STEP_PX apart.
 *   Each glyph samples luminance from the magnified canvas at (cx, cy).
 */

const ASCII_CHARS = " .:-=+*#%@";
const MAX_LENS_DIAMETER = 180;
const ZOOM_FACTOR = 1.7; // magnification factor

// Character rendering parameters — decoupled from grid resolution
// FONT_PX: rendered character height in lens-canvas pixels
// STEP_PX: distance between characters (larger than FONT_PX for breathing room)
const FONT_PX = 8;
const STEP_PX = 9;
const TRANSITION_STEP_PX = 13;
const TRANSITION_GLYPH_ALPHA = 0.76;
const TRANSITION_REVEAL_SOFTNESS = 0.2;

type TransitionCell = {
  x: number;
  y: number;
  character: string;
  color: string;
  distance: number;
};

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

function createTransitionCells(
  img: HTMLImageElement,
  container: HTMLDivElement,
): { width: number; height: number; cells: TransitionCell[] } | null {
  const bounds = container.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const sampler = document.createElement("canvas");
  sampler.width = width;
  sampler.height = height;
  const sampleContext = sampler.getContext("2d", { willReadFrequently: true });
  if (!sampleContext || !img.naturalWidth || !img.naturalHeight) return null;

  try {
    sampleContext.drawImage(img, 0, 0, width, height);
    const pixels = sampleContext.getImageData(0, 0, width, height).data;
    const styles = getComputedStyle(container);
    const isDark = document.documentElement.dataset.appearance === "dark";
    const foreground = styles.getPropertyValue("--foreground").trim() || "#17243A";
    const background = styles.getPropertyValue("--background").trim() || "#F1EFE8";
    const darkInk = isDark ? background : foreground;
    const lightInk = isDark ? foreground : background;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistance = Math.hypot(centerX, centerY);
    const cells: TransitionCell[] = [];

    for (let y = TRANSITION_STEP_PX / 2; y < height; y += TRANSITION_STEP_PX) {
      for (let x = TRANSITION_STEP_PX / 2; x < width; x += TRANSITION_STEP_PX) {
        const index = (Math.floor(y) * width + Math.floor(x)) * 4;
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
        const darkness = Math.pow(1 - luminance, 0.8);
        const character = ASCII_CHARS[Math.floor(darkness * (ASCII_CHARS.length - 1))];
        const distance = maxDistance === 0 ? 0 : Math.hypot(x - centerX, y - centerY) / maxDistance;

        cells.push({
          x,
          y,
          character,
          color: luminance > 0.5 ? darkInk : lightInk,
          distance,
        });
      }
    }

    return { width, height, cells };
  } catch {
    return null;
  }
}

interface AsciiLensProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  transitionStage: PersonaTransitionStage;
  className?: string;
  imageClassName?: string;
}

export function AsciiLens({
  src,
  alt,
  width,
  height,
  transitionStage,
  className = "",
  imageClassName = "",
}: AsciiLensProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const lensCanvasRef = useRef<HTMLCanvasElement>(null);
  const transitionCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const imgLoadedRef = useRef<boolean>(false);

  const [lensPos, setLensPos] = useState<{ x: number; y: number; diameter: number } | null>(null);
  const [showLens, setShowLens] = useState(false);
  const reduceMotion = useReducedMotionPreference();

  // Luminance for ASCII Layer B is sampled directly from the magnified
  // canvas crop at render time. No precomputed grid needed.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      imgLoadedRef.current = true;
      return;
    }
    const onLoad = () => {
      imgLoadedRef.current = true;
    };
    img.addEventListener("load", onLoad);
    return () => img.removeEventListener("load", onLoad);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    lastPointerRef.current = { clientX: e.clientX, clientY: e.clientY };
    if (reduceMotion || transitionStage !== "idle" || !containerRef.current || !imgLoadedRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setLensPos({
        x: Math.max(0, Math.min(rect.width, x)),
        y: Math.max(0, Math.min(rect.height, y)),
        diameter: Math.round(Math.min(MAX_LENS_DIAMETER, rect.width * 0.55)),
      });
    });
  };

  const handleEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    lastPointerRef.current = { clientX: e.clientX, clientY: e.clientY };
    if (reduceMotion || transitionStage !== "idle" || !imgLoadedRef.current) return;
    setShowLens(true);
  };

  const handleLeave = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastPointerRef.current = null;
    setShowLens(false);
    setLensPos(null);
  };

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const canvas = transitionCanvasRef.current;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container || transitionStage === "idle" || reduceMotion || !imgLoadedRef.current) return;

    let frameId: number | null = null;
    let animation: Animation | null = null;

    if (transitionStage === "introduce") {
      const composition = createTransitionCells(img, container);
      if (!composition) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(composition.width * pixelRatio);
      canvas.height = Math.round(composition.height * pixelRatio);
      const context = canvas.getContext("2d");
      if (!context) return;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.font = `${FONT_PX}px ui-monospace, "Cascadia Code", "JetBrains Mono", monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      animation = canvas.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: PERSONA_EXIT_DURATION_MS, easing: "ease-out", fill: "forwards" },
      );

      let startTime: number | null = null;
      const drawFrame = (now: number) => {
        startTime ??= now;
        const progress = clampUnit((now - startTime) / PERSONA_EXIT_DURATION_MS);
        context.clearRect(0, 0, composition.width, composition.height);

        for (const cell of composition.cells) {
          const reveal = clampUnit((progress - cell.distance + TRANSITION_REVEAL_SOFTNESS) / TRANSITION_REVEAL_SOFTNESS);
          if (!reveal || cell.character === " ") continue;
          context.globalAlpha = reveal * TRANSITION_GLYPH_ALPHA;
          context.fillStyle = cell.color;
          context.fillText(cell.character, cell.x, cell.y);
        }
        context.globalAlpha = 1;

        if (progress < 1) frameId = requestAnimationFrame(drawFrame);
        else frameId = null;
      };

      frameId = requestAnimationFrame(drawFrame);
    } else {
      animation = canvas.animate(
        [{ opacity: 0.76 }, { opacity: 0 }],
        { duration: PERSONA_ENTER_DURATION_MS, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
      );
    }

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      animation?.cancel();
    };
  }, [reduceMotion, transitionStage]);

  useEffect(() => {
    if (transitionStage !== "idle") {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const container = containerRef.current;
    const pointer = lastPointerRef.current;
    if (reduceMotion || !imgLoadedRef.current || !container?.matches(":hover") || !pointer) return;

    const bounds = container.getBoundingClientRect();
    setLensPos({
      x: Math.max(0, Math.min(bounds.width, pointer.clientX - bounds.left)),
      y: Math.max(0, Math.min(bounds.height, pointer.clientY - bounds.top)),
      diameter: Math.round(Math.min(MAX_LENS_DIAMETER, bounds.width * 0.55)),
    });
    setShowLens(true);
  }, [reduceMotion, transitionStage]);

  /**
   * renderLens — two aligned layers on a single canvas:
   *
   *   Layer A (magnified raster crop): drawImage extracts a ~106px source
   *   crop centered on the pointer (converted to intrinsic image coords
   *   via scale = naturalWidth / width) and scales it to 180px on canvas.
   *
   *   Layer B (ASCII overlay): samples luminance from the magnified canvas
   *   via getImageData and places light-toned glyphs aligned to the crop.
   *
   * Both layers sample the same source rectangle at the same 1.7× zoom.
   */
    const renderLens = useCallback(() => {
    const canvas = lensCanvasRef.current;
    if (!canvas || !lensPos) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = imgRef.current;
    if (!img) return;

    // --- coordinate-space conversion ---
    // lensPos is in *displayed-image* pixel space (matches width×height props).
    // drawImage(sourceRect) must be in the *intrinsic* image coordinate space.
    const renderedWidth = img.getBoundingClientRect().width;
    const renderedHeight = img.getBoundingClientRect().height;
    if (!renderedWidth || !renderedHeight) return;
    const scaleX = img.naturalWidth / renderedWidth;
    const scaleY = img.naturalHeight / renderedHeight;

    // Source crop in intrinsic-image coordinates, centered on pointer.
    // srcCropRadius_intrinsic = (LENS_RADIUS / ZOOM_FACTOR) * scale
    const lensRadius = lensPos.diameter / 2;
    const lensDiameter = lensPos.diameter;
    const srcCropRadiusX = (lensRadius / ZOOM_FACTOR) * scaleX;
    const srcCropRadiusY = (lensRadius / ZOOM_FACTOR) * scaleY;

    const ptrIntrinsicX = lensPos.x * scaleX;
    const ptrIntrinsicY = lensPos.y * scaleY;

    const requestedSrcLeft = ptrIntrinsicX - srcCropRadiusX;
    const requestedSrcTop = ptrIntrinsicY - srcCropRadiusY;
    const srcLeft = Math.max(0, requestedSrcLeft);
    const srcTop = Math.max(0, requestedSrcTop);
    const srcW = Math.min(img.naturalWidth - srcLeft, srcCropRadiusX * 2);
    const srcH = Math.min(img.naturalHeight - srcTop, srcCropRadiusY * 2);

    // Destination: fill the lens disc, centering if edge-clamped.
    const dstW = srcW * (renderedWidth / img.naturalWidth) * ZOOM_FACTOR;
    const dstH = srcH * (renderedHeight / img.naturalHeight) * ZOOM_FACTOR;
    const dstX = (srcLeft - requestedSrcLeft) * (renderedWidth / img.naturalWidth) * ZOOM_FACTOR;
    const dstY = (srcTop - requestedSrcTop) * (renderedHeight / img.naturalHeight) * ZOOM_FACTOR;

    // --- reset context state ---
    if (canvas.width !== lensDiameter) canvas.width = lensDiameter;
    if (canvas.height !== lensDiameter) canvas.height = lensDiameter;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.clearRect(0, 0, lensDiameter, lensDiameter);

    // --- circular clip ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(lensRadius, lensRadius, lensRadius, 0, Math.PI * 2);
    ctx.clip();

    // --- Layer A: magnified raster crop ---
    ctx.drawImage(
      img,
      srcLeft, srcTop, srcW, srcH,       // source rect in intrinsic image px
      dstX, dstY, dstW, dstH,             // destination in lens-canvas px
    );

    // --- Layer B: ASCII overlay sampled from the magnified crop ---
    // Read pixels back from the canvas (post-drawImage) for luminance sampling.
    const overlay = ctx.getImageData(0, 0, lensDiameter, lensDiameter);
    const overlayData = overlay.data;
    const identityStyles = getComputedStyle(containerRef.current ?? img);
    const isDark = document.documentElement.dataset.appearance === "dark";
    const foreground = identityStyles.getPropertyValue("--foreground").trim() || "#17243A";
    const background = identityStyles.getPropertyValue("--background").trim() || "#F1EFE8";
    const darkInk = isDark ? background : foreground;
    const lightInk = isDark ? foreground : background;
    ctx.font = `${FONT_PX}px ui-monospace, "Cascadia Code", "JetBrains Mono", monospace`;

    for (let cy = 0; cy < lensDiameter; cy += STEP_PX) {
      for (let cx = 0; cx < lensDiameter; cx += STEP_PX) {
        // Circular boundary + edge fade
        const dx = cx - lensRadius;
        const dy = cy - lensRadius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > lensRadius) continue;

        // Sample luminance at this lens-canvas position
        const imgIdx = (cy * lensDiameter + cx) * 4;
        const r = overlayData[imgIdx];
        const g = overlayData[imgIdx + 1];
        const b = overlayData[imgIdx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const normalized = lum / 255;
        const darkness = Math.pow(1 - normalized, 0.8);
        const charIdx = Math.floor(darkness * (ASCII_CHARS.length - 1));
        const char = ASCII_CHARS[charIdx];

        const edgeFade = Math.max(0, 1 - dist / lensRadius);
        ctx.globalAlpha = edgeFade * 0.9 + 0.1;
        ctx.fillStyle = normalized > 0.5 ? darkInk : lightInk;
        ctx.fillText(char, cx, cy);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }, [lensPos]);

  useEffect(() => {
    if (showLens && lensPos) {
      renderLens();
    }
  }, [showLens, lensPos, renderLens]);

  // Hide the system cursor only while the image-derived lens is active.
  useEffect(() => {
    if (!showLens) return;
    const style = document.createElement("style");
    style.textContent = `
      [data-ascii-lens] { cursor: none; }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [showLens]);

  if (reduceMotion) {
    return (
      <div
        ref={containerRef}
        data-ascii-lens
        className={`relative overflow-hidden rounded-xl ${className}`}
        style={{ width: "100%", maxWidth: width, aspectRatio: `${width} / ${height}` }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          className={`h-full w-full object-cover ${imageClassName}`}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-ascii-lens
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ width: "100%", maxWidth: width, aspectRatio: `${width} / ${height}` }}
      onPointerMove={handlePointerMove}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-200 ${imageClassName} ${
          showLens || transitionStage !== "idle" ? "" : "scale-105"
        }`}
      />

      {transitionStage !== "idle" && !reduceMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
          data-ascii-transition={transitionStage}
        >
          <canvas
            ref={transitionCanvasRef}
            className="block h-full w-full"
            style={{ opacity: transitionStage === "introduce" ? 0 : 0.76 }}
          />
        </div>
      )}

      {/* Lens overlay — positioned exactly at the pointer, lens diameter 180px */}
      {transitionStage === "idle" && showLens && lensPos && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            left: lensPos.x - lensPos.diameter / 2,
            top: lensPos.y - lensPos.diameter / 2,
            width: lensPos.diameter,
            height: lensPos.diameter,
            borderRadius: "50%",
            overflow: "hidden",
          }}
        >
          <canvas
            ref={lensCanvasRef}
            width={lensPos.diameter}
            height={lensPos.diameter}
            className="block motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
          />
        </div>
      )}
    </div>
  );
}
