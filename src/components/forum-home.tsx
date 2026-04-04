"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { ArrowRight, MessageSquareText, Plus, Search, Sparkles } from "lucide-react";
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

  return (
    <div className="forum-grid w-full">
      <section className="forum-card grid gap-8 overflow-hidden p-8 sm:p-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="forum-pill">
            <Sparkles className="h-3.5 w-3.5" />
            ZeroTrace
          </span>
          <h1 className="forum-title mt-6 max-w-3xl text-5xl font-semibold leading-none sm:text-6xl">
            Un forum net, vivant, sous tension.
          </h1>
          <p className="forum-muted mt-5 max-w-xl text-sm">
            Publie. Réponds. Retrouve vite le bon sujet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link href="/posts/new" className="forum-button-primary">
                <Plus className="mr-2 h-4 w-4" />
                Écrire un post
              </Link>
            ) : (
              <>
                <Link href="/register" className="forum-button-primary">
                  Créer un compte
                </Link>
                <Link href="/login" className="forum-button-secondary">
                  Se connecter
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="forum-card-quiet p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-secondary)]">
              Flux
            </p>
            <p className="mt-3 text-lg font-semibold">
              {profile ? `Bienvenue ${profile.username}` : "Interface clean"}
            </p>
          </div>
          <div className="forum-card-quiet p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-secondary)]">
              Système
            </p>
            <p className="mt-3 text-lg font-semibold">Auth, profils, recherche.</p>
          </div>
          <div className="forum-card-quiet p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-secondary)]">
              Live
            </p>
            <p className="mt-3 text-lg font-semibold">Posts et commentaires actifs.</p>
          </div>
        </div>
      </section>

      <section className="forum-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="forum-pill">
              <MessageSquareText className="h-3.5 w-3.5" />
              Flux
            </span>
            <h2 className="forum-title mt-4 text-4xl font-semibold">
              {isSearching ? "Résultats" : "Derniers posts"}
            </h2>
            <p className="forum-muted mt-2 text-sm">Du plus récent au plus ancien.</p>
          </div>

          <InputShell
            icon={Search}
            shellClassName="w-full max-w-xl"
            placeholder="Rechercher un post, un sujet, un mot-clé…"
            type="search"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
            }}
          />
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
                className="forum-card h-60 animate-pulse bg-[rgba(10,16,34,0.74)] p-6"
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
                  className="forum-button-secondary"
                >
                  {loadingMore ? "Chargement…" : "Charger plus"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="forum-card-quiet mt-8 flex flex-col items-center justify-center px-6 py-12 text-center">
            <h3 className="forum-title text-3xl font-semibold">
              {isSearching ? "Aucun résultat." : "Le forum est vide."}
            </h3>
            <p className="forum-muted mt-3 max-w-xl text-sm">
              {isSearching ? "Essaie un autre mot-clé." : "Crée le premier sujet."}
            </p>
            <div className="mt-6">
              <Link
                href={user ? "/posts/new" : "/register"}
                className="forum-button-primary"
              >
                {user ? "Créer le premier post" : "Créer un compte"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
