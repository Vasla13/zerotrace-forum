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
  ShieldAlert,
  X,
} from "lucide-react";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { InputShell } from "@/components/input-shell";
import { PostCard } from "@/components/post-card";
import { RealmTheme } from "@/components/realm-theme";
import {
  forumChannelLabels,
  forumChannelValues,
  forumFeedFilterLabels,
  forumFeedFilterValues,
  forumRealmLabels,
  type ForumFeedFilter,
  type ForumRealm,
} from "@/lib/forum/config";
import { fetchFeedPage, fetchPinnedPost } from "@/lib/data/posts";
import type { FeedChannelFilter, ForumPost } from "@/lib/types/forum";
import { getErrorMessage } from "@/lib/utils/errors";
import { useAuth } from "@/providers/auth-provider";

type ForumHomeProps = {
  realm?: ForumRealm;
};

export function ForumHome({ realm = "public" }: ForumHomeProps) {
  const { canAccessShadow, configured, user } = useAuth();
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
  const isShadowRealm = realm === "certified";
  const composeHref = user ? `/posts/new?realm=${realm}` : "/login";

  useEffect(() => {
    if (!configured || (isShadowRealm && !canAccessShadow)) {
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
            realm,
            search: deferredSearch,
          }),
          isSearching ? Promise.resolve(null) : fetchPinnedPost(activeChannel, realm),
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
  }, [
    activeChannel,
    activeFilter,
    canAccessShadow,
    canPaginate,
    configured,
    deferredSearch,
    isSearching,
    isShadowRealm,
    realm,
  ]);

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
        realm,
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

  if (isShadowRealm && !canAccessShadow) {
    return (
      <div className="forum-grid w-full">
        <RealmTheme realm="certified" />
        <section className="forum-card mx-auto w-full max-w-4xl p-6 text-center sm:p-8">
          <span className="forum-pill">Face cachée</span>
          <h1 className="forum-title mt-5 text-4xl sm:text-5xl">
            Certification requise
          </h1>
          <p className="forum-muted mt-4 text-sm leading-7">
            Cette couche rouge n’est ouverte qu’aux identités certifiées par l’admin.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className="forum-button-ghost">
              Retour au forum
            </Link>
            {user ? (
              <Link href="/settings" className="forum-button-primary">
                Demander la certification
              </Link>
            ) : (
              <Link href="/login" className="forum-button-primary">
                Forger une identité
              </Link>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="forum-grid w-full">
      <RealmTheme realm={realm} />

      <section className="forum-card forum-command-panel p-6 sm:p-7">
        <div className="forum-command-head">
          <div className="forum-command-copy">
            <span className="forum-pill">{forumRealmLabels[realm]}</span>
            <h1 className="forum-title mt-4 text-4xl sm:text-5xl">
              {isShadowRealm ? "Face cachée" : "NEST"}
            </h1>
            <p className="forum-muted mt-3 max-w-2xl text-sm leading-7">
              {isShadowRealm
                ? "Canal rouge. Fuites internes, traces anti-corpo et matière sensible."
                : user
                  ? "Forum ouvert. Trie, scanne, publie."
                  : "Forum ouvert. Forge une identité pour publier et répondre."}
            </p>
          </div>

          <div className="forum-toolbar">
            {canAccessShadow ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  className={
                    !isShadowRealm ? "forum-button-secondary" : "forum-button-ghost"
                  }
                >
                  Forum
                </Link>
                <Link
                  href="/face-cachee"
                  className={
                    isShadowRealm ? "forum-button-secondary" : "forum-button-ghost"
                  }
                >
                  Face cachée
                </Link>
              </div>
            ) : null}

            <Link href={composeHref} className="forum-button-primary">
              {user ? (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Publier
                </>
              ) : (
                "Entrer"
              )}
            </Link>
          </div>
        </div>

        <div className="forum-command-grid mt-6">
          <div className="forum-command-search">
            <InputShell
              id="feed-search"
              ref={searchInputRef}
              icon={Search}
              placeholder={
                isShadowRealm
                  ? "Rechercher une fuite, un nom, un dossier…"
                  : "Rechercher un post, un sujet, un pseudo…"
              }
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
            />
          </div>

          <div className="forum-command-strips">
            <div className="forum-filter-rack">
              {forumFeedFilterValues.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => {
                    setActiveFilter(filter);
                  }}
                  className={
                    activeFilter === filter
                      ? "forum-button-primary"
                      : "forum-button-ghost"
                  }
                >
                  {forumFeedFilterLabels[filter]}
                </button>
              ))}
            </div>

            <div className="forum-channel-rack">
              <button
                type="button"
                onClick={() => {
                  setActiveChannel("all");
                }}
                className={
                  activeChannel === "all"
                    ? "forum-button-secondary"
                    : "forum-button-ghost"
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
          </div>
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
                {isShadowRealm ? "Signal rouge" : "Épinglé"}
              </span>
              <h2 className="forum-title mt-4 text-3xl sm:text-4xl">
                {isShadowRealm ? "Dossier chaud" : "Annonce active"}
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
              {isSearching ? "Résultats" : isShadowRealm ? "Flux rouge" : "Flux"}
            </h2>
            <div className="forum-meta-line mt-3">
              <span>
                {isSearching
                  ? resultLabel
                  : activeFilter === "popular"
                    ? "classé par impact"
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
            <ShieldAlert className="h-7 w-7 text-[color:var(--accent)]" />
            <h3 className="forum-title mt-4 text-2xl sm:text-3xl">
              {isSearching ? "Aucun résultat" : "Aucun post"}
            </h3>
            <p className="forum-muted mt-3 max-w-xl text-sm">
              {isSearching
                ? "Essaie un autre mot-clé ou change de canal."
                : isShadowRealm
                  ? "Aucune fuite n’est remontée dans cette couche pour le moment."
                  : "Le canal est vide pour le moment."}
            </p>
            <div className="mt-6">
              <Link href={composeHref} className="forum-button-primary">
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
