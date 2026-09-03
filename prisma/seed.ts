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
  let workspace = await prisma.Workspace.findFirst({
    where: { name: workspaceName },
  });

  if (workspace) {
    console.log(`✅ Workspace already exists: ${workspace.name}`);
    return workspace;
  }

  workspace = await prisma.Workspace.create({
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

  await prisma.WorkspaceMember.create({
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
    // Investor
    { roleId: investorRole.id, resource: "order", action: "view_all" },
    { roleId: investorRole.id, resource: "fund", action: "view" },
    { roleId: investorRole.id, resource: "report", action: "view" },
    // Client
    { roleId: clientRole.id, resource: "order", action: "create" },
    { roleId: clientRole.id, resource: "order", action: "view_own" },
  ];

  await prisma.permission.createMany({
    data: permissions,
    skipDuplicates: true,
  });

  // --- 3. Categories ---
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

  // --- 4. Fund ---
  await prisma.fund.createMany({
    data: [{ id: 1, name: "Main Fund", currentBalance: 0, currency: "SYP" }],
    skipDuplicates: true,
  });

  // --- 5. Settings ---
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

  // --- 6. Create Admin User ---
  const adminUser = await getOrCreateAdminUser();

  // --- 7. Create Default Workspace for Admin ---
  await createDefaultWorkspace(adminUser.id);

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
