1. Project Overview
   A web-based Cash Flow Daily Management System built with Next.js and Google Firebase, utilizing a single fund model. The system tracks daily financial operations (income/expenses), manages approval workflows, stores supporting documents on Cloudinary, and provides role-based dashboards and reports.

Key Architecture Decisions:

Single fund (no inter-fund transfers).
Local Node.js/Express Backend to handle sensitive operations securely via Firebase Admin SDK (bypasses the need for a credit card required by Firebase Cloud Functions).
Firebase used exclusively for Database (Firestore) and Authentication.
Cloudinary for document storage.
RTL-first Arabic interface.
Ngrok used temporarily for real-time demonstration/presentation over the internet without deployment.
