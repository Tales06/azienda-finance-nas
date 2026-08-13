const { PrismaClient, CategoryType, UserRole } = require("@prisma/client");
const crypto = require("node:crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function main() {
  const companyName = process.env.COMPANY_NAME || "La Mia Azienda";
  const baseCurrency = process.env.COMPANY_BASE_CURRENCY || "EUR";
  const adminUsername = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || "Amministratore";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || adminPassword === "ChangeMe123!" || adminPassword.length < 12) {
    throw new Error("ADMIN_PASSWORD mancante o non sicura. Usa almeno 12 caratteri e non usare la password di esempio.");
  }

  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: companyName,
        baseCurrency
      }
    });
  }

  const existingAdmin = await prisma.user.findUnique({ where: { username: adminUsername } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        companyId: company.id,
        username: adminUsername,
        displayName: adminDisplayName,
        passwordHash: hashPassword(adminPassword),
        role: UserRole.ADMIN,
        isActive: true
      }
    });
  }

  const categories = [
    { name: "Vendite", type: CategoryType.INCOME, color: "#16a34a" },
    { name: "Servizi", type: CategoryType.INCOME, color: "#0ea5e9" },
    { name: "Affitto", type: CategoryType.EXPENSE, color: "#f97316" },
    { name: "Fornitori", type: CategoryType.EXPENSE, color: "#dc2626" },
    { name: "Stipendi", type: CategoryType.EXPENSE, color: "#7c3aed" },
    { name: "Marketing", type: CategoryType.EXPENSE, color: "#ec4899" },
    { name: "Tasse", type: CategoryType.EXPENSE, color: "#ef4444" },
    { name: "Altro", type: CategoryType.BOTH, color: "#64748b" }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        companyId_name_type: {
          companyId: company.id,
          name: category.name,
          type: category.type
        }
      },
      update: {},
      create: {
        companyId: company.id,
        name: category.name,
        type: category.type,
        color: category.color,
        isActive: true
      }
    });
  }

  console.log("Seed completato.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
