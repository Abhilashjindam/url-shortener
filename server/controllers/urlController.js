/*
 * controllers/urlController.js — The Business Logic Layer
 *
 * LAYERED ARCHITECTURE (you'll be asked about this at Accenture):
 *
 *   Request → Router → Controller → Model → MongoDB
 *                ↑          ↑          ↑
 *          "Where?"    "What happens?"  "Save/fetch data"
 *
 * WHY SEPARATE CONTROLLER FROM ROUTE?
 *   Routes define the URL path and HTTP method.
 *   Controllers define WHAT ACTUALLY HAPPENS.
 *   Keeping them separate makes code cleaner, testable, and maintainable.
 *   In a large project at Accenture, different team members work on routes vs logic.
 *
 * WHY async/await?
 *   Database calls take time (network round-trip to MongoDB Atlas).
 *   async/await lets Node.js wait for the result WITHOUT blocking other requests.
 *   It's the modern, readable way to handle asynchronous operations in JavaScript.
 */

const Url = require('../models/Urls');
const { nanoid } = require('nanoid');

/*
 * WHY nanoid FOR CODE GENERATION?
 *
 *   Option 1: Math.random() → NOT safe. Can generate duplicates.
 *   Option 2: UUID → 36 characters — too long for a "short" URL.
 *   Option 3: MurmurHash (from the article) → deterministic, same input = same output.
 *             If two users shorten the same URL you get the same code — fine.
 *             But not true randomness.
 *   Option 4: nanoid(7) → 7 random URL-safe characters, cryptographically strong,
 *             ~3.5 trillion possible combinations. Near-zero collision probability.
 *             This is the BEST choice for a production-style URL shortener.
 *
 * WHY nanoid v3 (not v4+)?
 *   nanoid v4+ uses ES Modules (import/export syntax).
 *   Our server uses CommonJS (require syntax).
 *   v3 supports require() — no setup friction.
 */

// Base URL for building the full short link
// In dev: http://localhost:5000
// In prod: https://yourdomain.com (set this in .env)
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// ═══════════════════════════════════════════════════════════
// POST /api/shorten
// Takes a long URL → saves it with a short code → returns both
// ═══════════════════════════════════════════════════════════
const shortenUrl = async (req, res) => {
  /*
   * req.body contains the JSON payload sent from the frontend.
   * Our React app sends: { "longUrl": "https://..." }
   * We destructure it: const { longUrl } = req.body
   */
  const { longUrl } = req.body;

  // ── Validation 1: Was a URL even sent? ──
  if (!longUrl || !longUrl.trim()) {
    return res.status(400).json({ error: 'Please provide a URL' });
    /*
     * HTTP Status codes you MUST know:
     * 400 = Bad Request (client sent wrong/missing data)
     * 404 = Not Found (resource doesn't exist)
     * 500 = Internal Server Error (something broke on our side)
     * 201 = Created (new resource successfully made)
     * 200 = OK (success, returning existing data)
     */
  }

  // ── Validation 2: Is it actually a valid URL? ──
  try {
    new URL(longUrl); // Built-in JS class — throws TypeError if invalid
  } catch {
    return res.status(400).json({
      error: 'Invalid URL. Must start with http:// or https://',
    });
  }

  try {
    // ── DEDUPLICATION: Don't create duplicates ──
    // If the same long URL was already shortened, return the existing record.
    // This prevents clutter in the database and is a good design decision.
    const existing = await Url.findOne({ longUrl });
    if (existing) {
      return res.status(200).json({
        ...existing.toObject(), // spread all MongoDB fields
        shortUrl: `${BASE_URL}/${existing.shortCode}`, // add shortUrl to response
      });
    }

    // ── Generate short code and save ──
    const shortCode = nanoid(7); // e.g. "aB3kR7m"

    const newUrl = new Url({ longUrl, shortCode });
    await newUrl.save(); // Writes to MongoDB. await = wait for the save to finish.

    return res.status(201).json({
      ...newUrl.toObject(),
      shortUrl: `${BASE_URL}/${shortCode}`,
    });

  } catch (err) {
    console.error('shortenUrl error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ═══════════════════════════════════════════════════════════
// GET /:code
// The REDIRECT endpoint — the heart of a URL shortener
// ═══════════════════════════════════════════════════════════
const redirectUrl = async (req, res) => {
  /*
   * When someone visits http://localhost:5000/aB3kR7m
   * Express captures "aB3kR7m" as req.params.code
   */
  const { code } = req.params;

  try {
    const url = await Url.findOne({ shortCode: code });

    if (!url) {
      return res.status(404).json({ error: 'Link not found or has expired' });
    }

    // Increment the click counter
    url.clicks += 1;
    await url.save();

    /*
     * 302 Redirect: tells the browser "go to this other URL instead"
     * 301 = permanent (browser caches it forever — bad for our case since links expire)
     * 302 = temporary (browser always asks the server — correct for expiring links)
     */
    return res.redirect(302, url.longUrl);

  } catch (err) {
    console.error('redirectUrl error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════
// GET /api/urls
// Returns all stored URLs — for the history table in React
// ═══════════════════════════════════════════════════════════
const getAllUrls = async (req, res) => {
  try {
    /*
     * Url.find() = fetch all documents in the 'urls' collection
     * .sort({ createdAt: -1 }) = newest first (-1 = descending)
     */
    const urls = await Url.find().sort({ createdAt: -1 });

    // Add shortUrl field to each record (it's not stored in DB, we compute it)
    const enriched = urls.map((url) => ({
      ...url.toObject(),
      shortUrl: `${BASE_URL}/${url.shortCode}`,
    }));

    return res.status(200).json(enriched);

  } catch (err) {
    console.error('getAllUrls error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════
// DELETE /api/urls/:id
// Deletes a URL by its MongoDB _id
// ═══════════════════════════════════════════════════════════
const deleteUrl = async (req, res) => {
  try {
    await Url.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('deleteUrl error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { shortenUrl, redirectUrl, getAllUrls, deleteUrl };
