"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addressSchema } from "@/validation/checkout";
import { text, formError, UserError } from "@/lib/forms";
import type { FormState } from "@/components/action-form";
export async function saveProfile(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requireUser();
  try {
    const data = z
      .object({
        firstName: z.string().trim().min(1).max(60),
        lastName: z.string().trim().min(1).max(60),
        phone: z.string().max(20),
      })
      .parse(Object.fromEntries(f));
    await db.user.update({ where: { id: s.userId }, data });
    revalidatePath("/account");
    return { message: "Profile saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function saveAddress(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requireUser();
  try {
    const address = addressSchema.parse(Object.fromEntries(f));
    await db.address.create({
      data: {
        ...address,
        userId: s.userId,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        label: text(f, "label").slice(0, 60),
      },
    });
    revalidatePath("/account");
    return { message: "Address saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function deleteAddress(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requireUser();
  await db.address.deleteMany({
    where: { id: text(f, "id"), userId: s.userId },
  });
  revalidatePath("/account");
  return { message: "Address removed." };
}
export async function submitReview(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requireUser();
  try {
    const data = z
      .object({
        productId: z.string().cuid(),
        orderId: z.string().cuid(),
        rating: z.coerce.number().int().min(1).max(5),
        title: z.string().trim().min(2).max(120),
        body: z.string().trim().min(10).max(2000),
      })
      .parse(Object.fromEntries(f));
    const purchase = await db.order.findFirst({
      where: {
        id: data.orderId,
        userId: s.userId,
        status: "DELIVERED",
        items: { some: { productId: data.productId } },
      },
      select: { id: true },
    });
    if (!purchase)
      throw new UserError("Only delivered purchases can be reviewed.");
    await db.review.create({
      data: { ...data, userId: s.userId, imageUrls: [] },
    });
    revalidatePath("/account");
    return { message: "Review submitted for moderation." };
  } catch (e) {
    return { error: formError(e) };
  }
}
