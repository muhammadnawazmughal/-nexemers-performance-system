# Nexemers International Employee Performance Management System

This repository follows the supplied project documentation and is implemented in phases.

## Structure

- `client/` - React 19, Vite, Tailwind CSS 4 frontend
- `server/` - Express and Mongoose backend
- `docs/` - open questions and implementation documentation

## Setup on Windows

Install dependencies once:

```cmd
npm --prefix client install
npm --prefix server install
```

The client uses `client/.env` and the API uses `server/.env`. Copy the matching `.env.example` files if the local `.env` files are missing, then update the server JWT settings as needed.

Start MongoDB Community Server (or configure a reachable MongoDB URI in `server/.env`) before starting the API. In two separate terminals, from the project root, run:

```cmd
npm run dev:server
```

```cmd
npm run dev:client
```

The local database is configured as `mongodb://localhost:27017/nexemers`, using the project database name `nexemers`. A running local MongoDB instance or MongoDB Atlas connection is required to start `server/src/server.js`.

The server health endpoint is:

```text
GET http://localhost:5000/api/v1/health
```

## Implemented functionality

The project includes a responsive React client and Express/Mongoose API with login and role-aware routes, employee/team management, daily and sales records, target and schedule entry, attendance, reports, import/export tools, settings, and audit-log screens. The API enforces authenticated access and role restrictions for management operations.

The client production build and current API unit tests pass. MongoDB-backed login, seed-admin, and CRUD flows still require a reachable MongoDB instance and have not yet been verified end to end.

## First Super Admin setup

MongoDB must be running first. A Demo Super Admin is created from the trusted server process; never from the React browser:

```cmd
cd server
npm run seed-admin -- admin@example.com "choose-a-long-password"
npm run dev
```

The seed command creates Team A and Team B, company settings for Asia/Karachi and PKR, and a clearly labelled demo Super Admin account.

For a demo-only local setup, the seed command can create this development account:

```text
Email: demo@nexemers.local
Password: DemoAdmin123!
```

Do not use demo credentials in a shared or production environment. Change or remove the demo account before deployment.

To create a separate demo employee account limited to its own performance view:

```cmd
cd server
npm run seed-demo-employee -- demo.employee@nexemers.local "choose-a-long-password"
```

Use a password of at least 12 characters. The demo employee is assigned the `employee` role and has no access to management pages.

## Verification

```cmd
npm run build
npm test
```

No real MongoDB credentials or employee identities are included. The only local runtime not started automatically is MongoDB Server; install and start it before the API or seed command.
