# Cash Flow Management

## Project layout

- `client/` contains the Next.js frontend.
- `server/` contains the Express API, Prisma schema, seed script, and uploads.

## Local setup

Install dependencies in both project roots:

```powershell
cd client
npm install
cd ..\server
npm install
```

Set `DATABASE_URL` in the workspace `.env` file. For example:

```text
DATABASE_URL="mysql://username:password@localhost:3306/cash_flow_db"
```

The server loads the workspace `.env` file. The client loads client-side variables from `client/.env.local` during local builds. Copy the required `NEXT_PUBLIC_FIREBASE_*` variables and `NEXT_PUBLIC_API_URL` there when building locally.

Initialize and seed the database:

```powershell
cd server
npm run db:setup
```

Start the API in one terminal:

```powershell
cd server
npm start
```

Start the frontend in another terminal:

```powershell
cd client
npm run dev
```

Open `http://localhost:3000` and sign in with the seeded admin account if one was created:

```text
Email: admin@system.com
Password: Admin123!
```

## Railway deployment

Deploy the repository as two Railway services using separate root directories.

### API service

- Root directory: `/server`
- Build command: `npm install`
- Start command: `npm start`

Set these variables:

- `DATABASE_URL`: Railway MySQL connection URL
- `FRONTEND_URL`: public URL of the frontend service
- `FIREBASE_SERVICE_ACCOUNT_JSON`: complete Firebase service-account JSON

After the database is available, run these commands from the server service:

```bash
npm run db:push
npm run db:seed
```

### Frontend service

- Root directory: `/client`
- Build command: `npm ci && npm run build`
- Start command: `npm run start:client`

Set these variables before the build:

- `NEXT_PUBLIC_API_URL`: public URL of the API service
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Do not put the Firebase Admin service-account JSON in a `NEXT_PUBLIC_*` variable. Railway filesystem storage is ephemeral; use a persistent volume or object storage if uploaded documents must survive redeployments.

## Prisma Studio

```powershell
cd server
npx prisma studio
```
