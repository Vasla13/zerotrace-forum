import Link from "next/link";
import { ArrowRight, Heart, Pin } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { PostMediaGallery } from "@/components/post-media-gallery";
import { getForumChannelLabel } from "@/lib/forum/config";
import type { ForumPost } from "@/lib/types/forum";
import { formatAbsoluteDate, formatRelativeDate } from "@/lib/utils/date";
import { excerpt } from "@/lib/utils/text";

type PostCardProps = {
  post: ForumPost;
};

export function PostCard({ post }: PostCardProps) {
  const wasEdited =
    Boolean(post.createdAt && post.updatedAt) &&
    post.createdAt?.getTime() !== post.updatedAt?.getTime();
  const compactCopy =
    post.displayMode === "media" ? excerpt(post.content, 120) : excerpt(post.content, 110);

  return (
    <article className="forum-card forum-post-card flex h-full flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar
            avatarUrl={post.author.avatarUrl}
            username={post.author.username}
            seed={post.author.uid}
            size="sm"
          />
          <div className="forum-meta-line min-w-0 flex-wrap text-xs">
            <Link
              href={`/profile/${post.author.usernameLower}`}
              className="truncate text-sm font-semibold hover:text-[color:var(--accent-dark)]"
            >
              {post.author.username}
            </Link>
            <span className="forum-meta-dot" />
            <span title={formatAbsoluteDate(post.createdAt)}>
              {formatRelativeDate(post.createdAt)}
            </span>
            <span className="forum-meta-dot" />
            <span>{getForumChannelLabel(post.channel)}</span>
            {post.isPinned ? (
              <>
                <span className="forum-meta-dot" />
                <span className="inline-flex items-center gap-1 text-[color:var(--accent-hot)]">
                  <Pin className="h-3.5 w-3.5" />
                  Épinglé
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="forum-meta-line text-xs">
          <Heart className="h-3.5 w-3.5 text-[color:var(--accent)]" />
          <span>{post.likeCount}</span>
          {wasEdited ? (
            <>
              <span className="forum-meta-dot" />
              <span title={formatAbsoluteDate(post.createdAt)}>
                édité
              </span>
            </>
          ) : null}
        </div>
      </div>

      {post.media.length ? (
        <div className="mt-4">
          <PostMediaGallery media={[post.media[0]]} compact />
          {post.media.length > 1 ? (
            <div className="forum-inline-note mt-2">
              +{post.media.length - 1} média(s)
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex-1">
        {post.title ? (
          <Link href={`/posts/${post.id}`} className="group block">
            <h2 className="forum-title text-[1.9rem] leading-tight transition group-hover:text-[color:var(--accent-dark)] sm:text-[2.3rem]">
              {post.title}
            </h2>
          </Link>
        ) : null}

        {compactCopy ? (
          <p className="forum-muted mt-2 text-sm leading-6">
            {compactCopy}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-[color:var(--line)] pt-3">
        <span className="forum-inline-note">
          {post.displayMode === "media" ? "carte média" : "post"}
        </span>
        <Link
          href={`/posts/${post.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent-dark)]"
        >
          Ouvrir
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
