"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import {
  ArrowRight,
  MessageSquareText,
  Pin,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { InputShell } from "@/components/input-shell";
import { PostCard } from "@/components/post-card";
import {
  forumChannelLabels,
  forumChannelValues,
  forumFeedFilterLabels,
  forumFeedFilterValues,
  type ForumFeedFilter,
} from "@/lib/forum/config";
import { fetchFeedPage, fetchPinnedPost } from "@/lib/data/posts";
import type { FeedChannelFilter, ForumPost } from "@/lib/types/forum";
import { getErrorMessage } from "@/lib/utils/errors";
import { useAuth } from "@/providers/auth-provider";

export function ForumHome() {
  const { configured, profile, user } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<ForumFeedFilter>("recent");
  const [activeChannel, setActiveChannel] = useState<FeedChannelFilter>("all");
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [pinnedPost, setPinnedPost] = useState<ForumPost | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(
    null,
  );
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(searchInput.trim());
  const isSearching = deferredSearch.length > 0;
  const canPaginate =
    !isSearching && activeFilter === "recent" && activeChannel === "all";

  useEffect(() => {
    if (!configured) {
      return;
    }

    let active = true;

    async function loadFirstPage() {
      setLoading(true);

      try {
        const [page, nextPinnedPost] = await Promise.all([
          fetchFeedPage({
            channel: activeChannel,
            filter: activeFilter,
            pageSize: 8,
            search: deferredSearch,
          }),
          isSearching ? Promise.resolve(null) : fetchPinnedPost(activeChannel),
        ]);

        if (!active) {
          return;
        }

        setPosts(page.posts);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore && canPaginate);
        setPinnedPost(nextPinnedPost);
        setError(null);
      } catch (nextError) {
        if (!active) {
          return;
        }

        setError(getErrorMessage(nextError));
        setPosts([]);
        setPinnedPost(null);
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
  }, [activeChannel, activeFilter, canPaginate, configured, deferredSearch, isSearching]);

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

  const visiblePosts = pinnedPost
    ? posts.filter((post) => post.id !== pinnedPost.id)
    : posts;
  const resultLabel = `${visiblePosts.length} ${visiblePosts.length > 1 ? "résultats" : "résultat"}`;

  return (
    <div className="forum-grid w-full">
      {user && profile ? (
        <section className="forum-card p-4 sm:p-5">
          <div className="forum-section-head items-center">
            <div>
              <div className="forum-inline-note">session active</div>
              <p className="mt-2 text-sm text-white">
                Connecté en tant que <strong>{profile.username}</strong>.
              </p>
            </div>
            <div className="forum-toolbar">
              <Link href="/settings" className="forum-button-ghost">
                <Settings2 className="mr-2 h-4 w-4" />
                Paramètres
              </Link>
              <Link href="/posts/new" className="forum-button-primary">
                <Plus className="mr-2 h-4 w-4" />
                Publier
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="forum-card p-6 sm:p-7">
        <div className="forum-section-head">
          <div>
            <span className="forum-pill">Feed</span>
            <h1 className="forum-title mt-4 text-4xl sm:text-5xl">NEST</h1>
            <p className="forum-muted mt-3 max-w-2xl text-sm leading-7">
              {user && profile
                ? "Canal actif. Trie le flux, change de canal, publie vite."
                : "Lecture publique. Accès requis pour publier et répondre."}
            </p>
          </div>

          {!user ? (
            <div className="forum-toolbar">
              <Link href="/login" className="forum-button-primary">
                Accès
              </Link>
            </div>
          ) : null}
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

        <div className="mt-5 flex flex-wrap gap-2">
          {forumFeedFilterValues.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setActiveFilter(filter);
              }}
              className={
                activeFilter === filter ? "forum-button-primary" : "forum-button-ghost"
              }
            >
              {forumFeedFilterLabels[filter]}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveChannel("all");
            }}
            className={
              activeChannel === "all" ? "forum-button-secondary" : "forum-button-ghost"
            }
          >
            Tous
          </button>
          {forumChannelValues.map((channel) => (
            <button
              key={channel}
              type="button"
              onClick={() => {
                setActiveChannel(channel);
              }}
              className={
                activeChannel === channel
                  ? "forum-button-secondary"
                  : "forum-button-ghost"
              }
            >
              {forumChannelLabels[channel]}
            </button>
          ))}
        </div>

        {searchInput ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
              }}
              className="forum-button-ghost"
            >
              <X className="mr-2 h-4 w-4" />
              Effacer la recherche
            </button>
          </div>
        ) : null}
      </section>

      {pinnedPost && !isSearching ? (
        <section className="forum-card p-5 sm:p-6">
          <div className="forum-section-head items-start">
            <div>
              <span className="forum-pill">
                <Pin className="h-3.5 w-3.5" />
                Épinglé
              </span>
              <h2 className="forum-title mt-4 text-3xl sm:text-4xl">
                Annonce active
              </h2>
            </div>
          </div>
          <div className="mt-5">
            <PostCard post={pinnedPost} />
          </div>
        </section>
      ) : null}

      <section className="forum-card forum-feed-section p-6 sm:p-7">
        <div className="forum-section-head">
          <div>
            <span className="forum-pill">
              <MessageSquareText className="h-3.5 w-3.5" />
              {isSearching ? "Recherche" : forumFeedFilterLabels[activeFilter]}
            </span>
            <h2 className="forum-title mt-4 text-3xl sm:text-4xl">
              {isSearching ? "Résultats" : "Flux"}
            </h2>
            <div className="forum-meta-line mt-3">
              <span>
                {isSearching
                  ? resultLabel
                  : activeFilter === "popular"
                    ? "classé par likes"
                    : activeFilter === "media"
                      ? "posts avec image ou vidéo"
                      : "du plus récent au plus ancien"}
              </span>
              {activeChannel !== "all" ? (
                <>
                  <span className="forum-meta-dot" />
                  <span>{forumChannelLabels[activeChannel]}</span>
                </>
              ) : null}
            </div>
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
                className="forum-card h-44 animate-pulse bg-[rgba(10,16,34,0.74)] p-6"
              />
            ))}
          </div>
        ) : visiblePosts.length ? (
          <>
            <div className="forum-feed-grid mt-8">
              {visiblePosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            {hasMore ? (
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
                ? "Essaie un autre mot-clé ou change de canal."
                : "Le canal est vide pour le moment."}
            </p>
            <div className="mt-6">
              <Link
                href={user ? "/posts/new" : "/login"}
                className="forum-button-primary"
              >
                {user ? "Publier" : "Accès"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
