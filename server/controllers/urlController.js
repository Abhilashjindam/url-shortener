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
const redis = require('../redis');

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
// Takes a long URL + optional alias → saves with short code
// ═══════════════════════════════════════════════════════════
const shortenUrl = async (req, res) => {
  const { longUrl, alias } = req.body;
  // alias is optional — user may or may not send it

  // ── Validation 1: Was a URL even sent? ──
  if (!longUrl || !longUrl.trim()) {
    return res.status(400).json({ error: 'Please provide a URL' });
  }

  // ── Validation 2: Is it actually a valid URL? ──
  try {
    new URL(longUrl);
  } catch {
    return res.status(400).json({
      error: 'Invalid URL. Must start with http:// or https://',
    });
  }

  // ── Validation 3: If alias provided, check it's valid ──
  if (alias) {
    // Only allow letters, numbers, and hyphens — no spaces or special chars
    // WHY? Short codes appear in URLs — spaces and special chars break URLs
    const aliasRegex = /^[a-zA-Z0-9-]+$/;
    if (!aliasRegex.test(alias)) {
      return res.status(400).json({
        error: 'Alias can only contain letters, numbers, and hyphens',
      });
    }

    // Alias must be between 3 and 30 characters
    if (alias.length < 3 || alias.length > 30) {
      return res.status(400).json({
        error: 'Alias must be between 3 and 30 characters',
      });
    }
  }

  try {
    // ── If alias provided, check if it's already taken ──
    if (alias) {
      const aliasTaken = await Url.findOne({ shortCode: alias });
      if (aliasTaken) {
        return res.status(409).json({
          error: `Alias "${alias}" is already taken. Please choose another.`,
        });
        /*
         * 409 = Conflict — the resource already exists
         * This is more accurate than 400 (bad request) because the format
         * is fine — it's just already in use
         */
      }

      // Alias is free — save it with the custom alias as shortCode
      const newUrl = new Url({ longUrl, shortCode: alias });
      await newUrl.save();

      return res.status(201).json({
        ...newUrl.toObject(),
        shortUrl: `${BASE_URL}/${alias}`,
      });
    }

    // ── No alias provided — original flow ──
    // DEDUPLICATION: Don't create duplicates for same long URL
    const existing = await Url.findOne({ longUrl });
    if (existing) {
      return res.status(200).json({
        ...existing.toObject(),
        shortUrl: `${BASE_URL}/${existing.shortCode}`,
      });
    }

    // Generate random short code with nanoid
    const shortCode = nanoid(7);
    const newUrl = new Url({ longUrl, shortCode });
    await newUrl.save();

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
// The REDIRECT endpoint — now with Redis cache layer
// ═══════════════════════════════════════════════════════════
const redirectUrl = async (req, res) => {
  const { code } = req.params;

  try {
    // ── Step 1: Check Redis cache first ──
    // Key pattern: "url:1NirTU7" → "https://youtube.com/..."
    // This costs < 1ms vs 10-50ms for MongoDB
    let longUrl = null;

    try {
      longUrl = await redis.get(`url:${code}`);
    } catch (redisErr) {
      // Redis is down — that's okay, fall through to MongoDB
      console.error('Redis get error (falling back to MongoDB):', redisErr.message);
    }

    if (longUrl) {
      // ── Cache HIT: URL found in Redis ──
      // Increment click counter in Redis atomically
      // INCR is atomic — even if 1000 requests hit simultaneously, no count is lost
      try {
        await redis.incr(`clicks:${code}`);
      } catch (redisErr) {
        console.error('Redis incr error:', redisErr.message);
      }

      console.log(`[Cache HIT] ${code} → ${longUrl}`);
      return res.redirect(302, longUrl);
    }

    // ── Cache MISS: URL not in Redis, check MongoDB ──
    console.log(`[Cache MISS] ${code} → querying MongoDB`);
    const url = await Url.findOne({ shortCode: code });

    if (!url) {
      return res.status(404).json({ error: 'Link not found or has expired' });
    }

    // ── Step 2: Save to Redis for future requests ──
    // TTL: 86400 seconds = 24 hours
    // After 24 hours Redis auto-deletes it — Redis Cloud free tier has limited RAM
    try {
      await redis.setex(`url:${code}`, 86400, url.longUrl);
    } catch (redisErr) {
      console.error('Redis setex error:', redisErr.message);
    }

    // ── Step 3: Increment click counter in MongoDB ──
    url.clicks += 1;
    await url.save();

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

// ═══════════════════════════════════════════════════════════
// GET /api/stats/:code
// Returns analytics for a single short URL
// ═══════════════════════════════════════════════════════════
const getStats = async (req, res) => {
  const { code } = req.params;

  try {
    // ── Step 1: Find the URL in MongoDB ──
    const url = await Url.findOne({ shortCode: code });

    if (!url) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    // ── Step 2: Check Redis for cached click count ──
    // When redirects are served from cache, clicks are stored in Redis
    // as "clicks:code" and NOT immediately written to MongoDB
    // We need to add both to get the true total
    let redisClicks = 0;
    try {
      const cached = await redis.get(`clicks:${code}`);
      redisClicks = parseInt(cached) || 0;
    } catch (redisErr) {
      console.error('Redis get clicks error:', redisErr.message);
    }

    // ── Step 3: Calculate days left until expiry ──
    const now = new Date();
    const expiresAt = url.expiresAt || new Date(url.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const msLeft = expiresAt - now;
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

    return res.status(200).json({
      shortCode: url.shortCode,
      originalUrl: url.longUrl,
      shortUrl: `${BASE_URL}/${url.shortCode}`,
      totalClicks: url.clicks + redisClicks, // MongoDB clicks + Redis cached clicks
      mongoClicks: url.clicks,               // clicks written to MongoDB
      redisClicks,                           // clicks still in Redis cache
      createdAt: url.createdAt,
      expiresAt,
      daysLeft,
    });

  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { shortenUrl, redirectUrl, getAllUrls, deleteUrl, getStats };
