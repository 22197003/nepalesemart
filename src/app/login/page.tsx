import Link from "next/link";
import { Shell, Field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { login } from "../auth-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const p = await searchParams;
  return (
    <Shell title="Sign in">
      <div className="card mx-auto max-w-md p-6">
        {p.reset && <p className="mb-4">Password updated. Sign in below.</p>}
        <ActionForm action={login} label="Continue">
          <Field name="email" label="Email" type="email" required />
          <Field name="password" label="Password" type="password" required />
          <input type="hidden" name="next" value={p.next ?? ""} />
        </ActionForm>
        <div className="mt-6 flex flex-wrap gap-4 text-sm underline">
          <Link href="/login">Sign in</Link>
          <Link href="/register">Register</Link>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      </div>
    </Shell>
  );
}
