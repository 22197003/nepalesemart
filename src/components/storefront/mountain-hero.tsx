import Link from "next/link";
import { PrayerFlags } from "./prayer-flags";

type Props = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
};

export function MountainHero({ title, subtitle, ctaLabel, ctaHref }: Props) {
  return (
    <section
      className="relative isolate overflow-hidden bg-night"
      aria-labelledby="hero-title"
    >
      {/* dawn sky */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#14213d] via-[#3d4a7a] to-[#f2a65a]" />
      <div
        className="absolute bottom-24 right-[18%] -z-10 h-40 w-40 rounded-full bg-gold/70 blur-2xl"
        aria-hidden="true"
      />

      <PrayerFlags className="absolute inset-x-0 top-0 h-16 w-full md:h-24" />

      {/* ridgelines – far to near; the nearest matches the page background so the hero melts into the page */}
      <svg
        viewBox="0 0 1440 520"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-[78%] w-full"
      >
        <path
          d="M0 360 L110 290 L190 325 L340 190 L430 262 L560 150 L690 280 L820 210 L960 300 L1100 185 L1240 285 L1340 235 L1440 310 V520 H0Z"
          fill="#8fa8c8"
        />
        <path
          d="M340 190 L296 228 L322 220 L340 240 L362 216 L388 228Z M560 150 L508 200 L536 192 L560 216 L584 190 L612 204Z M1100 185 L1050 232 L1078 224 L1100 246 L1124 222 L1150 234Z"
          fill="#ffffff"
          fillOpacity=".92"
        />
        <path
          d="M0 410 L90 350 L200 395 L330 300 L450 380 L610 285 L760 390 L900 330 L1050 400 L1190 320 L1320 385 L1440 340 V520 H0Z"
          fill="#4d6a96"
        />
        <path
          d="M610 285 L572 322 L596 316 L612 334 L632 312 L652 322Z M1190 320 L1156 350 L1176 346 L1192 360 L1208 344 L1226 352Z"
          fill="#ffffff"
          fillOpacity=".8"
        />
        <path
          d="M0 460 L120 420 L260 455 L420 410 L600 462 L780 425 L960 465 L1140 420 L1300 458 L1440 430 V520 H0Z"
          fill="#1b2b4b"
        />
        <path
          d="M0 500 Q240 470 480 490 T960 488 T1440 484 V520 H0Z"
          fill="rgb(246 248 251)"
        />
      </svg>

      <div className="mx-auto flex min-h-[560px] max-w-7xl flex-col justify-center px-4 pb-40 pt-28 md:pt-36">
        <p className="font-serif text-xl text-gold-light" lang="ne">
          नमस्ते
        </p>
        <h1
          id="hero-title"
          className="mt-2 max-w-2xl text-4xl leading-tight text-white md:text-6xl"
        >
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/85">{subtitle}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={ctaHref} className="btn-primary">
            {ctaLabel}
          </Link>
          <Link href="/shop#categories" className="btn-light">
            Explore categories
          </Link>
        </div>
      </div>
    </section>
  );
}
