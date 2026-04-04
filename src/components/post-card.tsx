import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import type { ForumPost } from "@/lib/types/forum";
import { excerpt } from "@/lib/utils/text";
import { formatAbsoluteDate, formatRelativeDate } from "@/lib/utils/date";

type PostCardProps = {
  post: ForumPost;
};

export function PostCard({ post }: PostCardProps) {
  const wasEdited =
    Boolean(post.createdAt && post.updatedAt) &&
    post.createdAt?.getTime() !== post.updatedAt?.getTime();

  return (
    <article className="forum-card flex h-full flex-col p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar username={post.author.username} seed={post.author.uid} />
          <div className="min-w-0">
            <Link
              href={`/profile/${post.author.usernameLower}`}
              className="block truncate text-sm font-semibold hover:text-[color:var(--accent-dark)]"
            >
              {post.author.username}
            </Link>
            <div className="forum-muted mt-1 flex items-center gap-2 text-xs">
              <Clock3 className="h-3.5 w-3.5" />
              <span title={formatAbsoluteDate(post.createdAt)}>
                {formatRelativeDate(post.createdAt)}
              </span>
              {wasEdited ? <span>· modifié</span> : null}
            </div>
          </div>
        </div>
        <span className="forum-pill">Signal</span>
      </div>

      <Link href={`/posts/${post.id}`} className="group mt-6">
        <h2 className="forum-title text-3xl font-semibold leading-tight transition group-hover:text-[color:var(--accent-dark)]">
          {post.title}
        </h2>
      </Link>

      <p className="forum-muted mt-4 flex-1 text-sm leading-7">
        {excerpt(post.content, 200)}
      </p>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-[color:var(--line)] pt-4">
        <span className="forum-muted text-xs">
          {post.content.length} caractères
        </span>
        <Link
          href={`/posts/${post.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent-dark)]"
        >
          Lire
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
