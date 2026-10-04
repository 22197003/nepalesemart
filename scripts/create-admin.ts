import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { registerSchema } from "../src/validation/auth";
const db = new PrismaClient();
async function main() {
  const data = registerSchema.parse({
    firstName: "Store",
    lastName: "Owner",
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  if (
    !process.env.SEED_ADMIN_PASSWORD ||
    process.env.SEED_ADMIN_PASSWORD === "ChangeMe!12345"
  )
    throw new Error("Set a unique SEED_ADMIN_PASSWORD first");
  await db.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash: await bcrypt.hash(data.password, 12),
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });
  console.info("Owner created (existing accounts are left unchanged).");
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
