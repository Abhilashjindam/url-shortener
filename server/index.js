/*
 * index.js — Server Entry Point
 *
 * This is the first file Node.js runs. It does 3 things:
 *   1. Creates the Express app and registers middleware
 *   2. Registers all routes
 *   3. Connects to MongoDB, then starts the HTTP server
 *
 * WHY EXPRESS?
 *   Node.js alone can handle HTTP, but Express makes it dramatically simpler.
 *   Raw Node.js: 40 lines to parse a JSON request body.
 *   Express: app.use(express.json()) — done.
 *
 * WHY dotenv?
 *   Hard-coding secrets like DB passwords in your code is dangerous.
 *   If you push to GitHub, anyone can see your credentials.
 *   dotenv reads secrets from a .env file (which you add to .gitignore).
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Must be called FIRST — loads .env file into process.env
dotenv.config();

const app = express();

// ══════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════
/*
 * WHAT IS MIDDLEWARE?
 *   Middleware are functions that run on EVERY incoming request,
 *   before it reaches your route handler.
 *
 *   Request → [cors()] → [express.json()] → Route Handler → Response
 *
 *   Each middleware calls next() to pass control to the next one.
 *   Think of airport security: bag check → passport check → gate
 */

// cors() — Cross-Origin Resource Sharing
//
// PROBLEM: Browsers block requests between different origins for security.
// Our React app runs on localhost:5173, our server on localhost:5000.
// These are different "origins" — the browser would block the request.
//
// SOLUTION: cors() tells the browser "yes, requests from other origins are allowed."
// In production, you'd configure this to only allow YOUR frontend domain.
app.use(cors());

// express.json() — Body Parser
//
// When the React app sends: POST /api/shorten with body { "longUrl": "..." }
// This middleware parses that JSON string into a real JS object: req.body
// Without it, req.body would be undefined.
app.use(express.json());

// ══════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════

// All API routes: /api/shorten, /api/urls, /api/urls/:id
app.use('/api', require('./routes/url'));

// Redirect route: /:code — MUST come after /api routes
// Why? Express matches routes in order.
// If /:code came first, a request to /api/shorten would match /:code (with code="api").
// Putting /api routes first ensures "api" never gets treated as a short code.
const { redirectUrl } = require('./controllers/urlController');
app.get('/:code', redirectUrl);

// ══════════════════════════════════════════
// DATABASE → SERVER START
// ══════════════════════════════════════════

const PORT = process.env.PORT || 5000;

/*
 * We connect to MongoDB FIRST, then start listening for requests.
 * WHY? If the server started before DB connected, requests would fail
 * because there's no database to read from or write to.
 *
 * mongoose.connect() returns a Promise.
 * .then() = runs if connection succeeds
 * .catch() = runs if connection fails
 */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running → http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1); // Exit the process — no point running without a database
  });
