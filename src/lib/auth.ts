import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { can, type Permission } from "./rbac";

export const SESSION_COOKIE = "ng_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days
const key = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("AUTH_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(secret);
};

export type Session = { userId: string; role: Role };

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) =>
  bcrypt.compare(pw, hash);

export async function createSession(userId: string, role: Role) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  const token = await new SignJWT({ role, version: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Verifies the cookie AND re-checks the user row, so disabled accounts / role changes take effect immediately. */
export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (!payload.sub) return null;
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        sessionVersion: true,
      },
    });
    if (
      !user ||
      user.status !== "ACTIVE" ||
      (payload.version ?? 0) !== user.sessionVersion
    )
      return null;
    return { userId: user.id, role: user.role, user };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

/** Use at the top of every admin page, server action and admin route handler. */
export async function requirePermission(perm: Permission) {
  const s = await getSession();
  if (!s) redirect("/login?next=/admin");
  const rows = await db.rolePermission.findMany({
    where: { role: s.role },
    select: { permission: true },
  });
  const overrides = rows.length
    ? (rows.map((r) => r.permission) as Permission[])
    : null;
  if (!can(s.role, perm, overrides)) redirect("/unauthorized");
  return s;
}
