// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// 🔥 Construct __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// ============ Firebase Admin Initialization ============
const serviceAccountPath = join(__dirname, "../service-account-key.json");
console.log(`📂 Loading service account from: ${serviceAccountPath}`);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
initializeApp({
  credential: cert(serviceAccount),
});
const auth = getAuth();

// ============ Helper: Create or Get Admin User ============
async function getOrCreateAdminUser() {
  const adminEmail = "admin@system.com";
  const adminPassword = "Admin123!";
  const adminFullName = "System Admin";

  // Check if already exists
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (adminUser) {
    console.log(`✅ Admin user already exists in MySQL: ${adminEmail}`);
    return adminUser;
  }

  // Create in Firebase
  let firebaseUid: string;
  try {
    const firebaseUser = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: adminFullName,
    });
    firebaseUid = firebaseUser.uid;
    console.log(`✅ Firebase user created: ${firebaseUid}`);
  } catch (error: any) {
    if (error.code === "auth/email-already-exists") {
      const existing = await auth.getUserByEmail(adminEmail);
      firebaseUid = existing.uid;
      console.log(`ℹ️ Firebase user already exists: ${firebaseUid}`);
    } else {
      throw error;
    }
  }

  // Get admin role
  const adminRole = await prisma.role.findUnique({
    where: { name: "admin" },
  });
  if (!adminRole) throw new Error("Admin role not found");

  // Create in MySQL
  adminUser = await prisma.user.create({
    data: {
      uid: firebaseUid,
      email: adminEmail,
      fullName: adminFullName,
      roleId: adminRole.id,
      isActive: true,
    },
  });
  console.log(`✅ Admin user created in MySQL: ${adminEmail}`);
  return adminUser;
}

// ============ Helper: Create Default Workspace ============
async function createDefaultWorkspace(adminUserId: number) {
  const workspaceName = "My Company";

  // ✅ Use findFirst (not findUnique) and correct casing
  let workspace = await prisma.workspace.findFirst({
    where: { name: workspaceName },
  });

  if (workspace) {
    console.log(`✅ Workspace already exists: ${workspace.name}`);
    return workspace;
  }

  workspace = await prisma.workspace.create({
    data: {
      name: workspaceName,
      ownerId: adminUserId,
    },
  });
  console.log(`✅ Workspace created: ${workspace.name} (ID: ${workspace.id})`);

  const adminRole = await prisma.role.findUnique({
    where: { name: "admin" },
  });
  if (!adminRole) throw new Error("Admin role not found.");

  await prisma.workspaceMember.create({
    data: {
      userId: adminUserId,
      workspaceId: workspace.id,
      roleId: adminRole.id,
    },
  });
  console.log(`✅ Admin added as member of workspace: ${workspace.name}`);
  return workspace;
}

// ============ Main Seed Function ============
async function main() {
  console.log("🌱 Seeding database...");

  // --- 1. Roles ---
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

  // --- 2. Permissions ---
  const permissions = [
    // Admin
    { roleId: adminRole.id, resource: "transaction", action: "view_all" },
    { roleId: adminRole.id, resource: "transaction", action: "create" },
    { roleId: adminRole.id, resource: "transaction", action: "approve" },
    { roleId: adminRole.id, resource: "transaction", action: "execute" },
    { roleId: adminRole.id, resource: "transaction", action: "delete" },
    { roleId: adminRole.id, resource: "user", action: "manage" },
    { roleId: adminRole.id, resource: "fund", action: "view" },
    { roleId: adminRole.id, resource: "fund", action: "manage" },
    { roleId: adminRole.id, resource: "report", action: "view" },
    { roleId: adminRole.id, resource: "report", action: "export" },
    { roleId: adminRole.id, resource: "audit", action: "view" },
    { roleId: adminRole.id, resource: "setting", action: "manage" },
    // Investor
    { roleId: investorRole.id, resource: "transaction", action: "view_all" },
    { roleId: investorRole.id, resource: "fund", action: "view" },
    { roleId: investorRole.id, resource: "report", action: "view" },
    // Client
    { roleId: clientRole.id, resource: "transaction", action: "create" },
    { roleId: clientRole.id, resource: "transaction", action: "view_own" },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        roleId_resource_action: {
          roleId: permission.roleId,
          resource: permission.resource,
          action: permission.action,
        },
      },
      update: {},
      create: permission,
    });
  }

  const adminUser = await getOrCreateAdminUser();
  const workspace = await createDefaultWorkspace(adminUser.id);

  // --- 3. Categories ---
  const categories = [
    {
      name: "Investment Returns",
      nameAr: "عوائد الاستثمار",
      type: "income",
      workspaceId: workspace.id,
    },
    {
      name: "Project Income",
      nameAr: "إيرادات المشاريع",
      type: "income",
      workspaceId: workspace.id,
    },
    {
      name: "Management Fees",
      nameAr: "رسوم الإدارة",
      type: "income",
      workspaceId: workspace.id,
    },
    {
      name: "Operational",
      nameAr: "تشغيلية",
      type: "expense",
      workspaceId: workspace.id,
    },
    {
      name: "Salaries",
      nameAr: "الرواتب",
      type: "expense",
      workspaceId: workspace.id,
    },
    {
      name: "Marketing",
      nameAr: "التسويق",
      type: "expense",
      workspaceId: workspace.id,
    },
    {
      name: "Technology",
      nameAr: "التقنية",
      type: "expense",
      workspaceId: workspace.id,
    },
    {
      name: "Professional Services",
      nameAr: "الخدمات المهنية",
      type: "expense",
      workspaceId: workspace.id,
    },
    {
      name: "Travel",
      nameAr: "السفر",
      type: "expense",
      workspaceId: workspace.id,
    },
    {
      name: "Office",
      nameAr: "المكتب",
      type: "expense",
      workspaceId: workspace.id,
    },
    {
      name: "Other Income",
      nameAr: "إيرادات أخرى",
      type: "income",
      workspaceId: workspace.id,
    },
    {
      name: "Other Expenses",
      nameAr: "مصروفات أخرى",
      type: "expense",
      workspaceId: workspace.id,
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        workspaceId_name: {
          workspaceId: category.workspaceId,
          name: category.name,
        },
      },
      update: { nameAr: category.nameAr, type: category.type },
      create: category,
    });
  }

  // --- 4. Fund ---
  await prisma.fund.createMany({
    data: [
      {
        name: "Main Fund",
        currentBalance: 0,
        currency: "SYP",
        workspaceId: workspace.id,
      },
    ],
    skipDuplicates: true,
  });

  // --- 5. Settings ---
  const settings = [
    {
      key: "company_name",
      value: "My Company",
      group: "company",
      description: "Company name",
      workspaceId: workspace.id,
    },
    {
      key: "currency",
      value: "SYP",
      group: "financial",
      workspaceId: workspace.id,
    },
    {
      key: "require_approval",
      value: "true",
      group: "system",
      workspaceId: workspace.id,
    },
  ];

  await prisma.setting.createMany({
    data: settings,
    skipDuplicates: true,
  });

  // --- 6. Create Admin User ---
  console.log("✅ Seeding complete!");
  console.log("👑 Admin credentials: admin@system.com / Admin123!");
  console.log("🏢 Default workspace: 'My Company' created and linked.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
