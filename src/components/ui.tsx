import Link from "next/link";
export function Shell({
  title,
  children,
  description,
  eyebrow = "Nepali Ghar · Australia",
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="inner-page mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 border-b border-night/10 pb-7 sm:mb-10">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-burgundy">
          {eyebrow}
        </p>
        <h1 className="text-4xl leading-tight sm:text-5xl">{title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl text-lg text-night/65">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}
export function Field({
  name,
  label,
  type = "text",
  value,
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  value?: string | number;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="input mt-1"
        name={name}
        type={type}
        defaultValue={value}
        required={required}
      />
    </label>
  );
}
export function Empty({ text = "Nothing here yet." }: { text?: string }) {
  return (
    <div className="card border border-dashed border-night/15 px-6 py-16 text-center">
      <p className="text-xl font-medium">{text}</p>
      <Link className="btn-primary mt-6" href="/shop">
        Browse products
      </Link>
    </div>
  );
}
