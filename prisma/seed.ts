// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create Roles
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin", description: "System Administrator" },
  });
  const investorRole = await prisma.role.upsert({
    where: { name: "investor" },
    update: {},
    create: { name: "investor", description: "Investor" },
  });
  const clientRole = await prisma.role.upsert({
    where: { name: "client" },
    update: {},
    create: { name: "client", description: "Client" },
  });

  // 2. Create Permissions (resource + action)
  const permissions = [
    // Orders
    { roleId: adminRole.id, resource: "order", action: "view_all" },
    { roleId: adminRole.id, resource: "order", action: "create" },
    { roleId: adminRole.id, resource: "order", action: "approve" },
    { roleId: adminRole.id, resource: "order", action: "execute" },
    { roleId: adminRole.id, resource: "order", action: "delete" },
    // Users
    { roleId: adminRole.id, resource: "user", action: "manage" },
    // Fund
    { roleId: adminRole.id, resource: "fund", action: "view" },
    { roleId: adminRole.id, resource: "fund", action: "manage" },
    // Reports
    { roleId: adminRole.id, resource: "report", action: "view" },
    { roleId: adminRole.id, resource: "report", action: "export" },
    // Audit
    { roleId: adminRole.id, resource: "audit", action: "view" },
    // Settings
    { roleId: adminRole.id, resource: "setting", action: "manage" },

    // Investor permissions
    { roleId: investorRole.id, resource: "order", action: "view_all" },
    { roleId: investorRole.id, resource: "fund", action: "view" },
    { roleId: investorRole.id, resource: "report", action: "view" },

    // Client permissions
    { roleId: clientRole.id, resource: "order", action: "create" },
    { roleId: clientRole.id, resource: "order", action: "view_own" },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: {
        roleId_resource_action: {
          roleId: p.roleId,
          resource: p.resource,
          action: p.action,
        },
      },
      update: {},
      create: p,
    });
  }

  // 3. Categories
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
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  // 4. Create default Fund
  await prisma.fund.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Main Fund", currentBalance: 0, currency: "SYP" },
  });

  // 5. Settings
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
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log("✅ Seeding complete!");
  console.log(
    "⚠️ Remember to create an admin user in Firebase Auth and then insert into the User table manually.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
