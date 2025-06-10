import { enhance } from "@zenstackhq/runtime";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getPrisma(req: Request) {
  const session = await auth(req);
  const user = session?.user;
  return enhance(prisma, { user });
}
