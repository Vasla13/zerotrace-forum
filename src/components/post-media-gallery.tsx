"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ForumPostMedia } from "@/lib/types/forum";

type PostMediaGalleryProps = {
  media: ForumPostMedia[];
  compact?: boolean;
};

export function PostMediaGallery({
  media,
  compact = false,
}: PostMediaGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveIndex(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => {
          if (current === null) {
            return current;
          }

          return current === 0 ? media.length - 1 : current - 1;
        });
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) => {
          if (current === null) {
            return current;
          }

          return current === media.length - 1 ? 0 : current + 1;
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, media.length]);

  if (!media.length) {
    return null;
  }

  const activeItem = activeIndex !== null ? media[activeIndex] : null;
  const activePosition = activeIndex !== null ? activeIndex + 1 : 0;

  function step(direction: -1 | 1) {
    setActiveIndex((current) => {
      if (current === null) {
        return current;
      }

      if (direction === -1) {
        return current === 0 ? media.length - 1 : current - 1;
      }

      return current === media.length - 1 ? 0 : current + 1;
    });
  }

  return (
    <>
      <div
        className={clsx(
          "forum-media-grid",
          compact && "forum-media-grid-compact",
        )}
      >
        {media.map((item, index) => (
          <button
            key={item.storagePath}
            type="button"
            onClick={() => {
              setActiveIndex(index);
            }}
            className="forum-media-frame forum-media-trigger"
          >
            {item.type === "video" ? (
              <video
                className="forum-media-content"
                controls={!compact}
                playsInline
                preload="metadata"
                src={item.url}
              />
            ) : (
              <img
                src={item.url}
                alt=""
                className="forum-media-content"
                loading="lazy"
              />
            )}
            <span className="forum-media-expand">
              <Expand className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>

      {activeItem && typeof document !== "undefined"
        ? createPortal(
            <div
              className="forum-media-viewer-backdrop"
              onClick={() => {
                setActiveIndex(null);
              }}
              role="presentation"
            >
              <div
                className="forum-media-viewer-shell"
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onTouchStart={(event) => {
                  setTouchStartX(event.changedTouches[0]?.clientX ?? null);
                }}
                onTouchEnd={(event) => {
                  const endX = event.changedTouches[0]?.clientX ?? null;

                  if (touchStartX === null || endX === null) {
                    return;
                  }

                  const delta = endX - touchStartX;

                  if (Math.abs(delta) < 48 || media.length < 2) {
                    return;
                  }

                  step(delta > 0 ? -1 : 1);
                }}
                role="dialog"
                aria-modal="true"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveIndex(null);
                  }}
                  className="forum-media-viewer-close"
                  aria-label="Fermer la visionneuse"
                >
                  <X className="h-5 w-5" />
                </button>

                {media.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        step(-1);
                      }}
                      className="forum-media-viewer-nav forum-media-viewer-nav-left"
                      aria-label="Média précédent"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        step(1);
                      }}
                      className="forum-media-viewer-nav forum-media-viewer-nav-right"
                      aria-label="Média suivant"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                ) : null}

                <div className="forum-media-viewer-stage">
                  {activeItem.type === "video" ? (
                    <video
                      className="forum-media-viewer-content"
                      controls
                      autoPlay
                      playsInline
                      preload="metadata"
                      src={activeItem.url}
                    />
                  ) : (
                    <img
                      src={activeItem.url}
                      alt=""
                      className="forum-media-viewer-content"
                    />
                  )}
                </div>

                <div className="forum-media-viewer-meta">
                  <span>{activeItem.type === "video" ? "Vidéo" : "Image"}</span>
                  <span>
                    {activePosition}/{media.length}
                  </span>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
