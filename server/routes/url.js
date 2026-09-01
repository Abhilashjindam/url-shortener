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
const { shortenUrl, getAllUrls, deleteUrl } = require('../controllers/urlController');

router.post('/shorten', shortenUrl);        // Create a short URL
router.get('/urls', getAllUrls);            // Get all URLs (for history table)
router.delete('/urls/:id', deleteUrl);     // Delete a URL by ID

module.exports = router;
