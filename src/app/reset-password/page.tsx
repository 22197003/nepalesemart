import { AuthPanel } from "@/components/auth-panel";
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
      <AuthPanel>
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
        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 border-t border-night/10 pt-6 text-sm font-bold text-burgundy">
          <Link href="/login">Already have an account? Sign in →</Link>
        </div>
      </AuthPanel>
    </Shell>
  );
}
