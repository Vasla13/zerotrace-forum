import Link from "next/link";

export function ForumSetupNotice() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
      <section className="forum-card w-full p-8 sm:p-10">
        <span className="forum-pill">Firebase</span>
        <h1 className="forum-title mt-5 text-4xl font-semibold">
          Configuration requise.
        </h1>
        <p className="forum-muted mt-4 text-sm">
          Lance la commande pour générer
          <code className="mx-1 rounded bg-white/5 px-1.5 py-0.5">
            .env.local
          </code>
        </p>
        <div className="forum-card-quiet mt-6 overflow-x-auto p-4 text-sm">
          <code>npm run firebase:setup -- --projectId forum-20260404</code>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="forum-button-secondary">
            Retour à l’accueil
          </Link>
        </div>
      </section>
    </div>
  );
}
