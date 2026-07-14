// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ========== 1. Create Roles ==========
  await prisma.role.createMany({
    data: [
      { name: "admin", description: "System Administrator" },
      { name: "investor", description: "Investor" },
      { name: "client", description: "Client" },
    ],
    skipDuplicates: true,
  });

  // Fetch the roles to get their IDs for permissions
  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  const investorRole = await prisma.role.findUnique({
    where: { name: "investor" },
  });
  const clientRole = await prisma.role.findUnique({
    where: { name: "client" },
  });

  if (!adminRole || !investorRole || !clientRole) {
    throw new Error("Roles not found after creation");
  }

  // ========== 2. Create Permissions ==========
  const permissions = [
    // Admin permissions
    { roleId: adminRole.id, resource: "order", action: "view_all" },
    { roleId: adminRole.id, resource: "order", action: "create" },
    { roleId: adminRole.id, resource: "order", action: "approve" },
    { roleId: adminRole.id, resource: "order", action: "execute" },
    { roleId: adminRole.id, resource: "order", action: "delete" },
    { roleId: adminRole.id, resource: "user", action: "manage" },
    { roleId: adminRole.id, resource: "fund", action: "view" },
    { roleId: adminRole.id, resource: "fund", action: "manage" },
    { roleId: adminRole.id, resource: "report", action: "view" },
    { roleId: adminRole.id, resource: "report", action: "export" },
    { roleId: adminRole.id, resource: "audit", action: "view" },
    { roleId: adminRole.id, resource: "setting", action: "manage" },
    // Investor permissions
    { roleId: investorRole.id, resource: "order", action: "view_all" },
    { roleId: investorRole.id, resource: "fund", action: "view" },
    { roleId: investorRole.id, resource: "report", action: "view" },
    // Client permissions
    { roleId: clientRole.id, resource: "order", action: "create" },
    { roleId: clientRole.id, resource: "order", action: "view_own" },
  ];

  await prisma.permission.createMany({
    data: permissions,
    skipDuplicates: true,
  });

  // ========== 3. Create Categories ==========
  const categories = [
    { name: "Investment Returns", type: "income" },
    { name: "Project Income", type: "income" },
    { name: "Management Fees", type: "income" },
    { name: "Operational", type: "expense" },
    { name: "Salaries", type: "expense" },
    { name: "Marketing", type: "expense" },
    { name: "Technology", type: "expense" },
    { name: "Professional Services", type: "expense" },
    { name: "Travel", type: "expense" },
    { name: "Office", type: "expense" },
    { name: "Other Income", type: "income" },
    { name: "Other Expenses", type: "expense" },
  ];

  await prisma.category.createMany({
    data: categories,
    skipDuplicates: true,
  });

  // ========== 4. Create default Fund ==========
  await prisma.fund.createMany({
    data: [{ id: 1, name: "Main Fund", currentBalance: 0, currency: "SYP" }],
    skipDuplicates: true,
  });

  // ========== 5. Create Settings ==========
  const settings = [
    {
      key: "company_name",
      value: "My Company",
      group: "company",
      description: "Company name",
    },
    { key: "currency", value: "SYP", group: "financial" },
    { key: "require_approval", value: "true", group: "system" },
  ];

  await prisma.setting.createMany({
    data: settings,
    skipDuplicates: true,
  });

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
