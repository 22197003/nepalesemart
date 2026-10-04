import { db } from "@/lib/db";

export async function audit(args: {
  adminId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: object;
  ip?: string | null;
}) {
  await db.auditLog.create({
    data: {
      adminId: args.adminId,
      action: args.action,
      entity: args.entity,
      entityId: args.entityId,
      metadata: (args.metadata ?? {}) as object,
      ip: args.ip ?? null,
    },
  });
}
