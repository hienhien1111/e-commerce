import { getAccessToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db";

const postSchema = z.object({
  title: z.string(),
  content: z.string(),
  published: z.boolean(),
  authorId: z.string().optional(),
});

export async function GET(request: Request) {
  // For example, fetch data from your DB here
  const token = getAccessToken(request);
  const db = await getPrisma(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing or invalid authorization token" },
      { status: 401 },
    );
  }

  const posts = await db.post.findMany();
  return Response.json(posts);
}

export async function POST(request: Request) {
  // Parse the request body
  const json = await request.json();
  const db = await getPrisma(request);
  const { title, content, published, authorId } = postSchema.parse(json);

  // Actually create the post in the DB
  const newPost = await db.post.create({
    data: { title, content, published, authorId },
  });

  return new Response(JSON.stringify(newPost), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

// Delete
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
  }

  const db = await getPrisma(request);

  try {
    const deletedPost = await db.post.delete({
      where: { id },
    });
    return NextResponse.json(deletedPost, { status: 200 });
  } catch (err) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Post not found", message: error.message },
        { status: 404 },
      );
    }
    if (error.message && error.message.includes('denied by policy')) {
      return NextResponse.json(
        { error: "Not allowed by policy", message: error.message },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 },
    );
  }
}
