import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const config: NextConfig = {
  poweredByHeader: false,
  images: {
    // Add your image CDN / bucket host via IMAGE_PUBLIC_HOST (see .env.example)
    remotePatterns: [
      ...(process.env.IMAGE_PUBLIC_HOST
        ? [
            {
              protocol: "https" as const,
              hostname: process.env.IMAGE_PUBLIC_HOST,
            },
          ]
        : []),
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
export default config;
