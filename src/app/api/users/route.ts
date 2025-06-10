import { getPrisma } from "@/lib/db";
import { z } from "zod";

const userSchema = z.object({
  email: z.string(),
  name: z.string(),
});

export async function GET(request: Request) {
  const db = await getPrisma(request);
  const users = await db.user.findMany();
  return Response.json(users);
}

export async function POST(request: Request) {
  const json = await request.json();
  const db = await getPrisma(request);
  const { email, name } = userSchema.parse(json);

  // Actually create the user in the DB
  const newUser = await db.user.create({
    data: { email, name },
  });

  return new Response(JSON.stringify(newUser), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
