import { Shell } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { verifyEmail } from "../auth-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <Shell title="Verify your email">
      <ActionForm action={verifyEmail} label="Verify email">
        <input name="token" type="hidden" value={token ?? ""} />
        <p>Press the button to verify your email address.</p>
      </ActionForm>
    </Shell>
  );
}
