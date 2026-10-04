import Link from "next/link";
export default function Unauthorized() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-3xl text-burgundy">
        You don't have access to this page
      </h1>
      <Link href="/" className="btn-primary mt-6">
        Go home
      </Link>
    </div>
  );
}
