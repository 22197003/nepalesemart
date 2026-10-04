import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
export async function serial<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: "Serializable",
        timeout: 15000,
      });
    } catch (e) {
      if (
        i >= 3 ||
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        e.code !== "P2034"
      )
        throw e;
    }
  }
}
