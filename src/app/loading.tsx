export default function Loading() {
  return (
    <div className="forum-grid w-full">
      <section className="forum-card w-full animate-pulse p-8">
        <div className="h-4 w-32 rounded-full bg-white/70" />
        <div className="mt-5 h-12 max-w-xl rounded-2xl bg-white/70" />
        <div className="mt-4 h-4 max-w-2xl rounded-full bg-white/60" />
        <div className="mt-2 h-4 max-w-xl rounded-full bg-white/60" />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="forum-card h-60 animate-pulse p-6"
          >
            <div className="h-4 w-24 rounded-full bg-white/70" />
            <div className="mt-6 h-8 w-5/6 rounded-2xl bg-white/70" />
            <div className="mt-4 h-4 w-full rounded-full bg-white/60" />
            <div className="mt-2 h-4 w-4/5 rounded-full bg-white/60" />
          </div>
        ))}
      </section>
    </div>
  );
}
