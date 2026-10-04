"use client";
export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-3xl text-burgundy">
        Something went wrong
      </h1>
      <p className="mt-2">Please try again.</p>
      <button onClick={reset} className="btn-primary mt-6">
        Retry
      </button>
    </div>
  );
}
