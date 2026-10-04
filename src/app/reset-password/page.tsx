import Link from "next/link";
import { Shell, Field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { resetPassword } from "../auth-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const p = await searchParams;
  return (
    <Shell title="Choose a new password">
      <div className="card mx-auto max-w-md p-6">
        {p.reset && <p className="mb-4">Password updated. Sign in below.</p>}
        <ActionForm action={resetPassword} label="Continue">
          <input type="hidden" name="token" value={p.token ?? ""} />
          <Field
            name="password"
            label="New password (10+ characters, uppercase, lowercase and number)"
            type="password"
            required
          />
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
