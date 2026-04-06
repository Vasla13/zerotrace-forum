import clsx from "clsx";
import type { ForumPostMedia } from "@/lib/types/forum";

type PostMediaGalleryProps = {
  media: ForumPostMedia[];
  compact?: boolean;
};

export function PostMediaGallery({
  media,
  compact = false,
}: PostMediaGalleryProps) {
  if (!media.length) {
    return null;
  }

  return (
    <div
      className={clsx(
        "forum-media-grid",
        compact && "forum-media-grid-compact",
      )}
    >
      {media.map((item) => (
        <div key={item.storagePath} className="forum-media-frame">
          {item.type === "video" ? (
            <video
              className="forum-media-content"
              controls
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
        </div>
      ))}
    </div>
  );
}
