"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  Flag,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { InputShell } from "@/components/input-shell";
import {
  deleteAdminReport,
  deleteAdminUser,
  fetchAdminReports,
  fetchAdminSession,
  fetchAdminUsers,
  setAdminReportResolved,
  setAdminUserCertification,
  setAdminUserRole,
} from "@/lib/data/admin";
import type {
  AdminReportSummary,
  AdminSession,
  AdminUserSummary,
} from "@/lib/types/admin";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getErrorMessage } from "@/lib/utils/errors";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

type AdminTab = "users" | "certifications" | "reports";

type AdminDialogState =
  | { kind: "delete-user"; target: AdminUserSummary }
  | { kind: "delete-report"; target: AdminReportSummary }
  | null;

function formatAdminDate(value: string | null) {
  return value ? formatAbsoluteDate(new Date(value)) : "date inconnue";
}

function CertificationBadge({ user }: { user: AdminUserSummary }) {
  if (user.certificationStatus === "approved") {
    return <span className="forum-pill">certifié</span>;
  }

  if (user.certificationStatus === "pending") {
    return <span className="forum-pill">en attente</span>;
  }

  return null;
}

function AdminPanelInner() {
  const { configured, loading: authLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [session, setSession] = useState<AdminSession | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [dialogState, setDialogState] = useState<AdminDialogState>(null);

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

  async function loadReports() {
    if (!user) {
      return;
    }

    setLoadingReports(true);

    try {
      setReports(await fetchAdminReports(user));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingReports(false);
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

        const [nextUsers, nextReports] = await Promise.all([
          fetchAdminUsers(currentUser, ""),
          fetchAdminReports(currentUser),
        ]);

        if (!active) {
          return;
        }

        setUsers(nextUsers);
        setReports(nextReports);
      } catch (error) {
        if (!active) {
          return;
        }

        setSession(null);
        setUsers([]);
        setReports([]);
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

  async function handleCertification(
    target: AdminUserSummary,
    certificationStatus: "approved" | "none",
  ) {
    if (!user) {
      return;
    }

    setBusyAction(`user:cert:${target.uid}`);

    try {
      await setAdminUserCertification(user, target.uid, certificationStatus);
      toast.success(
        certificationStatus === "approved"
          ? `${target.username} est certifié.`
          : `Certification retirée pour ${target.username}.`,
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

    setBusyAction(`user:delete:${target.uid}`);

    try {
      await deleteAdminUser(user, target.uid);
      toast.success(`Compte supprimé : ${target.username}.`);
      await Promise.all([loadUsers(), loadReports()]);
      setDialogState(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleToggleReportResolved(report: AdminReportSummary) {
    if (!user) {
      return;
    }

    setBusyAction(`report:${report.id}`);

    try {
      await setAdminReportResolved(user, report.id, !report.resolved);
      toast.success(report.resolved ? "Signalement rouvert." : "Signalement résolu.");
      await loadReports();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteReport(report: AdminReportSummary) {
    if (!user) {
      return;
    }

    setBusyAction(`report:delete:${report.id}`);

    try {
      await deleteAdminReport(user, report.id);
      toast.success("Signalement supprimé.");
      await loadReports();
      setDialogState(null);
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

  const certificationUsers = users.filter(
    (target) => target.certificationStatus !== "none",
  );

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

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("users");
            }}
            className={activeTab === "users" ? "forum-button-primary" : "forum-button-ghost"}
          >
            Utilisateurs ({users.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("certifications");
            }}
            className={
              activeTab === "certifications"
                ? "forum-button-primary"
                : "forum-button-ghost"
            }
          >
            Certifications (
            {users.filter((target) => target.certificationStatus === "pending").length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("reports");
            }}
            className={activeTab === "reports" ? "forum-button-primary" : "forum-button-ghost"}
          >
            Signalements ({reports.filter((report) => !report.resolved).length})
          </button>
        </div>
      </section>

      {activeTab === "users" ? (
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
                        {target.isAdmin ? <span className="forum-pill">admin</span> : null}
                        <CertificationBadge user={target} />
                        {target.isBootstrapAdmin ? (
                          <span className="forum-inline-note">bootstrap</span>
                        ) : null}
                      </div>
                      <div className="forum-meta-line mt-3">
                        <span>{target.postCount} post(s)</span>
                        <span className="forum-meta-dot" />
                        <span>inscrit le {formatAdminDate(target.createdAt)}</span>
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
                          void handleCertification(
                            target,
                            target.certificationStatus === "approved" ? "none" : "approved",
                          );
                        }}
                        disabled={busyAction === `user:cert:${target.uid}`}
                        className="forum-button-ghost"
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        {target.certificationStatus === "approved"
                          ? "Retirer certif"
                          : "Certifier"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDialogState({ kind: "delete-user", target });
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
      ) : null}

      {activeTab === "certifications" ? (
        <section className="forum-card p-6 sm:p-7">
          <div className="forum-section-head">
            <div>
              <h2 className="forum-title mt-4 text-3xl sm:text-4xl">Certifications</h2>
              <div className="forum-meta-line mt-3">
                <span>{certificationUsers.length} dossier(s)</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            {loadingUsers ? (
              <div className="forum-card-quiet p-5 text-sm">Chargement…</div>
            ) : certificationUsers.length ? (
              certificationUsers
                .sort((firstUser, secondUser) => {
                  if (
                    firstUser.certificationStatus === "pending" &&
                    secondUser.certificationStatus !== "pending"
                  ) {
                    return -1;
                  }

                  if (
                    secondUser.certificationStatus === "pending" &&
                    firstUser.certificationStatus !== "pending"
                  ) {
                    return 1;
                  }

                  return (secondUser.createdAt ?? "").localeCompare(firstUser.createdAt ?? "");
                })
                .map((target) => (
                  <article key={target.uid} className="forum-card-quiet p-5">
                    <div className="forum-section-head items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">{target.username}</span>
                          <CertificationBadge user={target} />
                        </div>
                        <div className="forum-meta-line mt-3">
                          {target.certificationRequestedAt ? (
                            <>
                              <span>
                                demandé le {formatAdminDate(target.certificationRequestedAt)}
                              </span>
                              <span className="forum-meta-dot" />
                            </>
                          ) : null}
                          {target.certifiedAt ? (
                            <>
                              <span>
                                validé le {formatAdminDate(target.certifiedAt)}
                              </span>
                              <span className="forum-meta-dot" />
                            </>
                          ) : null}
                          <span>{target.postCount} post(s)</span>
                        </div>
                      </div>

                      <div className="forum-toolbar">
                        {target.certificationStatus !== "approved" ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleCertification(target, "approved");
                            }}
                            disabled={busyAction === `user:cert:${target.uid}`}
                            className="forum-button-primary"
                          >
                            Valider
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              void handleCertification(target, "none");
                            }}
                            disabled={busyAction === `user:cert:${target.uid}`}
                            className="forum-button-ghost"
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
            ) : (
              <div className="forum-card-quiet p-5 text-sm">
                Aucune demande de certification pour le moment.
              </div>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "reports" ? (
        <section className="forum-card p-6 sm:p-7">
          <div className="forum-section-head">
            <div>
              <h2 className="forum-title mt-4 text-3xl sm:text-4xl">Signalements</h2>
              <div className="forum-meta-line mt-3">
                <span>{reports.length} signalement(s)</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            {loadingReports ? (
              <div className="forum-card-quiet p-5 text-sm">Chargement…</div>
            ) : reports.length ? (
              reports.map((report) => (
                <article key={report.id} className="forum-card-quiet p-5">
                  <div className="forum-section-head items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">
                          {report.kind === "comment" ? "Commentaire" : "Post"}
                        </span>
                        <span className="forum-inline-note">
                          cible : {report.targetAuthorUsername}
                        </span>
                        {report.resolved ? (
                          <span className="forum-pill">résolu</span>
                        ) : (
                          <span className="forum-pill">ouvert</span>
                        )}
                      </div>
                      <div className="forum-meta-line mt-3">
                        <span>signalé par {report.reportedByUsername}</span>
                        <span className="forum-meta-dot" />
                        <span>{formatAdminDate(report.createdAt)}</span>
                      </div>
                      {report.postTitle ? (
                        <div className="mt-4 text-sm font-semibold text-white">
                          {report.postTitle}
                        </div>
                      ) : null}
                      <p className="forum-muted mt-2 text-sm leading-6">
                        {report.previewText}
                      </p>
                    </div>

                    <div className="forum-toolbar">
                      <Link href={`/posts/${report.postId}`} className="forum-button-ghost">
                        <Flag className="mr-2 h-4 w-4" />
                        Ouvrir
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          void handleToggleReportResolved(report);
                        }}
                        disabled={
                          busyAction === `report:${report.id}` ||
                          busyAction === `report:delete:${report.id}`
                        }
                        className="forum-button-ghost"
                      >
                        {report.resolved ? "Rouvrir" : "Résoudre"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDialogState({ kind: "delete-report", target: report });
                        }}
                        disabled={
                          busyAction === `report:${report.id}` ||
                          busyAction === `report:delete:${report.id}`
                        }
                        className="forum-button-icon forum-button-icon-danger"
                        aria-label="Supprimer le signalement"
                        title="Supprimer le signalement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="forum-card-quiet p-5 text-sm">Aucun signalement.</div>
            )}
          </div>
        </section>
      ) : null}

      <ConfirmDialog
        open={dialogState !== null}
        title={
          dialogState?.kind === "delete-user"
            ? "Supprimer ce compte ?"
            : "Supprimer ce signalement ?"
        }
        description={
          dialogState?.kind === "delete-user"
            ? `Le compte ${dialogState.target.username} sera supprimé. Ses posts, réponses et likes resteront visibles.`
            : dialogState?.kind === "delete-report"
              ? "Le signalement sera retiré de la file admin."
              : ""
        }
        confirmLabel="Supprimer"
        tone="danger"
        busy={
          dialogState?.kind === "delete-user"
            ? busyAction === `user:delete:${dialogState.target.uid}`
            : dialogState?.kind === "delete-report"
              ? busyAction === `report:delete:${dialogState.target.id}`
              : false
        }
        onClose={() => {
          if (!busyAction) {
            setDialogState(null);
          }
        }}
        onConfirm={() => {
          if (dialogState?.kind === "delete-user") {
            void handleDeleteUser(dialogState.target);
            return;
          }

          if (dialogState?.kind === "delete-report") {
            void handleDeleteReport(dialogState.target);
          }
        }}
      />
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
