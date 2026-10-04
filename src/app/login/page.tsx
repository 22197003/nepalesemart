import { AuthPanel } from "@/components/auth-panel";
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
      <AuthPanel>
        {p.reset && <p className="mb-4">Password updated. Sign in below.</p>}
        <ActionForm action={login} label="Continue">
          <Field name="email" label="Email" type="email" required />
          <Field name="password" label="Password" type="password" required />
          <input type="hidden" name="next" value={p.next ?? ""} />
        </ActionForm>
        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 border-t border-night/10 pt-6 text-sm font-bold text-burgundy">
          <Link href="/register">Create an account →</Link>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      </AuthPanel>
    </Shell>
  );
}
