"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, Info, Plus, ShieldAlert, UserRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { InputShell } from "@/components/input-shell";
import { PostCard } from "@/components/post-card";
import { fetchPostsByUser } from "@/lib/data/posts";
import { deleteForumAvatar, uploadForumAvatar } from "@/lib/data/storage";
import {
  deleteForumProfile,
  getUserPostCount,
  getUserProfileByUsername,
  signOutForumUser,
  updateForumProfile,
} from "@/lib/data/users";
import { getForumChannelLabel } from "@/lib/forum/config";
import type { ForumPost, ForumUserProfile } from "@/lib/types/forum";
import {
  formatAbsoluteDate,
  formatJoinedDate,
  formatRelativeDate,
} from "@/lib/utils/date";
import { getErrorMessage } from "@/lib/utils/errors";
import { MAX_AVATAR_BYTES } from "@/lib/utils/media";
import { excerpt, normalizeUsername } from "@/lib/utils/text";
import { profileUsernameSchema } from "@/lib/validation/profile";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

type ProfilePageProps = {
  username: string;
};

type ProfileTab = "about" | "media" | "posts";

const profileTabs: Array<{
  icon: typeof UserRound;
  label: string;
  value: ProfileTab;
}> = [
  {
    icon: UserRound,
    label: "Posts",
    value: "posts",
  },
  {
    icon: ImageIcon,
    label: "Médias",
    value: "media",
  },
  {
    icon: Info,
    label: "À propos",
    value: "about",
  },
];

type ProfileMediaTileProps = {
  post: ForumPost;
};

function ProfileMediaTile({ post }: ProfileMediaTileProps) {
  const primaryMedia = post.media[0];

  if (!primaryMedia) {
    return null;
  }

  return (
    <Link href={`/posts/${post.id}`} className="forum-profile-media-card group">
      <div className="forum-profile-media-preview">
        {primaryMedia.type === "video" ? (
          <video
            src={primaryMedia.url}
            className="forum-profile-media-video"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div
            className="forum-profile-media-image"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.18)), url(${primaryMedia.url})`,
            }}
          />
        )}
        <div className="forum-profile-media-overlay">
          <span className="forum-pill">
            {post.media.length > 1
              ? `${post.media.length} médias`
              : primaryMedia.type === "video"
                ? "vidéo"
                : "image"}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="forum-meta-line flex-wrap text-xs">
          <span>{getForumChannelLabel(post.channel)}</span>
          <span className="forum-meta-dot" />
          <span title={formatAbsoluteDate(post.createdAt)}>
            {formatRelativeDate(post.createdAt)}
          </span>
        </div>
        <h3 className="forum-title mt-3 text-2xl leading-tight sm:text-3xl">
          {post.title || "Carte média"}
        </h3>
        <p className="forum-muted mt-3 text-sm leading-6">
          {post.content ? excerpt(post.content, 110) : "Image ou vidéo publiée sans texte long."}
        </p>
      </div>
    </Link>
  );
}

export function ProfilePage({ username }: ProfilePageProps) {
  const router = useRouter();
  const { configured, profile: currentProfile, user } = useAuth();
  const [profile, setProfile] = useState<ForumUserProfile | null | undefined>(
    undefined,
  );
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [draftUsername, setDraftUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

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
    setActiveTab("posts");
  }, [username]);

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
      const nextProfile = await updateForumProfile(user, values);

      setProfile((current) =>
        current
          ? {
              ...current,
              avatarUrl: current.avatarUrl,
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

  async function handleAvatarSelected(file: File | null) {
    if (!user || !profile || !file) {
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("La photo de profil doit faire moins de 5 Mo.");
      return;
    }

    setIsSavingAvatar(true);

    try {
      const avatarUrl = await uploadForumAvatar(user, file);
      const nextProfile = await updateForumProfile(user, { avatarUrl });

      setProfile((current) =>
        current
          ? {
              ...current,
              avatarUrl: nextProfile.avatarUrl,
            }
          : current,
      );
      setPosts((currentPosts) =>
        currentPosts.map((post) => ({
          ...post,
          author: {
            ...post.author,
            avatarUrl: nextProfile.avatarUrl,
          },
        })),
      );
      toast.success("Photo de profil mise à jour.");
      router.refresh();
    } catch (avatarError) {
      toast.error(getErrorMessage(avatarError));
    } finally {
      setIsSavingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  }

  async function handleRemoveAvatar() {
    if (!user || !profile?.avatarUrl) {
      return;
    }

    setIsSavingAvatar(true);

    try {
      await deleteForumAvatar(user);
      const nextProfile = await updateForumProfile(user, { avatarUrl: null });

      setProfile((current) =>
        current
          ? {
              ...current,
              avatarUrl: nextProfile.avatarUrl,
            }
          : current,
      );
      setPosts((currentPosts) =>
        currentPosts.map((post) => ({
          ...post,
          author: {
            ...post.author,
            avatarUrl: null,
          },
        })),
      );
      toast.success("Photo de profil supprimée.");
      router.refresh();
    } catch (avatarError) {
      toast.error(getErrorMessage(avatarError));
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function handleDeleteAccount(isCurrentUser: boolean) {
    if (!user || !isCurrentUser) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      await deleteForumProfile(user);
      window.sessionStorage.removeItem("nest.signal-gate.seen");
      await signOutForumUser().catch(() => undefined);
      toast.success("Compte supprimé.");
      startTransition(() => {
        router.replace("/login");
      });
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
    } finally {
      setIsDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  }

  if (!configured) {
    return <ForumSetupNotice />;
  }

  if (loading) {
    return (
      <div className="forum-grid mx-auto w-full max-w-6xl">
        <div className="forum-card h-56 animate-pulse p-8" />
        <div className="forum-card h-16 animate-pulse p-4" />
        <div className="forum-card h-72 animate-pulse p-8" />
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
  const mediaPosts = posts.filter((post) => post.media.length > 0);
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
        <div className="forum-profile-hero">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <Avatar
              avatarUrl={profile.avatarUrl}
              username={profile.username}
              seed={profile.uid}
              size="lg"
              className="mt-1"
            />
            <div className="min-w-0">
              <h1 className="forum-title text-4xl sm:text-5xl">{profile.username}</h1>
              <div className="forum-meta-line mt-3 flex-wrap">
                <span>{isCurrentUser ? "ton profil" : "profil public"}</span>
                <span className="forum-meta-dot" />
                <span>inscrit le {formatJoinedDate(profile.createdAt)}</span>
                <span className="forum-meta-dot" />
                <span>{postCount} posts</span>
                <span className="forum-meta-dot" />
                <span>{mediaPosts.length} média(s)</span>
              </div>
              <div className="forum-profile-stat-grid mt-5">
                <div className="forum-stat-chip">
                  <span>posts</span>
                  <strong>{postCount}</strong>
                </div>
                <div className="forum-stat-chip">
                  <span>médias</span>
                  <strong>{mediaPosts.length}</strong>
                </div>
                <div className="forum-stat-chip">
                  <span>accès</span>
                  <strong>{isCurrentUser ? "toi" : "public"}</strong>
                </div>
              </div>
            </div>
          </div>

          {isCurrentUser ? (
            <div className="forum-toolbar">
              <Link href="/posts/new" className="forum-button-primary">
                <Plus className="mr-2 h-4 w-4" />
                Publier
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="forum-card p-3 sm:p-4">
        <div className="forum-tab-strip">
          {profileTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveTab(tab.value);
                }}
                className={
                  activeTab === tab.value
                    ? "forum-tab-button forum-tab-button-active"
                    : "forum-tab-button"
                }
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="forum-card p-6 sm:p-7">
        {activeTab === "posts" ? (
          <>
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
          </>
        ) : null}

        {activeTab === "media" ? (
          <>
            <div className="forum-section-head">
              <div>
                <h2 className="forum-title mt-4 text-3xl sm:text-4xl">Médias</h2>
                <div className="forum-meta-line mt-3">
                  <span>{mediaPosts.length} post(s) avec image ou vidéo</span>
                </div>
              </div>
            </div>

            {mediaPosts.length ? (
              <div className="forum-profile-media-grid mt-8">
                {mediaPosts.map((post) => (
                  <ProfileMediaTile key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="forum-card-quiet mt-8 px-6 py-10 text-center">
                <h3 className="forum-title text-2xl sm:text-3xl">
                  Aucun média
                </h3>
                <p className="forum-muted mt-3 text-sm">
                  Aucun post média visible sur ce profil.
                </p>
              </div>
            )}
          </>
        ) : null}

        {activeTab === "about" ? (
          <>
            <div className="forum-section-head">
              <div>
                <h2 className="forum-title mt-4 text-3xl sm:text-4xl">À propos</h2>
                <div className="forum-meta-line mt-3">
                  <span>
                    {isCurrentUser
                      ? "Gère ton identité et ton compte ici."
                      : "Vue d’ensemble du profil."}
                  </span>
                </div>
              </div>
            </div>

            <div className="forum-profile-about-grid mt-8">
              <article className="forum-card-quiet p-5 sm:p-6">
                <div className="forum-inline-note">profil</div>
                <div className="forum-profile-fact-list mt-4">
                  <div className="forum-profile-fact">
                    <span>Pseudo</span>
                    <strong>{profile.username}</strong>
                  </div>
                  <div className="forum-profile-fact">
                    <span>Inscription</span>
                    <strong>{formatJoinedDate(profile.createdAt)}</strong>
                  </div>
                  <div className="forum-profile-fact">
                    <span>Posts</span>
                    <strong>{postCount}</strong>
                  </div>
                  <div className="forum-profile-fact">
                    <span>Posts média</span>
                    <strong>{mediaPosts.length}</strong>
                  </div>
                </div>
              </article>

              {isCurrentUser ? (
                <>
                  <article className="forum-card-quiet p-5 sm:p-6">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void handleAvatarSelected(event.target.files?.[0] ?? null);
                      }}
                    />
                    <div className="forum-inline-note">photo de profil</div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          avatarInputRef.current?.click();
                        }}
                        disabled={isSavingAvatar}
                        className="forum-button-ghost"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        {isSavingAvatar
                          ? "Envoi…"
                          : profile.avatarUrl
                            ? "Changer la photo"
                            : "Ajouter une photo"}
                      </button>
                      {profile.avatarUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            void handleRemoveAvatar();
                          }}
                          disabled={isSavingAvatar}
                          className="forum-button-secondary"
                        >
                          Retirer
                        </button>
                      ) : null}
                    </div>
                    <p className="forum-muted mt-4 text-sm">
                      Image inférieure à 5 Mo. Le rendu est mis à jour sur tes posts.
                    </p>
                  </article>

                  <article className="forum-card-quiet p-5 sm:p-6">
                    <div className="forum-inline-note">pseudo</div>
                    <div className="mt-4 grid gap-3">
                      <InputShell
                        icon={UserRound}
                        value={draftUsername}
                        maxLength={24}
                        placeholder="Pseudo"
                        onChange={(event) => {
                          setDraftUsername(event.target.value);
                        }}
                      />
                      <div className="forum-toolbar">
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
                      </div>
                      <p className="forum-muted text-xs">
                        3 à 24 caractères. Les anciens posts suivent le nouveau pseudo.
                      </p>
                    </div>
                  </article>

                  <article className="forum-card-quiet p-5 sm:p-6">
                    <div className="forum-inline-note">compte</div>
                    <p className="forum-muted mt-4 text-sm leading-7">
                      Si tu supprimes ton compte, tes posts, tes réponses et ton accès
                      seront retirés du forum.
                    </p>
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteDialogOpen(true);
                        }}
                        className="forum-button-danger-solid"
                      >
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        Supprimer mon compte
                      </button>
                    </div>
                  </article>
                </>
              ) : (
                <article className="forum-card-quiet p-5 sm:p-6">
                  <div className="forum-inline-note">activité</div>
                  <p className="forum-muted mt-4 text-sm leading-7">
                    Consulte les posts publics et les médias publiés par ce profil dans
                    les autres onglets.
                  </p>
                </article>
              )}
            </div>
          </>
        ) : null}
      </section>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Supprimer ton compte ?"
        description="Tout ton contenu sera retiré du forum. Cette action est définitive."
        confirmLabel="Supprimer le compte"
        tone="danger"
        busy={isDeletingAccount}
        onClose={() => {
          if (!isDeletingAccount) {
            setDeleteDialogOpen(false);
          }
        }}
        onConfirm={() => {
          void handleDeleteAccount(isCurrentUser);
        }}
      />
    </div>
  );
}
