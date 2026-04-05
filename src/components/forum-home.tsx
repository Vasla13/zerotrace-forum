"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  MessageSquareText,
  Plus,
  Search,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { AccessGatewayPanel } from "@/components/access-gateway-panel";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { InputShell } from "@/components/input-shell";
import { PostCard } from "@/components/post-card";
import { fetchFeedPage } from "@/lib/data/posts";
import { type ForumPost } from "@/lib/types/forum";
import { getErrorMessage } from "@/lib/utils/errors";
import { useAuth } from "@/providers/auth-provider";

const manifestoLines = [
  "Fuites, preuves et dossiers.",
  "Interface simple. Lecture rapide.",
  "Publie peu. Publie juste.",
] as const;

const relayTags = ["net", "threads", "preuves", "nœuds"] as const;

export function ForumHome() {
  const { configured, profile, user } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const focusSearch = () => {
      if (window.location.hash !== "#feed-search") {
        return;
      }

      const element = searchInputRef.current;
      if (!element) {
        return;
      }

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        element.focus();
      }, 120);
    };

    focusSearch();
    window.addEventListener("hashchange", focusSearch);

    return () => {
      window.removeEventListener("hashchange", focusSearch);
    };
  }, []);

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
      <section className="forum-card forum-hero-panel overflow-hidden p-6 sm:p-8">
        <div
          className={`forum-hero-grid ${
            user ? "lg:grid-cols-[1.02fr_0.98fr]" : "lg:grid-cols-[1.08fr_0.92fr]"
          }`}
        >
          <div className="flex flex-col justify-between">
            <div>
              <div className="forum-toolbar">
                <span className="forum-pill">
                  <Sparkles className="h-3.5 w-3.5" />
                  NEST
                </span>
              </div>
              <h1 className="forum-title mt-5 max-w-3xl text-4xl leading-none sm:text-5xl lg:text-6xl">
                NEST // NET
              </h1>
              <p className="forum-brief-copy mt-4">
                Forum cyberpunk pour posts, preuves et discussions. Interface
                directe. Lecture rapide.
              </p>
              <div className="forum-meta-line mt-5">
                <strong>{posts.length}</strong>
                <span>{isSearching ? resultLabel : "posts visibles"}</span>
                <span className="forum-meta-dot" />
                <span>cycle 2035</span>
                <span className="forum-meta-dot" />
                <span>
                  {profile
                    ? `connecté : ${profile.username}`
                    : "lecture publique"}
                </span>
              </div>
            </div>

            <div className="mt-6 max-w-2xl">
              <InputShell
                id="feed-search"
                ref={searchInputRef}
                icon={Search}
                placeholder="Rechercher un post, un sujet, un pseudo…"
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
                  Nouveau post
                </Link>
              ) : (
                <>
                  <Link href="/login" className="forum-button-primary">
                    Connexion
                  </Link>
                  <Link href="/#feed-search" className="forum-button-ghost">
                    Explorer
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

          {user ? (
            <div className="forum-hero-visual">
              <div className="forum-toolbar justify-between gap-3">
                <span className="forum-inline-note">interface // cyberpunk 2035</span>
                <span className="forum-pill">
                  <Shield className="h-3.5 w-3.5" />
                  online
                </span>
              </div>
              <div className="forum-meta-line">
                <span>forum</span>
                <span className="forum-meta-dot" />
                <span>public</span>
                <span className="forum-meta-dot" />
                <span>2035</span>
              </div>
              <h2 className="forum-title text-3xl leading-none sm:text-4xl">
                Forum simple. Signal clair.
              </h2>
              <p className="forum-muted max-w-lg text-sm leading-7">
                Pensé pour lire vite, publier vite et garder le focus sur le
                contenu.
              </p>
              <div className="forum-hero-tags">
                {relayTags.map((tag) => (
                  <span key={tag} className="forum-hero-tag">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="forum-divider" />
              <div className="forum-meta-line">
                <span>session</span>
                <span className="forum-meta-dot" />
                <strong>{profile?.username}</strong>
                <span className="forum-meta-dot" />
                <span>{isSearching ? "recherche active" : "forum actif"}</span>
              </div>
            </div>
          ) : (
            <AccessGatewayPanel targetAfterAuth="/" className="h-full" />
          )}
        </div>

        {user ? (
          <div className="forum-manifest">
            <div>
              <div className="forum-inline-note">mode // 2035</div>
              <p className="forum-title mt-3 text-2xl leading-none sm:text-3xl">
                Simple. Lisible. Direct.
              </p>
            </div>
            <div className="forum-manifest-list">
              {manifestoLines.map((line, index) => (
                <div key={line} className="forum-manifest-row">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{line}</p>
                </div>
              ))}
              <div className="forum-manifest-row">
                <span>04</span>
                <p>
                  {isSearching
                    ? "Recherche active."
                    : "Lis vite. Poste utile."}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="forum-card forum-feed-section p-6 sm:p-7">
        <div className="forum-section-head">
          <div>
            <div className="forum-toolbar">
              <span className="forum-pill">
                <MessageSquareText className="h-3.5 w-3.5" />
                {isSearching ? "Recherche" : "Forum"}
              </span>
            </div>
            <h2 className="forum-title mt-4 text-3xl sm:text-4xl">
              {isSearching ? "Résultats" : "Posts récents"}
            </h2>
            <div className="forum-meta-line mt-3">
              <span>
                {isSearching ? resultLabel : "du plus récent au plus ancien"}
              </span>
            </div>
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
                Publier
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
          <div className="forum-feed-grid mt-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="forum-card h-48 animate-pulse bg-[rgba(10,16,34,0.74)] p-6"
              />
            ))}
          </div>
        ) : posts.length ? (
          <>
            <div className="forum-feed-grid mt-8">
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
                  {loadingMore ? "Chargement…" : "Voir plus"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="forum-card-quiet mt-8 flex flex-col items-center justify-center px-6 py-10 text-center">
            <h3 className="forum-title text-2xl sm:text-3xl">
              {isSearching ? "Aucun résultat" : "Aucun post"}
            </h3>
            <p className="forum-muted mt-3 max-w-xl text-sm">
              {isSearching
                ? "Essaie un autre mot-clé."
                : "Sois le premier à poster."}
            </p>
            <div className="mt-6">
              <Link
                href={user ? "/posts/new" : "/login"}
                className="forum-button-primary"
              >
                {user ? "Publier" : "Entrer"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
