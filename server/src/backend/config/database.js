// config/database.js — Singleton PrismaClient instance
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
