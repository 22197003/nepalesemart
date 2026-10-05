import { Shell } from "@/components/ui";
import credits from "@/data/sample-image-credits.json";
export const metadata = { title: "Sample photo credits" };
export default function Page() {
  return (
    <Shell
      title="Sample photo credits"
      description="Photography used to bring our demonstration catalogue to life."
    >
      <p className="mb-8 max-w-3xl text-night/70">
        These are representative sample photos, including serving suggestions.
        They do not show our actual stock, product packaging or suppliers.
        Photos are Wikimedia Commons thumbnails stored without image edits;
        layouts may crop them for display. Each photograph retains the licence
        linked below.
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {credits.map((photo) => (
          <article key={photo.key} className="card overflow-hidden">
            <img
              src={photo.file}
              alt={photo.title}
              loading="lazy"
              className="aspect-video w-full object-cover"
            />
            <div className="space-y-2 p-5 text-sm">
              <h2 className="font-sans text-base font-bold">{photo.title}</h2>
              <p>{photo.author}</p>
              <p>
                <a className="text-burgundy underline" href={photo.source}>
                  Original photograph
                </a>{" "}
                ·{" "}
                <a className="text-burgundy underline" href={photo.licenseUrl}>
                  {photo.license}
                </a>
              </p>
            </div>
          </article>
        ))}
      </div>
    </Shell>
  );
}
