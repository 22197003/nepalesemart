// Single source of truth for branding. Override via SiteSetting "brand" in admin; these are the fallbacks.
export const brandDefaults = {
  name: "Nepali Ghar Australia",
  shortName: "Nepali Ghar",
  tagline: "Authentic Nepali products, delivered across Australia.",
  logoText: "NG",
  logoUrl: null as string | null,
  supportEmail: "hello@example.com",
  supportPhone: "+61 400 000 000",
  abn: "00 000 000 000",
  social: { instagram: "", facebook: "", tiktok: "" },
};

export type Brand = typeof brandDefaults;
