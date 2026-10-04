"use server";
import { mergeGuestCart } from "@/services/cart";
import { randomBytes, createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  requireUser,
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
} from "@/validation/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { text, formError, UserError, safeNext } from "@/lib/forms";
import { notify } from "@/lib/email";
import type { FormState } from "@/components/action-form";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
async function throttle(kind: string, email: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (
    !(await checkRateLimit(`${kind}:${ip}`, 30, 900)).ok ||
    !(await checkRateLimit(`${kind}:${email}`, 6, 900)).ok
  )
    throw new UserError("Too many attempts. Try again in 15 minutes.");
}
export async function login(_: FormState, f: FormData): Promise<FormState> {
  let destination = "/account";
  try {
    const data = loginSchema.parse(Object.fromEntries(f));
    await throttle("login", data.email);
    const user = await db.user.findUnique({ where: { email: data.email } });
    if (
      !user ||
      user.status !== "ACTIVE" ||
      !(await verifyPassword(data.password, user.passwordHash))
    )
      throw new UserError("Email or password is incorrect.");
    await createSession(user.id, user.role);
    await mergeGuestCart(user.id);
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    destination = text(f, "next")
      ? safeNext(text(f, "next"))
      : user.role !== "CUSTOMER"
        ? "/admin"
        : "/account";
  } catch (e) {
    return { error: formError(e) };
  }
  redirect(destination);
}
export async function register(_: FormState, f: FormData): Promise<FormState> {
  try {
    const data = registerSchema.parse(Object.fromEntries(f));
    await throttle("register", data.email);
    if (await db.user.findUnique({ where: { email: data.email } }))
      throw new UserError(
        "Unable to register this email. Try signing in or resetting your password.",
      );
    const { password, ...profile } = data;
    const user = await db.user.create({
      data: { ...profile, passwordHash: await hashPassword(password) },
    });
    await createSession(user.id, user.role);
    await mergeGuestCart(user.id);
  } catch (e) {
    return { error: formError(e) };
  }
  redirect("/account");
}
export async function logout() {
  await destroySession();
  redirect("/");
}
export async function forgotPassword(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  try {
    const { email } = forgotSchema.parse(Object.fromEntries(f));
    await throttle("reset", email);
    const user = await db.user.findUnique({ where: { email } });
    if (user && user.status === "ACTIVE") {
      const token = randomBytes(32).toString("hex");
      await db.authToken.create({
        data: {
          userId: user.id,
          type: "PASSWORD_RESET",
          tokenHash: hash(token),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
      await notify({
        template: "password_reset",
        userId: user.id,
        toEmail: email,
        subject: "Reset your Nepali Ghar password",
        html: `<p>Your reset link expires in one hour.</p><p><a href="${link}">Reset password</a></p>`,
      });
    }
    return {
      message:
        "If an active account exists, check your inbox for a reset link.",
    };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function resetPassword(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  try {
    const data = resetSchema.parse(Object.fromEntries(f));
    await throttle("reset-token", hash(data.token));
    const passwordHash = await hashPassword(data.password);
    await db.$transaction(async (tx) => {
      const t = await tx.authToken.findUnique({
        where: { tokenHash: hash(data.token) },
      });
      if (
        !t ||
        t.type !== "PASSWORD_RESET" ||
        t.usedAt ||
        t.expiresAt < new Date()
      )
        throw new UserError("This link is invalid or expired.");
      const claimed = await tx.authToken.updateMany({
        where: { id: t.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (!claimed.count)
        throw new UserError("This link has already been used.");
      await tx.user.update({
        where: { id: t.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await tx.authToken.updateMany({
        where: { userId: t.userId, type: "PASSWORD_RESET", usedAt: null },
        data: { usedAt: new Date() },
      });
    });
    await destroySession();
  } catch (e) {
    return { error: formError(e) };
  }
  redirect("/login?reset=1");
}

export async function sendVerification(_: FormState): Promise<FormState> {
  const s = await requireUser();
  try {
    await throttle("verify", s.user.email);
    const token = randomBytes(32).toString("hex");
    await db.authToken.create({
      data: {
        userId: s.userId,
        type: "EMAIL_VERIFY",
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/verify-email?token=${token}`;
    await notify({
      template: "email_verify",
      toEmail: s.user.email,
      userId: s.userId,
      subject: "Verify your email",
      html: `<p><a href="${link}">Verify your email</a></p>`,
    });
    return { message: "Verification email requested." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function verifyEmail(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  try {
    const token = text(f, "token");
    await db.$transaction(async (tx) => {
      const t = await tx.authToken.findUnique({
        where: { tokenHash: hash(token) },
      });
      if (
        !t ||
        t.type !== "EMAIL_VERIFY" ||
        t.usedAt ||
        t.expiresAt < new Date()
      )
        throw new UserError("Link expired or invalid.");
      const claim = await tx.authToken.updateMany({
        where: { id: t.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (!claim.count) throw new UserError("Link already used.");
      await tx.user.update({
        where: { id: t.userId },
        data: { emailVerified: new Date() },
      });
    });
    return { message: "Email verified. You can return to your account." };
  } catch (e) {
    return { error: formError(e) };
  }
}
