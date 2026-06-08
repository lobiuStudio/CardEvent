"use client";

/* eslint-disable @next/next/no-img-element -- Submission images come from the app upload route or storage adapter. */

import { useEffect, useState } from "react";

type SubmissionImage = {
  id: string;
  originalName: string;
  publicUrl: string;
};

type SubmissionImageLightboxProps = {
  images: SubmissionImage[];
};

export function SubmissionImageLightbox({ images }: SubmissionImageLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const activeImage = activeIndex === null ? null : (images[activeIndex] ?? null);

  function openImage(index: number) {
    setActiveIndex(index);
    setZoomPercent(100);
  }

  function closeImage() {
    setActiveIndex(null);
    setZoomPercent(100);
  }

  function showPreviousImage() {
    setActiveIndex((currentIndex) => {
      if (currentIndex === null) {
        return currentIndex;
      }

      return Math.max(0, currentIndex - 1);
    });
    setZoomPercent(100);
  }

  function showNextImage() {
    setActiveIndex((currentIndex) => {
      if (currentIndex === null) {
        return currentIndex;
      }

      return Math.min(images.length - 1, currentIndex + 1);
    });
    setZoomPercent(100);
  }

  function zoomOut() {
    setZoomPercent((currentZoom) => Math.max(50, currentZoom - 25));
  }

  function zoomIn() {
    setZoomPercent((currentZoom) => Math.min(200, currentZoom + 25));
  }

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveIndex(null);
        setZoomPercent(100);
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((currentIndex) => {
          if (currentIndex === null) {
            return currentIndex;
          }

          return Math.max(0, currentIndex - 1);
        });
        setZoomPercent(100);
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((currentIndex) => {
          if (currentIndex === null) {
            return currentIndex;
          }

          return Math.min(images.length - 1, currentIndex + 1);
        });
        setZoomPercent(100);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, images.length]);

  if (!images.length) {
    return <p className="rounded-md bg-white p-4 text-sm font-bold text-[var(--ink-muted)]">No active images.</p>;
  }

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2" aria-label="Submission images">
        {images.map((image, index) => (
          <button
            aria-label={`Open ${image.originalName}`}
            className="paper-surface grid gap-2 rounded-lg border-2 border-[var(--line)] p-3 text-left ink-shadow-sm"
            key={image.id}
            onClick={() => openImage(index)}
            type="button"
          >
            <img
              alt={image.originalName}
              className="aspect-[4/3] w-full rounded-md border-2 border-[var(--line)] object-cover"
              src={image.publicUrl}
            />
            <span className="text-sm font-bold text-[var(--ink-muted)]">View image</span>
          </button>
        ))}
      </section>

      {activeImage ? (
        <div
          aria-label={activeImage.originalName}
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/82 p-4"
          role="dialog"
        >
          <button
            aria-label="Dismiss image backdrop"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={closeImage}
            type="button"
          />
          <div className="relative grid max-h-[92dvh] w-full max-w-6xl gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-white bg-white p-3">
              <div className="grid gap-1">
                <p className="text-sm font-black text-[var(--ink)]">{activeImage.originalName}</p>
                <p className="text-xs font-bold text-[var(--ink-muted)]">
                  {(activeIndex ?? 0) + 1} / {images.length}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  aria-label="Previous image"
                  className="inline-flex min-h-10 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-3 text-sm font-black text-[var(--ink)] disabled:opacity-45"
                  disabled={activeIndex === 0}
                  onClick={showPreviousImage}
                  type="button"
                >
                  Prev
                </button>
                <button
                  aria-label="Next image"
                  className="inline-flex min-h-10 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-3 text-sm font-black text-[var(--ink)] disabled:opacity-45"
                  disabled={activeIndex === images.length - 1}
                  onClick={showNextImage}
                  type="button"
                >
                  Next
                </button>
                <button
                  aria-label="Zoom out"
                  className="inline-flex min-h-10 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-3 text-sm font-black text-[var(--ink)]"
                  onClick={zoomOut}
                  type="button"
                >
                  -
                </button>
                <span className="inline-flex min-h-10 min-w-16 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-3 text-sm font-black text-[var(--ink)]">
                  {zoomPercent}%
                </span>
                <button
                  aria-label="Zoom in"
                  className="inline-flex min-h-10 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-3 text-sm font-black text-[var(--ink)]"
                  onClick={zoomIn}
                  type="button"
                >
                  +
                </button>
                <button
                  aria-label="Reset zoom"
                  className="inline-flex min-h-10 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-3 text-sm font-black text-[var(--ink)]"
                  onClick={() => setZoomPercent(100)}
                  type="button"
                >
                  Reset
                </button>
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border-2 border-white bg-white px-4 text-sm font-black text-[var(--ink)]"
                onClick={closeImage}
                type="button"
              >
                Close image
              </button>
            </div>
            <div className="max-h-[78dvh] overflow-auto rounded-lg border-2 border-white bg-white p-2">
              <img
                alt={activeImage.originalName}
                className="mx-auto max-h-[76dvh] w-full object-contain transition-transform"
                src={activeImage.publicUrl}
                style={{
                  transform: `scale(${zoomPercent / 100})`,
                  transformOrigin: "center center",
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
