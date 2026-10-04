import { db } from "../db";
import {
  consoleEmailProvider,
  resendEmailProvider,
  type EmailProvider,
} from "./provider";
function provider(): EmailProvider {
  return process.env.EMAIL_PROVIDER === "resend"
    ? resendEmailProvider
    : consoleEmailProvider;
}
export type Template =
  | "welcome"
  | "order_confirmation"
  | "payment_confirmation"
  | "order_shipped"
  | "order_delivered"
  | "password_reset"
  | "email_verify"
  | "promotional";
export async function sendNotification(id: string) {
  const claim = await db.notification.updateMany({
    where: { id, status: { in: ["QUEUED", "FAILED"] } },
    data: { status: "PROCESSING" },
  });
  if (!claim.count) return;
  const n = await db.notification.findUniqueOrThrow({ where: { id } });
  const p = n.payload as { subject?: string; html?: string };
  try {
    if (!n.toEmail || !p.subject || !p.html)
      throw new Error("Incomplete email payload");
    await provider().send({
      to: n.toEmail,
      subject: p.subject,
      html: p.html,
      idempotencyKey: n.id,
    });
    await db.notification.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date(), error: null },
    });
  } catch (e) {
    await db.notification.update({
      where: { id },
      data: {
        status: "FAILED",
        error: e instanceof Error ? e.message : "unknown",
      },
    });
  }
}
export async function flushNotifications() {
  await db.notification.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: new Date(Date.now() - 15 * 60000) },
    },
    data: { status: "FAILED", error: "Email delivery lease expired; retrying" },
  });
  const rows = await db.notification.findMany({
    where: { channel: "EMAIL", status: { in: ["QUEUED", "FAILED"] } },
    orderBy: { createdAt: "asc" },
    take: 30,
    select: { id: true },
  });
  for (const n of rows) await sendNotification(n.id);
  return rows.length;
}
export async function notify(args: {
  template: Template;
  toEmail: string;
  userId?: string | null;
  subject: string;
  html: string;
  payload?: object;
}) {
  const n = await db.notification.create({
    data: {
      channel: "EMAIL",
      template: args.template,
      toEmail: args.toEmail,
      userId: args.userId ?? null,
      payload: { ...args.payload, subject: args.subject, html: args.html },
    },
  });
  await sendNotification(n.id);
}
