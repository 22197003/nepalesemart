import Link from "next/link";
export function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-7 text-4xl">{title}</h1>
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
    <div className="card p-8">
      <p>{text}</p>
      <Link className="mt-4 inline-block text-burgundy underline" href="/shop">
        Browse products
      </Link>
    </div>
  );
}
