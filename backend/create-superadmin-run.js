const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function main() {
  const p = new PrismaClient();
  const existing = await p.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    console.log("EXISTS:" + existing.email);
    await p.$disconnect();
    return;
  }
  let church = await p.church.findFirst();
  if (!church) {
    church = await p.church.create({
      data: { name: "Église Vases d'Honneur", city: "Ville" },
    });
  }
  const hash = await bcrypt.hash("Admin123!", 12);
  const user = await p.user.create({
    data: {
      firstName: "Super",
      lastName: "Admin",
      email: "superadmin@vasesdhonneur.com",
      password: hash,
      role: "SUPER_ADMIN",
      churchId: church.id,
    },
  });
  console.log("CREATED:" + user.email);
  await p.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
