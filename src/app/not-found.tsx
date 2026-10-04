import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-3xl text-burgundy">
        We couldn't find that page
      </h1>
      <Link href="/shop" className="btn-primary mt-6">
        Back to the shop
      </Link>
    </div>
  );
}
