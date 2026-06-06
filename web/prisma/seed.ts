import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "change-this-password";
  const displayName = process.env.INITIAL_ADMIN_DISPLAY_NAME ?? "Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, displayName, emailVerifiedAt: new Date() },
    create: { email, passwordHash, displayName, emailVerifiedAt: new Date() },
  });

  await prisma.userRole.upsert({
    where: { userId_role: { userId: user.id, role: "admin" } },
    update: {},
    create: { userId: user.id, role: "admin" },
  });

  console.log(`Seeded admin: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
