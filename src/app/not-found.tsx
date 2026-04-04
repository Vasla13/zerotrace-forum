import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
      <section className="forum-card w-full p-10 text-center">
        <span className="forum-pill">404</span>
        <h1 className="forum-title mt-6 text-5xl font-semibold">
          Cette page n’existe pas.
        </h1>
        <p className="forum-muted mt-4 text-sm leading-7">
          Le lien est peut-être incorrect, ou le contenu a été supprimé.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/" className="forum-button-primary">
            Revenir à l’accueil
          </Link>
        </div>
      </section>
    </div>
  );
}
