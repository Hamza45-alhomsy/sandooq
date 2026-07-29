Type this command and press Enter:
step 1 :
Install dependencies --->npm install
open .env file and set the DATABASE_URL to your MySQL database connection string. For example:
DATABASE_URL="mysql://username:password@localhost:3306/cash_flow_db"
powershell
--->npm run db:setup
This creates all tables and inserts default data (including the admin user).

You will see a message like:

text
✅ Seeding complete!  
👑 Admin credentials: admin@system.com / Admin123!
! If this command gives an error, you can run these two commands separately instead:

powershell
--->npx prisma db push
powershell
--->npx prisma db seed

---

🚀 Step 2: Start the Backend Server (Terminal 1)
powershell
--->npm run server
✅ You should see:

text
🚀 Cash Flow API running on http://localhost:3001
Keep this terminal window open (do not close it).

---

🌐 Step 3: Start the Frontend Server (Terminal 2)
powershell
--->npm run build
--->npm run start
✅ You should see:

text
✅ Ready on http://localhost:3000
Keep this terminal window open (do not close it).

---

🔑 Step 4: Log In
Open your web browser (Chrome, Edge, Firefox).

Go to: http://localhost:3000

Click "Sign In".

Use these credentials:

Email: admin@system.com

Password: Admin123!

## You are now logged in as the Administrator.

🧪 (Optional) Step 5: View the Database in Prisma Studio
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
