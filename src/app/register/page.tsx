import Link from "next/link";
import { Shell, Field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { register } from "../auth-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const p = await searchParams;
  return (
    <Shell title="Create an account">
      <div className="card mx-auto max-w-md p-6">
        {p.reset && <p className="mb-4">Password updated. Sign in below.</p>}
        <ActionForm action={register} label="Continue">
          <Field name="firstName" label="First name" required />
          <Field name="lastName" label="Last name" required />
          <Field name="email" label="Email" type="email" required />
          <Field name="phone" label="Phone" type="tel" />
          <Field
            name="password"
            label="Password (10+ characters, uppercase, lowercase and number)"
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
