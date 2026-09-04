/*
 * routes/url.js — Route Definitions
 *
 * WHAT IS A ROUTE?
 *   A route is the "address" of an API endpoint.
 *   It maps: HTTP Method + URL Path → Controller Function
 *
 * ANALOGY:
 *   Think of routes like a phone directory.
 *   "If someone calls POST /api/shorten, connect them to the shortenUrl function."
 *
 * WHY USE A ROUTER INSTEAD OF DEFINING ALL ROUTES IN index.js?
 *   Separation of concerns — as your app grows, index.js stays clean.
 *   You can have separate route files for different features:
 *   routes/url.js, routes/auth.js, routes/user.js, etc.
 *
 * REST API CONVENTIONS (know these for interviews):
 *   POST   /api/shorten     → CREATE a new short URL
 *   GET    /api/urls        → READ all URLs
 *   DELETE /api/urls/:id    → DELETE a specific URL
 *
 *   The :id part is a URL parameter — a variable in the path.
 *   If the request is DELETE /api/urls/abc123, then req.params.id = "abc123"
 */

const express = require('express');
const router = express.Router();
const { shortenUrl, getAllUrls, deleteUrl, getStats } = require('../controllers/urlController');
const rateLimiter = require('../middleware/rateLimiter');

/*
 * WHY only apply rate limiting to /shorten?
 *
 *   POST /shorten  — writes to MongoDB, generates IDs. Expensive. Needs protection.
 *   GET  /urls     — just reads data. Fast, harmless, no need to limit.
 *   DELETE /urls/:id — could also be rate limited, but less critical for portfolio.
 *
 * rateLimiter is passed as a MIDDLEWARE ARGUMENT before the controller function.
 * Express runs middleware left to right:
 *   Request → rateLimiter() → shortenUrl()
 * If rateLimiter calls next(), shortenUrl runs.
 * If rateLimiter sends a 429 response, shortenUrl never runs.
 */

router.post('/shorten', rateLimiter, shortenUrl);  // rate limited
router.get('/urls', getAllUrls);                    // get all urls
router.delete('/urls/:id', deleteUrl);             // delete a url
router.get('/stats/:code', getStats);              // analytics for a single url

module.exports = router;
