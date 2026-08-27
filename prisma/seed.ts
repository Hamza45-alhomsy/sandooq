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
    { roleId: adminRole.id, resource: "order", action: "view_all" },
    { roleId: adminRole.id, resource: "order", action: "create" },
    { roleId: adminRole.id, resource: "order", action: "approve" },
    { roleId: adminRole.id, resource: "order", action: "reject" },
    { roleId: adminRole.id, resource: "order", action: "delete" },
    { roleId: adminRole.id, resource: "user", action: "manage" },
    { roleId: adminRole.id, resource: "fund", action: "view" },
    { roleId: adminRole.id, resource: "fund", action: "manage" },
    { roleId: adminRole.id, resource: "report", action: "view" },
    { roleId: adminRole.id, resource: "report", action: "export" },
    { roleId: adminRole.id, resource: "audit", action: "view" },
    { roleId: adminRole.id, resource: "setting", action: "manage" },
    { roleId: investorRole.id, resource: "order", action: "view_all" },
    { roleId: investorRole.id, resource: "fund", action: "view" },
    { roleId: investorRole.id, resource: "report", action: "view" },
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

  // ========== 6. Create the Admin User (Firebase + MySQL) ==========
  const adminEmail = "admin@system.com";
  const adminPassword = "Admin123!";
  const adminFullName = "System Admin";

  try {
    // Try to create the user in Firebase Auth
    const firebaseUser = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: adminFullName,
    });
    console.log(`✅ Firebase user created: ${firebaseUser.uid}`);

    // Insert into MySQL
    await prisma.user.create({
      data: {
        uid: firebaseUser.uid,
        email: adminEmail,
        fullName: adminFullName,
        roleId: adminRole.id,
        phone: null,
        isActive: true,
      },
    });
    console.log("✅ Admin user created in MySQL");
  } catch (error: any) {
    // If the user already exists in Firebase, fetch the UID and ensure MySQL entry exists
    if (error.code === "auth/email-already-exists") {
      console.log(`ℹ️ Admin user already exists in Firebase: ${adminEmail}`);
      try {
        const existingFirebaseUser = await auth.getUserByEmail(adminEmail);
        // Check if user exists in MySQL
        const existingMySQLUser = await prisma.user.findUnique({
          where: { email: adminEmail },
        });
        if (!existingMySQLUser) {
          await prisma.user.create({
            data: {
              uid: existingFirebaseUser.uid,
              email: adminEmail,
              fullName: adminFullName,
              roleId: adminRole.id,
              phone: null,
              isActive: true,
            },
          });
          console.log("✅ Admin user created in MySQL (Firebase existed)");
        } else {
          // Ensure the MySQL user has admin role
          if (existingMySQLUser.roleId !== adminRole.id) {
            await prisma.user.update({
              where: { email: adminEmail },
              data: { roleId: adminRole.id },
            });
            console.log("✅ Existing MySQL user promoted to admin");
          }
          console.log("✅ Admin user already exists in MySQL");
        }
      } catch (fetchError) {
        console.error("Failed to fetch existing Firebase user:", fetchError);
      }
    } else {
      console.error("Failed to create admin user:", error);
    }
  }

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
