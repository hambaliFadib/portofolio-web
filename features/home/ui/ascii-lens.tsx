"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ASCII Cursor Lens — renders an image-derived ASCII representation
 * inside a circular lens that follows the pointer.
 *
 * Coordinate systems (all in CSS pixels unless noted):
 *
 *   lensPos          : pointer position in displayed-image space (0..width, 0..height)
 *   lens canvas      : 180×180 CSS pixels, 1:1 mapping
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
const LENS_RADIUS = 90; // px — lens diameter = 180
const LENS_DIAMETER = LENS_RADIUS * 2;
const ZOOM_FACTOR = 1.7; // magnification factor

// Character rendering parameters — decoupled from grid resolution
// FONT_PX: rendered character height in lens-canvas pixels
// STEP_PX: distance between characters (larger than FONT_PX for breathing room)
const FONT_PX = 7;
const STEP_PX = 10;

interface AsciiLensProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export function AsciiLens({
  src,
  alt,
  width,
  height,
  className = "",
}: AsciiLensProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const lensCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const imgLoadedRef = useRef<boolean>(false);

  const [lensPos, setLensPos] = useState<{ x: number; y: number } | null>(null);
  const [showLens, setShowLens] = useState(false);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    if (reduceMotion || !containerRef.current || !imgLoadedRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setLensPos({
        x: Math.max(0, Math.min(width, x)),
        y: Math.max(0, Math.min(height, y)),
      });
    });
  };

  const handleEnter = () => {
    if (reduceMotion || !imgLoadedRef.current) return;
    setShowLens(true);
  };

  const handleLeave = () => {
    setShowLens(false);
    setLensPos(null);
  };

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

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    if (!img) return;

    // --- coordinate-space conversion ---
    // lensPos is in *displayed-image* pixel space (matches width×height props).
    // drawImage(sourceRect) must be in the *intrinsic* image coordinate space.
    const scaleX = img.naturalWidth / width;
    const scaleY = img.naturalHeight / height;

    // Source crop in intrinsic-image coordinates, centered on pointer.
    // srcCropRadius_intrinsic = (LENS_RADIUS / ZOOM_FACTOR) * scale
    const srcCropRadiusX = (LENS_RADIUS / ZOOM_FACTOR) * scaleX;
    const srcCropRadiusY = (LENS_RADIUS / ZOOM_FACTOR) * scaleY;

    const ptrIntrinsicX = lensPos.x * scaleX;
    const ptrIntrinsicY = lensPos.y * scaleY;

    const srcLeft = Math.max(0, ptrIntrinsicX - srcCropRadiusX);
    const srcTop = Math.max(0, ptrIntrinsicY - srcCropRadiusY);
    const srcW = Math.min(img.naturalWidth - srcLeft, srcCropRadiusX * 2);
    const srcH = Math.min(img.naturalHeight - srcTop, srcCropRadiusY * 2);

    // Destination: fill the lens disc, centering if edge-clamped.
    const dstW = srcW * (width / img.naturalWidth) * ZOOM_FACTOR;
    const dstH = srcH * (height / img.naturalHeight) * ZOOM_FACTOR;
    const dstX = (LENS_DIAMETER - dstW) / 2;
    const dstY = (LENS_DIAMETER - dstH) / 2;

    // --- reset context state ---
    canvas.width = LENS_DIAMETER;
    canvas.height = LENS_DIAMETER;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // --- circular clip ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(LENS_RADIUS, LENS_RADIUS, LENS_RADIUS, 0, Math.PI * 2);
    ctx.clip();

    // --- Layer A: magnified raster crop ---
    ctx.drawImage(
      img,
      srcLeft, srcTop, srcW, srcH,       // source rect in intrinsic image px
      dstX, dstY, dstW, dstH,             // destination in lens-canvas px
    );

    // --- Layer B: ASCII overlay sampled from the magnified crop ---
    // Read pixels back from the canvas (post-drawImage) for luminance sampling.
    const overlay = ctx.getImageData(0, 0, LENS_DIAMETER, LENS_DIAMETER);
    const overlayData = overlay.data;

    ctx.fillStyle = "#e8e8e8";
    ctx.font = `${FONT_PX}px ui-monospace, "Cascadia Code", "JetBrains Mono", monospace`;

    const half = LENS_RADIUS; // 90

    for (let cy = 0; cy < LENS_DIAMETER; cy += STEP_PX) {
      for (let cx = 0; cx < LENS_DIAMETER; cx += STEP_PX) {
        // Circular boundary + edge fade
        const dx = cx - half;
        const dy = cy - half;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > LENS_RADIUS) continue;

        // Sample luminance at this lens-canvas position
        const imgIdx = (cy * LENS_DIAMETER + cx) * 4;
        const r = overlayData[imgIdx];
        const g = overlayData[imgIdx + 1];
        const b = overlayData[imgIdx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const normalized = lum / 255;
        const enhanced = Math.pow(normalized, 0.7);
        const charIdx = Math.floor(enhanced * (ASCII_CHARS.length - 1));
        const char = ASCII_CHARS[charIdx];

        const edgeFade = Math.max(0, 1 - dist / LENS_RADIUS);
        ctx.globalAlpha = edgeFade * 0.9 + 0.1;
        ctx.fillText(char, cx, cy);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }, [height, lensPos, width]);

  useEffect(() => {
    if (showLens && lensPos) {
      renderLens();
    }
  }, [showLens, lensPos, renderLens]);

  // Scoped cursor rule: hide system cursor only over the portrait
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      [data-ascii-lens] { cursor: none; }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  if (reduceMotion) {
    return (
      <div
        ref={containerRef}
        data-ascii-lens
        className={`relative overflow-hidden rounded-xl ${className}`}
        style={{ width, height }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-ascii-lens
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ width, height }}
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
        className={`h-full w-full object-cover transition-transform duration-200 ${
          showLens ? "" : "scale-105"
        }`}
      />

      {/* Lens overlay — positioned exactly at the pointer, lens diameter 180px */}
      {showLens && lensPos && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: lensPos.x - LENS_RADIUS,
            top: lensPos.y - LENS_RADIUS,
            width: LENS_DIAMETER,
            height: LENS_DIAMETER,
            borderRadius: "50%",
            overflow: "hidden",
          }}
        >
          <canvas
            ref={lensCanvasRef}
            width={LENS_DIAMETER}
            height={LENS_DIAMETER}
            className="block"
          />
        </div>
      )}
    </div>
  );
}
