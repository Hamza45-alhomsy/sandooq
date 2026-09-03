// config/firebase.js — Firebase Admin SDK initialization
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load service account JSON
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../../../service-account-key.json"), "utf-8"),
);
console.log("🔑 Service account project ID:", serviceAccount.project_id);

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});

export const auth = getAuth();
