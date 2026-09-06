To run this cash management site :

step 1 :
Install dependencies --->npm install

open .env file and set the DATABASE_URL to your MySQL database connection string. For example:
DATABASE_URL="mysql://username:password@localhost:3306/cash_flow_db"

step 2 :
run the following command to set up the database and seed it with default data:

--->npm run db:setup

This creates all tables and inserts default data (including the admin user).

You will see a message like:

text
✅ Seeding complete!

👑 Admin credentials: admin@system.com / Admin123!

warning : ! If this command gives an error, you can run these two commands separately instead:

powershell
--->npx prisma db push
powershell
--->npx prisma db seed

---

🚀 Step 3: Start the Backend Server (Terminal 1)
powershell

--->npm run server

✅ You should see:

text
🚀 Cash Flow API running on http://localhost:3001
Keep this terminal window open (do not close it).

---

🌐 Step 4: Start the Frontend Server (Terminal 2)
powershell

first : --->npm run build

second : --->npm run start

✅ You should see:

text
✅ Ready on http://localhost:3000
Keep this terminal window open (do not close it).

---

🔑 Step 5: Log In
Open your web browser (Chrome, Edge, Firefox).

Go to: http://localhost:3000

Click "Sign In".

Use these credentials:

Email: admin@system.com

Password: Admin123!

## You are now logged in as the Administrator.

## Deploy to Railway

This repository contains two services, so deploy the same repository twice in Railway:

1. Create a MySQL database in Railway and copy its connection URL.
2. Create an API service from this repository. Set its start command to `npm run start:api` and add:
   - `DATABASE_URL`: the Railway MySQL connection URL
   - `FRONTEND_URL`: the public URL of the frontend service
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete contents of `service-account-key.json`
3. Create a web service from the same repository. Set its build command to `npm run build` and start command to `npm run start:web`. Add:
   - `NEXT_PUBLIC_API_URL`: the public URL of the API service
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
4. After the database is available, run `npx prisma db push` once against the API service, then run `npm run db:seed` if you want the default admin account and seed data.

Use the generated Railway domains in `FRONTEND_URL` and `NEXT_PUBLIC_API_URL`. Do not commit the Firebase service account JSON or place it in a `NEXT_PUBLIC_*` variable. Railway filesystem storage is ephemeral, so add a persistent volume if uploaded documents must survive redeployments.

🧪 (Optional) Step 6: View the Database in Prisma Studio
If you want to see the data directly in a visual interface:

Open a new terminal.

Navigate to the project root:

powershell
cd Desktop\cash-managment
Run:

powershell
--->npx prisma studio
A browser window will open at http://localhost:5555 showing all your tables.

---

🛑 How to Stop the Servers
In any terminal where a server is running (backend or frontend), press Ctrl + C.

Type Y and press Enter if it asks to terminate.

📌 Quick Command Recap (Cheat Sheet)
Action Command
Go to project folder cd Desktop\CashFlow-System
Install dependencies --->npm install
Setup database --->npm run db:setup
Start backend ---> npm run server
Start backend (auto‑restart) --->cd backend → npm run server:dev
Start frontend --->cd frontend → npm run dev
Open Prisma Studio --->npx prisma studio
