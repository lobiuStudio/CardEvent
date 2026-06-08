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
  const [activeImage, setActiveImage] = useState<SubmissionImage | null>(null);

  useEffect(() => {
    if (!activeImage) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveImage(null);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [activeImage]);

  if (!images.length) {
    return <p className="rounded-md bg-white p-4 text-sm font-bold text-[var(--ink-muted)]">No active images.</p>;
  }

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2" aria-label="Submission images">
        {images.map((image) => (
          <button
            aria-label={`Open ${image.originalName}`}
            className="paper-surface grid gap-2 rounded-lg border-2 border-[var(--line)] p-3 text-left ink-shadow-sm"
            key={image.id}
            onClick={() => setActiveImage(image)}
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
            aria-label="Close image backdrop"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setActiveImage(null)}
            type="button"
          />
          <div className="relative grid max-h-[92dvh] w-full max-w-6xl gap-3">
            <div className="flex justify-end">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border-2 border-white bg-white px-4 text-sm font-black text-[var(--ink)]"
                onClick={() => setActiveImage(null)}
                type="button"
              >
                Close image
              </button>
            </div>
            <img
              alt={activeImage.originalName}
              className="max-h-[82dvh] w-full rounded-lg border-2 border-white bg-white object-contain"
              src={activeImage.publicUrl}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
