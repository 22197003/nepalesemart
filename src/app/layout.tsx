import "@fontsource/mukta/400.css";
import "@fontsource/mukta/500.css";
import "@fontsource/mukta/700.css";
import "@fontsource/yatra-one/400.css";
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getBrand } from "@/services/settings";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title: {
      default: `${brand.name} – Nepali groceries & foods in Australia`,
      template: `%s | ${brand.name}`,
    },
    description: brand.tagline,
    openGraph: { siteName: brand.name, locale: "en_AU", type: "website" },
  };
}

const NAV = [
  ["Shop", "/shop"],
  ["Search", "/search"],
  ["Wishlist", "/wishlist"],
  ["Cart", "/cart"],
  ["Account", "/account"],
] as const;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await getBrand();
  return (
    <html lang="en-AU">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
        >
          Skip to content
        </a>
        <div className="flag-bar" aria-hidden="true" />
        <div className="bg-night py-2 text-center text-xs text-white/90">
          {brand.tagline}
        </div>
        <header className="sticky top-0 z-40 border-b border-night/10 bg-cream/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-serif text-xl text-night"
            >
              <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
                <circle cx="20" cy="20" r="20" fill="rgb(200 16 46)" />
                <path d="M4 31 L15 14 L21 23 L26 16 L36 31Z" fill="#fff" />
                <circle cx="29" cy="10" r="3" fill="rgb(233 162 59)" />
              </svg>
              {brand.name}
            </Link>
            <nav
              aria-label="Primary"
              className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium"
            >
              {NAV.map(([label, href]) => (
                <Link key={href} href={href} className="hover:text-burgundy">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="mt-20 bg-night text-sm text-white/80">
          <svg
            viewBox="0 0 1440 60"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="-mt-px block h-10 w-full text-cream"
          >
            <path
              d="M0 0 H1440 V20 L1330 40 L1240 18 L1100 52 L980 24 L860 46 L700 12 L560 50 L420 20 L300 48 L160 22 L60 44 L0 28Z"
              fill="currentColor"
            />
          </svg>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pb-10 pt-6">
            <p>
              © {new Date().getFullYear()} {brand.name}.{" "}
              {brand.abn !== "00 000 000 000" && `ABN ${brand.abn}.`} Prices in
              AUD.
            </p>
            <nav className="flex flex-wrap gap-4" aria-label="Information">
              {[
                ["About", "about"],
                ["FAQ", "faq"],
                ["Delivery", "delivery-policy"],
                ["Returns", "returns"],
                ["Privacy", "privacy"],
                ["Terms", "terms"],
              ].map(([label, path]) => (
                <Link href={`/info/${path}`} key={path}>
                  {label}
                </Link>
              ))}
            </nav>
            <Link
              href="/image-credits"
              className="text-xs underline underline-offset-4"
            >
              Sample photo credits
            </Link>
            <p lang="ne" className="font-serif text-gold-light">
              धन्यवाद
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
