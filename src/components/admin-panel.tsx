"use client";

import { useDeferredValue, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { Shield, Search, Trash2, UserRound, KeyRound } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { InputShell } from "@/components/input-shell";
import {
  deleteAdminAccessCode,
  deleteAdminUser,
  fetchAdminAccessCodes,
  fetchAdminSession,
  fetchAdminUsers,
  generateAdminAccessCodes,
  setAdminAccessCodeRevoked,
  setAdminUserRole,
} from "@/lib/data/admin";
import type {
  AdminAccessCodeSummary,
  AdminSession,
  AdminUserSummary,
  GeneratedAdminAccessCode,
} from "@/lib/types/admin";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getErrorMessage } from "@/lib/utils/errors";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

function AdminPanelInner() {
  const { configured, loading: authLoading, user } = useAuth();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [accessCodes, setAccessCodes] = useState<AdminAccessCodeSummary[]>([]);
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedAdminAccessCode[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const deferredSearch = useDeferredValue(searchInput.trim());

  async function loadUsers(search = deferredSearch) {
    if (!user) {
      return;
    }

    setLoadingUsers(true);

    try {
      setUsers(await fetchAdminUsers(user, search));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadAccessCodes() {
    if (!user) {
      return;
    }

    setLoadingCodes(true);

    try {
      setAccessCodes(await fetchAdminAccessCodes(user));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingCodes(false);
    }
  }

  useEffect(() => {
    if (!configured || authLoading || !user) {
      return;
    }

    let active = true;

    async function loadAdminData(currentUser: User) {
      setLoadingInitial(true);

      try {
        const nextSession = await fetchAdminSession(currentUser);

        if (!active) {
          return;
        }

        setSession(nextSession);
        setAccessDenied(false);

        const [nextUsers, nextAccessCodes] = await Promise.all([
          fetchAdminUsers(currentUser, ""),
          fetchAdminAccessCodes(currentUser),
        ]);

        if (!active) {
          return;
        }

        setUsers(nextUsers);
        setAccessCodes(nextAccessCodes);
      } catch (error) {
        if (!active) {
          return;
        }

        setSession(null);
        setUsers([]);
        setAccessCodes([]);
        setAccessDenied(true);
        toast.error(getErrorMessage(error));
      } finally {
        if (active) {
          setLoadingInitial(false);
        }
      }
    }

    void loadAdminData(user);

    return () => {
      active = false;
    };
  }, [authLoading, configured, user]);

  useEffect(() => {
    if (!user || !session?.isAdmin || loadingInitial) {
      return;
    }

    let active = true;

    async function syncUsers(currentUser: User) {
      setLoadingUsers(true);

      try {
        const nextUsers = await fetchAdminUsers(currentUser, deferredSearch);

        if (!active) {
          return;
        }

        setUsers(nextUsers);
      } catch (error) {
        if (active) {
          toast.error(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setLoadingUsers(false);
        }
      }
    }

    void syncUsers(user);

    return () => {
      active = false;
    };
  }, [deferredSearch, loadingInitial, session?.isAdmin, user]);

  async function handleToggleAdmin(target: AdminUserSummary) {
    if (!user) {
      return;
    }

    setBusyAction(`user:role:${target.uid}`);

    try {
      await setAdminUserRole(user, target.uid, !target.isAdmin);
      toast.success(
        !target.isAdmin
          ? `${target.username} est maintenant admin.`
          : `Accès admin retiré à ${target.username}.`,
      );
      await loadUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteUser(target: AdminUserSummary) {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      `Supprimer le compte ${target.username} et tout son contenu ?`,
    );

    if (!confirmed) {
      return;
    }

    setBusyAction(`user:delete:${target.uid}`);

    try {
      await deleteAdminUser(user, target.uid);
      toast.success(`Compte supprimé : ${target.username}.`);
      await Promise.all([loadUsers(), loadAccessCodes()]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateCodes() {
    if (!user) {
      return;
    }

    setBusyAction("codes:generate");

    try {
      const nextCodes = await generateAdminAccessCodes(user, {
        count: 1,
        note: noteInput,
      });
      setGeneratedCodes(nextCodes);
      toast.success("Nouveau code généré.");
      await loadAccessCodes();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleToggleCode(accessCode: AdminAccessCodeSummary) {
    if (!user) {
      return;
    }

    setBusyAction(`code:${accessCode.hash}`);

    try {
      await setAdminAccessCodeRevoked(user, accessCode.hash, !accessCode.revoked);
      toast.success(
        accessCode.revoked
          ? "Code réactivé."
          : "Code révoqué.",
      );
      await loadAccessCodes();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteCode(accessCode: AdminAccessCodeSummary) {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      `Supprimer le code ${accessCode.note || accessCode.fingerprint} ?`,
    );

    if (!confirmed) {
      return;
    }

    setBusyAction(`code:delete:${accessCode.hash}`);

    try {
      await deleteAdminAccessCode(user, accessCode.hash);
      toast.success("Code supprimé.");
      await loadAccessCodes();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  if (!configured) {
    return <ForumSetupNotice />;
  }

  if (loadingInitial || authLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center">
        <section className="forum-card w-full p-8 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--line)] border-t-[color:var(--accent)]" />
          <p className="forum-muted mt-5 text-sm">Chargement de l’admin…</p>
        </section>
      </div>
    );
  }

  if (accessDenied || !session?.isAdmin) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
        <section className="forum-card w-full p-8 text-center">
          <h1 className="forum-title text-4xl font-semibold">Accès refusé.</h1>
          <p className="forum-muted mt-4 text-sm">
            Ce compte n’a pas les droits admin.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="forum-grid mx-auto w-full max-w-6xl">
      <section className="forum-card p-6 sm:p-8">
        <div className="forum-section-head">
          <div>
            <span className="forum-pill">
              <Shield className="h-3.5 w-3.5" />
              Admin
            </span>
            <h1 className="forum-title mt-4 text-4xl sm:text-5xl">Administration</h1>
            <p className="forum-muted mt-3 text-sm">
              Connecté en tant que {session.username}.
            </p>
          </div>
        </div>
      </section>

      <section className="forum-card p-6 sm:p-7">
        <div className="forum-section-head">
          <div>
            <h2 className="forum-title mt-4 text-3xl sm:text-4xl">Utilisateurs</h2>
            <div className="forum-meta-line mt-3">
              <span>{users.length} résultat(s)</span>
            </div>
          </div>
        </div>

        <div className="mt-6 max-w-xl">
          <InputShell
            icon={Search}
            placeholder="Rechercher un pseudo…"
            type="search"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
            }}
          />
        </div>

        <div className="mt-8 grid gap-4">
          {loadingUsers ? (
            <div className="forum-card-quiet p-5 text-sm">Chargement…</div>
          ) : users.length ? (
            users.map((target) => (
              <article key={target.uid} className="forum-card-quiet p-5">
                <div className="forum-section-head items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{target.username}</span>
                      {target.isAdmin ? (
                        <span className="forum-pill">admin</span>
                      ) : null}
                      {target.isBootstrapAdmin ? (
                        <span className="forum-inline-note">bootstrap</span>
                      ) : null}
                    </div>
                    <div className="forum-meta-line mt-3">
                      <span>{target.postCount} post(s)</span>
                      <span className="forum-meta-dot" />
                      <span>
                        inscrit le {target.createdAt ? formatAbsoluteDate(new Date(target.createdAt)) : "date inconnue"}
                      </span>
                      <span className="forum-meta-dot" />
                      <span>{target.uid.slice(0, 8)}</span>
                    </div>
                  </div>

                  <div className="forum-toolbar">
                    <button
                      type="button"
                      onClick={() => {
                        void handleToggleAdmin(target);
                      }}
                      disabled={busyAction === `user:role:${target.uid}`}
                      className="forum-button-ghost"
                    >
                      <UserRound className="mr-2 h-4 w-4" />
                      {target.isAdmin ? "Retirer admin" : "Promouvoir admin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDeleteUser(target);
                      }}
                      disabled={busyAction === `user:delete:${target.uid}`}
                      className="forum-button-icon forum-button-icon-danger"
                      aria-label={`Supprimer ${target.username}`}
                      title="Supprimer le compte"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="forum-card-quiet p-5 text-sm">Aucun utilisateur trouvé.</div>
          )}
        </div>
      </section>

      <section className="forum-card p-6 sm:p-7">
        <div className="forum-section-head">
          <div>
            <h2 className="forum-title mt-4 text-3xl sm:text-4xl">Codes d’accès</h2>
            <div className="forum-meta-line mt-3">
              <span>{accessCodes.length} code(s)</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="grid gap-2">
            <span className="forum-inline-note">note</span>
            <input
              className="forum-input"
              placeholder="ex: test avril"
              value={noteInput}
              onChange={(event) => {
                setNoteInput(event.target.value);
              }}
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                void handleGenerateCodes();
              }}
              disabled={busyAction === "codes:generate"}
              className="forum-button-primary"
            >
              <KeyRound className="mr-2 h-4 w-4" />
              {busyAction === "codes:generate" ? "Création…" : "Nouveau code"}
            </button>
          </div>
        </div>

        {generatedCodes.length ? (
          <div className="forum-card-quiet mt-6 p-5">
            <div className="forum-inline-note">copie ce code maintenant</div>
            <div className="mt-4 grid gap-2">
              {generatedCodes.map((code) => (
                <code
                  key={code.hash}
                  className="rounded bg-black/30 px-3 py-2 text-sm text-[color:var(--foreground)]"
                >
                  {code.code}
                </code>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4">
          {loadingCodes ? (
            <div className="forum-card-quiet p-5 text-sm">Chargement…</div>
          ) : accessCodes.length ? (
            accessCodes.map((accessCode) => (
              <article key={accessCode.hash} className="forum-card-quiet p-5">
                <div className="forum-section-head items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">
                        {accessCode.note || accessCode.fingerprint}
                      </span>
                      {accessCode.revoked ? (
                        <span className="forum-pill">révoqué</span>
                      ) : (
                        <span className="forum-pill">actif</span>
                      )}
                    </div>
                    <div className="forum-meta-line mt-3">
                      <span>id {accessCode.fingerprint}</span>
                      <span className="forum-meta-dot" />
                      <span>
                        créé le{" "}
                        {accessCode.createdAt
                          ? formatAbsoluteDate(new Date(accessCode.createdAt))
                          : "date inconnue"}
                      </span>
                      {accessCode.usedByUsername ? (
                        <>
                          <span className="forum-meta-dot" />
                          <span>utilisé par {accessCode.usedByUsername}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="forum-toolbar">
                    <button
                      type="button"
                      onClick={() => {
                        void handleToggleCode(accessCode);
                      }}
                      disabled={
                        busyAction === `code:${accessCode.hash}` ||
                        busyAction === `code:delete:${accessCode.hash}`
                      }
                      className="forum-button-ghost"
                    >
                      {accessCode.revoked ? "Réactiver" : "Révoquer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDeleteCode(accessCode);
                      }}
                      disabled={
                        busyAction === `code:${accessCode.hash}` ||
                        busyAction === `code:delete:${accessCode.hash}` ||
                        Boolean(accessCode.usedByUsername)
                      }
                      className="forum-button-icon forum-button-icon-danger"
                      aria-label={`Supprimer le code ${accessCode.note || accessCode.fingerprint}`}
                      title={
                        accessCode.usedByUsername
                          ? "Supprime d’abord le compte lié à ce code"
                          : "Supprimer le code"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="forum-card-quiet p-5 text-sm">Aucun code enregistré.</div>
          )}
        </div>
      </section>
    </div>
  );
}

export function AdminPanel() {
  return (
    <AuthGuard>
      <AdminPanelInner />
    </AuthGuard>
  );
}
