# Smart Expense Tracker (MERN)

A responsive personal finance tracker built with React + Vite, Express, Node.js, and MongoDB/Mongoose. Includes dashboard summaries, transaction CRUD, search/filtering, and a demo mode when MongoDB is not configured.

## Requirements
- Node.js 18+
- npm
- MongoDB local instance or MongoDB Atlas (optional for demo mode)

## Setup

### 1. Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
If MongoDB is available, set `MONGODB_URI` in `server/.env`. If it is not configured, the API uses in-memory demo data. Demo data resets when the server restarts.
Set `JWT_SECRET` to a unique random value of at least 32 characters (generate one with the command in `.env.example`); in production, set `NODE_ENV=production` so session cookies are sent only over HTTPS. `CLIENT_ORIGIN` should match the frontend origin.

### 2. Frontend
Open another terminal:
```bash
cd client
npm install
npm run dev
```
Open the URL printed by Vite, usually http://localhost:5173.

## Features
- Email/password registration and sign-in with private, account-scoped transactions
- Dashboard cards for income, expenses, and balance
- Create, edit, and delete transactions
- Search and filter by type/category
- Download monthly or custom date-range CSV reports with income, expense, and balance totals
- Scan JPG, PNG, or WebP receipts with in-browser OCR, review/correct extracted values, and check for possible duplicates
- Monthly spending chart
- Responsive layout
- API validation and error handling
- MongoDB persistence when configured; in-memory demo mode otherwise

## API
- `GET /api/health`
- `POST /api/auth/register` — create an account (name, email, password)
- `POST /api/auth/login` — sign in (email, password)
- `GET /api/auth/me` — get the signed-in account
- `POST /api/auth/logout` — clear the session
- `GET /api/transactions?search=&type=&category=&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- `POST /api/transactions/duplicates` — validate a transaction candidate and return possible duplicates for the signed-in user
- `GET /api/transactions/:id`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/dashboard/summary`

Authentication uses an HTTP-only, same-site cookie. When `MONGODB_URI` is absent, accounts and transactions are stored in memory and reset when the server restarts; configure MongoDB for persistent data.
Receipt images (JPG, PNG, or WebP; up to 8 MB) are processed with Tesseract.js in the browser and are not uploaded to the API. OCR results are suggestions: review and correct the merchant, amount, date, and category before saving. The API validates duplicate-check candidates and returns same-account transactions with matching amounts and nearby dates; users can inspect the warning and explicitly choose to save anyway.

Transaction example:
```json
{
  "title": "Groceries",
  "type": "expense",
  "amount": 42.5,
  "category": "Food",
  "date": "2026-10-12",
  "note": "Weekly shopping"
}
```

## Code0 and AI Development Experience
Use Code0 in VS Code while reviewing and developing the project. Suggested tasks to document after actually completing them:
1. Ask Code0 to explain the Express route/controller flow and review the result.
2. Use Code0 to help diagnose API validation or database connection errors.
3. Ask Code0 to review responsive CSS and identify layout issues.
4. Generate or improve test cases, then run them and verify results.
5. Refactor repeated UI or API logic and inspect the diff before accepting changes.

Only describe tasks you actually performed with Code0 in your final assessment README/submission.
