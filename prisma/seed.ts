import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create users
  const alice = await prisma.user.upsert({
    where: { email: "alice@gmail.com" },
    update: {},
    create: {
      email: "alice@gmail.com",
      name: "Alice",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@gmail.com" },
    update: {},
    create: {
      email: "bob@gmail.com",
      name: "Bob",
    },
  });

  // Create posts
  await prisma.post.create({
    data: {
      title: "Hello from Alice",
      content: "This is Alice's first post!",
      published: true,
      authorId: alice.id,
    },
  });

  await prisma.post.create({
    data: {
      title: "Hello from Bob",
      content: "This is Bob's first post!",
      published: false,
      authorId: bob.id,
    },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
