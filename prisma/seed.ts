// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load service account JSON (same file your backend uses)
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../service-account-key.json"), "utf-8"),
);

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});
const auth = getAuth();

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
    { roleId: adminRole.id, resource: "transaction", action: "view_all" },
    { roleId: adminRole.id, resource: "transaction", action: "create" },
    { roleId: adminRole.id, resource: "transaction", action: "approve" },
    { roleId: adminRole.id, resource: "transaction", action: "reject" },
    { roleId: adminRole.id, resource: "transaction", action: "delete" },
    { roleId: adminRole.id, resource: "user", action: "manage" },
    { roleId: adminRole.id, resource: "fund", action: "view" },
    { roleId: adminRole.id, resource: "fund", action: "manage" },
    { roleId: adminRole.id, resource: "report", action: "view" },
    { roleId: adminRole.id, resource: "report", action: "export" },
    { roleId: adminRole.id, resource: "audit", action: "view" },
    { roleId: adminRole.id, resource: "setting", action: "manage" },
    { roleId: adminRole.id, resource: "category", action: "manage" },
    { roleId: investorRole.id, resource: "transaction", action: "view_all" },
    { roleId: investorRole.id, resource: "fund", action: "view" },
    { roleId: investorRole.id, resource: "report", action: "view" },
    { roleId: clientRole.id, resource: "transaction", action: "create" },
    { roleId: clientRole.id, resource: "transaction", action: "view_own" },
  ];

  await prisma.permission.createMany({
    data: permissions,
    skipDuplicates: true,
  });

  // ========== 3. Create Categories ==========
  const categories = [
    { name: "Investment Returns", nameAr: "عوائد الاستثمار", type: "income" },
    { name: "Project Income", nameAr: "إيرادات المشاريع", type: "income" },
    { name: "Management Fees", nameAr: "رسوم الإدارة", type: "income" },
    { name: "Operational", nameAr: "تشغيلية", type: "expense" },
    { name: "Salaries", nameAr: "الرواتب", type: "expense" },
    { name: "Marketing", nameAr: "التسويق", type: "expense" },
    { name: "Technology", nameAr: "التقنية", type: "expense" },
    {
      name: "Professional Services",
      nameAr: "الخدمات المهنية",
      type: "expense",
    },
    { name: "Travel", nameAr: "السفر", type: "expense" },
    { name: "Office", nameAr: "المكتب", type: "expense" },
    { name: "Other Income", nameAr: "إيرادات أخرى", type: "income" },
    { name: "Other Expenses", nameAr: "مصروفات أخرى", type: "expense" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { nameAr: category.nameAr },
      create: category,
    });
  }

  // ========== 4. Create default Fund ==========
  await prisma.fund.createMany({
    data: [{ id: 1, name: "Main Fund", currentBalance: 0, currency: "SYP" }],
    skipDuplicates: true,
  });

  // ========== 5. Create Settings ==========
  const settings = [
    {
      key: "company_name_en",
      value: "My Company",
      group: "company",
      description: "English company name",
    },
    {
      key: "company_name_ar",
      value: "شركتي",
      group: "company",
      description: "Arabic company name",
    },
    {
      key: "company_name",
      value: "My Company",
      group: "company",
      description: "Legacy company name",
    },
    { key: "currency", value: "SYP", group: "financial" },
    { key: "require_approval", value: "true", group: "system" },
  ];

  await prisma.setting.createMany({
    data: settings,
    skipDuplicates: true,
  });

  // ========== 6. Create or repair the Admin User (Firebase + MySQL) ==========
  const adminEmail = "admin@system.com";
  const adminPassword = "Admin123!";
  const adminFullName = "System Admin";

  let firebaseUser;
  try {
    firebaseUser = await auth.getUserByEmail(adminEmail);
    console.log(`ℹ️ Firebase admin user already exists: ${firebaseUser.uid}`);
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      firebaseUser = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: adminFullName,
      });
      console.log(`✅ Firebase admin user created: ${firebaseUser.uid}`);
    } else {
      throw error;
    }
  }

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      uid: firebaseUser.uid,
      fullName: adminFullName,
      roleId: adminRole.id,
      phone: null,
      isActive: true,
    },
    create: {
      uid: firebaseUser.uid,
      email: adminEmail,
      fullName: adminFullName,
      roleId: adminRole.id,
      phone: null,
      isActive: true,
    },
  });

  if (adminUser.roleId !== adminRole.id) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { roleId: adminRole.id, isActive: true },
    });
  }

  console.log("✅ Admin user ensured in MySQL with admin role");
  console.log("✅ Seeding complete!");
  console.log(`👑 Admin credentials: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
