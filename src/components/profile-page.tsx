"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { InputShell } from "@/components/input-shell";
import { PostCard } from "@/components/post-card";
import { fetchPostsByUser } from "@/lib/data/posts";
import {
  getUserPostCount,
  getUserProfileByUsername,
  renameForumUser,
} from "@/lib/data/users";
import type { ForumPost, ForumUserProfile } from "@/lib/types/forum";
import { formatJoinedDate } from "@/lib/utils/date";
import { getErrorMessage } from "@/lib/utils/errors";
import { normalizeUsername } from "@/lib/utils/text";
import { profileUsernameSchema } from "@/lib/validation/profile";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

type ProfilePageProps = {
  username: string;
};

export function ProfilePage({ username }: ProfilePageProps) {
  const router = useRouter();
  const { configured, profile: currentProfile, user } = useAuth();
  const [profile, setProfile] = useState<ForumUserProfile | null | undefined>(
    undefined,
  );
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [draftUsername, setDraftUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
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

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDraftUsername(profile.username);
  }, [profile]);

  async function handleRenameProfile() {
    if (!user || !profile) {
      return;
    }

    setIsSavingUsername(true);

    try {
      const values = profileUsernameSchema.parse({
        username: draftUsername,
      });
      const nextProfile = await renameForumUser(user, values);

      setProfile((current) =>
        current
          ? {
              ...current,
              username: nextProfile.username,
              usernameLower: nextProfile.usernameLower,
            }
          : current,
      );
      setPosts((currentPosts) =>
        currentPosts.map((post) => ({
          ...post,
          author: {
            ...post.author,
            username: nextProfile.username,
            usernameLower: nextProfile.usernameLower,
          },
        })),
      );
      setDraftUsername(nextProfile.username);
      toast.success("Pseudo mis à jour.");

      startTransition(() => {
        router.replace(`/profile/${nextProfile.usernameLower}`);
        router.refresh();
      });
    } catch (renameError) {
      toast.error(getErrorMessage(renameError));
    } finally {
      setIsSavingUsername(false);
    }
  }

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
  const trimmedDraftUsername = draftUsername.trim();
  const usernameCandidate = profileUsernameSchema.safeParse({
    username: draftUsername,
  });
  const canSubmitUsername =
    usernameCandidate.success &&
    trimmedDraftUsername !== profile.username &&
    !isSavingUsername;

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
              <h1 className="forum-title mt-4 text-4xl sm:text-5xl">{profile.username}</h1>
              <div className="forum-meta-line mt-3">
                <span>{isCurrentUser ? "ton profil" : "profil public"}</span>
                <span className="forum-meta-dot" />
                <span>inscrit le {formatJoinedDate(profile.createdAt)}</span>
                <span className="forum-meta-dot" />
                <strong>{postCount} posts</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {isCurrentUser ? (
              <div className="grid w-full max-w-sm gap-3">
                <div className="forum-inline-note">ton pseudo</div>
                <InputShell
                  icon={UserRound}
                  value={draftUsername}
                  maxLength={24}
                  placeholder="Pseudo"
                  onChange={(event) => {
                    setDraftUsername(event.target.value);
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleRenameProfile();
                    }}
                    disabled={!canSubmitUsername}
                    className="forum-button-ghost"
                  >
                    {isSavingUsername ? "Mise à jour…" : "Changer le pseudo"}
                  </button>
                  <Link href="/posts/new" className="forum-button-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau post
                  </Link>
                </div>
                <div className="forum-muted text-xs">
                  3 à 24 caractères. Lettres, chiffres, underscore.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="forum-card p-6 sm:p-7">
        <div className="forum-section-head">
          <div>
            <h2 className="forum-title mt-4 text-3xl sm:text-4xl">
              Posts de {profile.username}
            </h2>
            <div className="forum-meta-line mt-3">
              <span>12 plus récents</span>
            </div>
          </div>
          <div className="forum-muted text-sm">
            {isCurrentUser ? "ton activité" : "activité publique"}
          </div>
        </div>

        {posts.length ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="forum-card-quiet mt-8 px-6 py-10 text-center">
            <h3 className="forum-title text-2xl sm:text-3xl">
              Aucun post
            </h3>
            <p className="forum-muted mt-3 text-sm">Aucun post publié.</p>
          </div>
        )}
      </section>
    </div>
  );
}
