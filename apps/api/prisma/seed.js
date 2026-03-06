require("dotenv").config();

const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const roles = [
    { rol: "super_admin", descripcion: "Admin AutiSense" },
    { rol: "clinic_admin", descripcion: "Admin de clínica" },
    { rol: "profesional", descripcion: "Especialista" },
    { rol: "tutor", descripcion: "Tutor" },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { rol: r.rol },
      update: {},
      create: r,
    });
  }

  const superRole = await prisma.role.findUnique({ where: { rol: "super_admin" } });
  if (!superRole) throw new Error("No existe rol super_admin");

  const email = "admin@autisense.com";
  const password = "Admin123*";
  const hash = await bcrypt.hash(password, 10);

  await prisma.usuario.upsert({
    where: { correo: email },
    update: {},
    create: {
      correo: email,
      password_hash: hash,
      estado: "activo",
      id_rol: superRole.id,
      id_clinica: null,
    },
  });

  console.log("Seed OK:");
  console.log("  email:", email);
  console.log("  pass :", password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });