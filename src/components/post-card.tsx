import Link from "next/link";
import { ArrowRight, Clock3, Heart } from "lucide-react";
import { Avatar } from "@/components/avatar";
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

  return (
    <article className="forum-card forum-post-card flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar username={post.author.username} seed={post.author.uid} />
          <div className="min-w-0">
            <Link
              href={`/profile/${post.author.usernameLower}`}
              className="block truncate text-sm font-semibold uppercase tracking-[0.14em] hover:text-[color:var(--accent-dark)]"
            >
              {post.author.username}
            </Link>
            <div className="forum-muted mt-1 flex items-center gap-2 text-xs">
              <Clock3 className="h-3.5 w-3.5" />
              <span title={formatAbsoluteDate(post.createdAt)}>
                {formatRelativeDate(post.createdAt)}
              </span>
            </div>
          </div>
        </div>
        {wasEdited ? <span className="forum-inline-note">édité</span> : null}
      </div>

      <Link href={`/posts/${post.id}`} className="group mt-5 block">
        <h2 className="forum-title text-2xl leading-tight transition group-hover:text-[color:var(--accent-dark)] sm:text-3xl">
          {post.title}
        </h2>
      </Link>

      <p className="forum-muted mt-3 flex-1 text-sm leading-7">
        {excerpt(post.content, 160)}
      </p>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-[color:var(--line)] pt-4">
        <span className="forum-meta-line text-sm">
          <Heart className="h-3.5 w-3.5 text-[color:var(--accent)]" />
          <span>{post.likeCount}</span>
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
