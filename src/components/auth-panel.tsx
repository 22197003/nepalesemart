import Link from "next/link";

export function AuthPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid overflow-hidden rounded-3xl border border-night/10 bg-white lg:grid-cols-2">
      <aside className="relative order-2 flex flex-col lg:order-1 justify-between overflow-hidden bg-night px-8 py-10 text-white sm:p-12">
        <div className="relative z-10 max-w-sm">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-gold-light">
            Your corner of home
          </p>
          <h2 className="text-4xl leading-tight sm:text-5xl">
            Familiar flavours.
            <br />
            New memories.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-white/70">
            Keep your favourites close, follow your orders and make room for a
            little more Nepal in your everyday.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-block text-sm font-bold text-gold-light"
          >
            Explore the collection →
          </Link>
        </div>
        <svg
          viewBox="0 0 600 220"
          className="-mx-12 -mb-12 mt-10 hidden w-[calc(100%+6rem)] text-glacier/25 lg:block"
          aria-hidden="true"
        >
          <circle cx="440" cy="55" r="27" fill="rgb(233 162 59)" />
          <path d="M0 220 135 50 225 150 330 20 510 220Z" fill="currentColor" />
          <path
            d="m265 100 65-80 65 80-42-18-23 18-24-28Z"
            fill="rgb(220 230 240 / .7)"
          />
          <path
            d="M0 220 200 130 270 190 445 100 600 220Z"
            fill="rgb(91 141 184 / .2)"
          />
        </svg>
      </aside>
      <div className="form-panel order-1 mx-auto lg:order-2 w-full max-w-lg px-6 py-8 sm:p-12">
        {children}
      </div>
    </div>
  );
}
