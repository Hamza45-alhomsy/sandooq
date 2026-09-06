// config/index.js — Re-export all configuration modules
export { default as prisma } from "./database.js";
export { auth } from "./firebase.js";
export { upload } from "./multer.js";
