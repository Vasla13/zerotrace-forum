"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, FileText, Plus } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { PostCard } from "@/components/post-card";
import { fetchPostsByUser } from "@/lib/data/posts";
import { getUserPostCount, getUserProfileByUsername } from "@/lib/data/users";
import type { ForumPost, ForumUserProfile } from "@/lib/types/forum";
import { formatJoinedDate } from "@/lib/utils/date";
import { getErrorMessage } from "@/lib/utils/errors";
import { normalizeUsername } from "@/lib/utils/text";
import { useAuth } from "@/providers/auth-provider";

type ProfilePageProps = {
  username: string;
};

export function ProfilePage({ username }: ProfilePageProps) {
  const { configured, profile: currentProfile } = useAuth();
  const [profile, setProfile] = useState<ForumUserProfile | null | undefined>(
    undefined,
  );
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      return;
    }

    let active = true;
    const normalized = normalizeUsername(username);

    async function loadProfile() {
      setLoading(true);
      try {
        const nextProfile = await getUserProfileByUsername(normalized);

        if (!active) {
          return;
        }

        if (!nextProfile) {
          setProfile(null);
          setPosts([]);
          setPostCount(0);
          setError(null);
          return;
        }

        const [nextPosts, nextPostCount] = await Promise.all([
          fetchPostsByUser(nextProfile.uid, 12),
          getUserPostCount(nextProfile.uid),
        ]);

        if (!active) {
          return;
        }

        setProfile(nextProfile);
        setPosts(nextPosts);
        setPostCount(nextPostCount);
        setError(null);
      } catch (nextError) {
        if (!active) {
          return;
        }

        setError(getErrorMessage(nextError));
        setProfile(undefined);
        setPosts([]);
        setPostCount(0);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [configured, username]);

  if (!configured) {
    return <ForumSetupNotice />;
  }

  if (loading) {
    return (
      <div className="forum-grid mx-auto w-full max-w-6xl">
        <div className="forum-card h-56 animate-pulse p-8" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="forum-card h-48 animate-pulse p-8" />
          <div className="forum-card h-48 animate-pulse p-8" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
        <section className="forum-card w-full p-8 text-center">
          <h1 className="forum-title text-4xl font-semibold">
            Impossible de charger ce profil.
          </h1>
          <p className="mt-4 text-sm text-[color:var(--danger)]">{error}</p>
        </section>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
        <section className="forum-card w-full p-8 text-center">
          <h1 className="forum-title text-4xl font-semibold">
            Utilisateur introuvable.
          </h1>
          <p className="forum-muted mt-4 text-sm">
            Ce pseudo n’existe pas encore dans le forum.
          </p>
        </section>
      </div>
    );
  }

  const isCurrentUser = currentProfile?.uid === profile.uid;

  return (
    <div className="forum-grid mx-auto w-full max-w-6xl">
      <section className="forum-card overflow-hidden p-6 sm:p-8">
        <div className="forum-section-head">
          <div className="flex items-start gap-4">
            <Avatar
              username={profile.username}
              seed={profile.uid}
              size="lg"
              className="mt-1"
            />
            <div>
              <span className="forum-pill">
                {isCurrentUser ? "Ton profil" : "Profil public"}
              </span>
              <h1 className="forum-title mt-4 text-4xl font-semibold sm:text-5xl">
                {profile.username}
              </h1>
              <p className="forum-muted mt-3 text-sm">
                Actif depuis {formatJoinedDate(profile.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="forum-stat-chip">
              <CalendarDays className="h-3.5 w-3.5 text-[color:var(--accent)]" />
              <strong>{formatJoinedDate(profile.createdAt)}</strong>
            </span>
            <span className="forum-stat-chip">
              <FileText className="h-3.5 w-3.5 text-[color:var(--accent-secondary)]" />
              <strong>{postCount}</strong>
              posts
            </span>
            {isCurrentUser ? (
              <Link href="/posts/new" className="forum-button-primary">
                <Plus className="mr-2 h-4 w-4" />
                Poster
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="forum-card p-6 sm:p-7">
        <div className="forum-section-head">
          <div>
            <span className="forum-pill">Flux</span>
            <h2 className="forum-title mt-4 text-3xl font-semibold sm:text-4xl">
              Posts de {profile.username}
            </h2>
          </div>
          <span className="forum-inline-note">12 derniers</span>
        </div>

        {posts.length ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="forum-card-quiet mt-8 px-6 py-10 text-center">
            <h3 className="forum-title text-2xl font-semibold sm:text-3xl">
              Aucun post
            </h3>
            <p className="forum-muted mt-3 text-sm">Aucun signal publié.</p>
          </div>
        )}
      </section>
    </div>
  );
}
