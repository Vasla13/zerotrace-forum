"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { InputShell } from "@/components/input-shell";
import {
  deleteForumProfile,
  signOutForumUser,
  updateForumProfile,
} from "@/lib/data/users";
import { deleteForumAvatar, uploadForumAvatar } from "@/lib/data/storage";
import { MAX_AVATAR_BYTES } from "@/lib/utils/media";
import { getErrorMessage } from "@/lib/utils/errors";
import { profileUsernameSchema } from "@/lib/validation/profile";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

function SettingsPageInner() {
  const router = useRouter();
  const { loading, profile, user } = useAuth();
  const [draftUsername, setDraftUsername] = useState("");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

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
      setDraftUsername(nextProfile.username);
      toast.success("Pseudo mis à jour.");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingUsername(false);
    }
  }

  async function handleAvatarSelected(file: File | null) {
    if (!user || !file) {
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("La photo de profil doit faire moins de 5 Mo.");
      return;
    }

    setIsSavingAvatar(true);

    try {
      const avatarUrl = await uploadForumAvatar(user, file);
      await updateForumProfile(user, { avatarUrl });
      toast.success("Photo de profil mise à jour.");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
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
      await updateForumProfile(user, { avatarUrl: null });
      toast.success("Photo de profil supprimée.");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user) {
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
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="forum-card h-72 animate-pulse p-8" />
      </div>
    );
  }

  const usernameCandidate = profileUsernameSchema.safeParse({
    username: draftUsername,
  });
  const canSubmitUsername =
    usernameCandidate.success &&
    draftUsername.trim() !== profile.username &&
    !isSavingUsername;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <section className="forum-card p-6 sm:p-8">
        <div className="forum-section-head items-start">
          <div>
            <div className="forum-pill">Paramètres</div>
            <h1 className="forum-title mt-4 text-4xl sm:text-5xl">Ton compte</h1>
            <p className="forum-muted mt-3 max-w-2xl text-sm leading-7">
              Modifie ton pseudo, ton avatar ou supprime ton compte.
            </p>
          </div>
          <Link
            href={`/profile/${profile.usernameLower}`}
            className="forum-button-ghost"
          >
            Voir le profil
          </Link>
        </div>
      </section>

      <section className="forum-card p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex flex-col items-start gap-4">
            <Avatar
              avatarUrl={profile.avatarUrl}
              username={profile.username}
              seed={profile.uid}
              size="lg"
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void handleAvatarSelected(event.target.files?.[0] ?? null);
              }}
            />
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
                  ? "Changer l’avatar"
                  : "Ajouter un avatar"}
            </button>
            {profile.avatarUrl ? (
              <button
                type="button"
                onClick={() => {
                  void handleRemoveAvatar();
                }}
                disabled={isSavingAvatar}
                className="forum-button-icon forum-button-icon-danger"
                title="Supprimer l’avatar"
                aria-label="Supprimer l’avatar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="forum-inline-note">pseudo</span>
              <InputShell
                icon={UserRound}
                value={draftUsername}
                maxLength={24}
                placeholder="Pseudo"
                onChange={(event) => {
                  setDraftUsername(event.target.value);
                }}
              />
              <div className="forum-muted text-xs">
                3 à 24 caractères, lettres, chiffres ou underscore.
              </div>
            </label>

            <div className="forum-toolbar">
              <button
                type="button"
                onClick={() => {
                  void handleRenameProfile();
                }}
                disabled={!canSubmitUsername}
                className="forum-button-primary"
              >
                {isSavingUsername ? "Mise à jour…" : "Mettre à jour le pseudo"}
              </button>
              <Link href="/posts/new" className="forum-button-ghost">
                Publier
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="forum-card p-6 sm:p-8">
        <div className="forum-section-head items-start">
          <div>
            <div className="forum-pill">Zone sensible</div>
            <h2 className="forum-title mt-4 text-3xl sm:text-4xl">
              Suppression du compte
            </h2>
            <p className="forum-muted mt-3 max-w-2xl text-sm leading-7">
              Cette action efface ton profil, tes posts, tes commentaires et tes médias.
            </p>
          </div>
        </div>

        <div className="mt-6">
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
          void handleDeleteAccount();
        }}
      />
    </div>
  );
}

export function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsPageInner />
    </AuthGuard>
  );
}
