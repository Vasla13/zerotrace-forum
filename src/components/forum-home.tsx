"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import {
  ArrowRight,
  MessageSquareText,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { InputShell } from "@/components/input-shell";
import { PostCard } from "@/components/post-card";
import { fetchFeedPage } from "@/lib/data/posts";
import { type ForumPost } from "@/lib/types/forum";
import { getErrorMessage } from "@/lib/utils/errors";
import { useAuth } from "@/providers/auth-provider";

export function ForumHome() {
  const { configured, profile, user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(
    null,
  );
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(searchInput.trim());
  const isSearching = deferredSearch.length > 0;

  useEffect(() => {
    if (!configured) {
      return;
    }

    let active = true;

    async function loadFirstPage() {
      setLoading(true);
      try {
        const page = await fetchFeedPage({
          pageSize: 8,
          search: deferredSearch,
        });

        if (!active) {
          return;
        }

        setPosts(page.posts);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setError(null);
      } catch (nextError) {
        if (!active) {
          return;
        }

        setError(getErrorMessage(nextError));
        setPosts([]);
        setCursor(null);
        setHasMore(false);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadFirstPage();

    return () => {
      active = false;
    };
  }, [configured, deferredSearch]);

  async function handleLoadMore() {
    if (!cursor) {
      return;
    }

    setLoadingMore(true);
    try {
      const nextPage = await fetchFeedPage({
        cursor,
        pageSize: 8,
      });

      setPosts((currentPosts) => [...currentPosts, ...nextPage.posts]);
      setCursor(nextPage.nextCursor);
      setHasMore(nextPage.hasMore);
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoadingMore(false);
    }
  }

  if (!configured) {
    return <ForumSetupNotice />;
  }

  const resultLabel = `${posts.length} ${posts.length > 1 ? "résultats" : "résultat"}`;

  return (
    <div className="forum-grid w-full">
      <section className="forum-card grid gap-6 overflow-hidden p-6 sm:p-8 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="flex flex-col justify-between">
          <div>
            <div className="forum-toolbar">
              <span className="forum-pill">
                <Sparkles className="h-3.5 w-3.5" />
                ZeroTrace
              </span>
              <span className="forum-stat-chip">
                <MessageSquareText className="h-3.5 w-3.5 text-[color:var(--accent)]" />
                <strong>{posts.length}</strong>
                {isSearching ? "match" : "live"}
              </span>
            </div>
            <h1 className="forum-title mt-5 max-w-3xl text-4xl font-semibold leading-none sm:text-5xl lg:text-6xl">
              Trouve le bon thread. Coupe le bruit.
            </h1>
            <p className="forum-muted mt-4 max-w-xl text-sm">
              Publie vite. Réponds net. Reste sur l’essentiel.
            </p>
          </div>

          <div className="mt-6 max-w-2xl">
            <InputShell
              icon={Search}
              placeholder="Recherche directe…"
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
            />
          </div>

          <div className="forum-toolbar mt-4">
            {user ? (
              <Link href="/posts/new" className="forum-button-primary">
                <Plus className="mr-2 h-4 w-4" />
                Poster
              </Link>
            ) : (
              <>
                <Link href="/register" className="forum-button-primary">
                  Entrer
                </Link>
                <Link href="/login" className="forum-button-ghost">
                  Connexion
                </Link>
              </>
            )}
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                }}
                className="forum-button-ghost"
              >
                <X className="mr-2 h-4 w-4" />
                Effacer
              </button>
            ) : null}
          </div>
        </div>

        <div className="forum-signal-panel">
          <div className="forum-inline-note">signal mesh</div>
          <div className="mt-4 forum-signal-grid">
            {Array.from({ length: 12 }).map((_, index) => {
              const isActive = [0, 1, 4, 7, 8, 10].includes(index);
              const isSecondary = [5, 11].includes(index);

              return (
                <span
                  key={index}
                  className={[
                    "forum-signal-cell",
                    isActive ? "forum-signal-cell-active" : "",
                    isSecondary ? "forum-signal-cell-secondary" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              );
            })}
          </div>
          <div className="forum-divider mt-5" />
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="forum-stat-chip justify-between">
              <span>Flux</span>
              <strong>ouvert</strong>
            </div>
            <div className="forum-stat-chip justify-between">
              <span>Mode</span>
              <strong>posts</strong>
            </div>
            <div className="forum-stat-chip justify-between">
              <span>Recherche</span>
              <strong>{isSearching ? "active" : "idle"}</strong>
            </div>
          </div>
          <div className="mt-5 text-sm text-[color:var(--foreground)]">
            {profile ? `Connecté : ${profile.username}` : "Lecture publique immédiate"}
          </div>
          <p className="forum-muted mt-2 text-sm">
            Le cœur du forum reste visible sans surcharge.
          </p>
        </div>
      </section>

      <section className="forum-card p-6 sm:p-7">
        <div className="forum-section-head">
          <div>
            <div className="forum-toolbar">
              <span className="forum-pill">
                <MessageSquareText className="h-3.5 w-3.5" />
                {isSearching ? "Recherche" : "Flux"}
              </span>
              <span className="forum-inline-note">
                {isSearching ? resultLabel : "plus récent d’abord"}
              </span>
            </div>
            <h2 className="forum-title mt-4 text-3xl font-semibold sm:text-4xl">
              {isSearching ? "Résultats" : "Posts récents"}
            </h2>
          </div>
          <div className="forum-toolbar">
            {isSearching ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                }}
                className="forum-button-ghost"
              >
                Tout voir
              </button>
            ) : null}
            {user ? (
              <Link href="/posts/new" className="forum-button-ghost">
                Écrire
              </Link>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="forum-card-quiet mt-6 border border-[rgba(255,92,122,0.24)] bg-[rgba(50,10,22,0.72)] p-4 text-sm text-[#ff9ab0]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="forum-card h-48 animate-pulse bg-[rgba(10,16,34,0.74)] p-6"
              />
            ))}
          </div>
        ) : posts.length ? (
          <>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            {!isSearching && hasMore ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="forum-button-ghost"
                >
                  {loadingMore ? "Chargement…" : "Suite"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="forum-card-quiet mt-8 flex flex-col items-center justify-center px-6 py-10 text-center">
            <h3 className="forum-title text-2xl font-semibold sm:text-3xl">
              {isSearching ? "Aucun résultat" : "Aucun post"}
            </h3>
            <p className="forum-muted mt-3 max-w-xl text-sm">
              {isSearching ? "Essaie un autre mot-clé." : "Ouvre le premier sujet."}
            </p>
            <div className="mt-6">
              <Link
                href={user ? "/posts/new" : "/register"}
                className="forum-button-primary"
              >
                {user ? "Poster" : "Entrer"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
