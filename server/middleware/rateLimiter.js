// server/middleware/rateLimiter.js

const redis = require("../redis");

/*
 * SLIDING WINDOW RATE LIMITER
 *
 * WHY RATE LIMITING?
 *   Without it, anyone can hammer your API with thousands of requests per second.
 *   This protects your server and MongoDB from being overwhelmed.
 *
 * WHY SLIDING WINDOW (not fixed window)?
 *   Fixed window: allows 10 requests per minute, resetting at :00, :01, etc.
 *   Problem: user sends 10 at 0:59 and 10 at 1:01 — 20 requests in 2 seconds!
 *
 *   Sliding window: tracks the EXACT timestamp of each request.
 *   At any point in time, only 10 requests are allowed in the last 60 seconds.
 *   No boundary exploit possible.
 *
 * HOW IT WORKS (using Redis Sorted Set):
 *   - Key: "rate:<ip_address>"  e.g. "rate:192.168.1.1"
 *   - Each request adds a new entry: { score: timestamp, value: timestamp }
 *   - Before checking, we delete all entries older than 60 seconds
 *   - If count >= 10, reject. Otherwise, allow.
 */

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

const rateLimiter = async (req, res, next) => {
  try {
    const key = `rate:${req.ip}`;
    const now = Date.now();

    await redis.zremrangebyscore(key, 0, now - WINDOW_MS);

    const count = await redis.zcard(key);

    if (count >= MAX_REQUESTS) {
      return res.status(429).json({
        error: "Too many requests. Please wait a minute before trying again.",
        retryAfter: 60
      });
    }

    await redis.zadd(key, now, `${now}`);
    await redis.expire(key, 60);

    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS - count - 1);

    next();

  } catch (err) {
    console.error("Rate limiter error (skipping):", err.message);
    next();
  }
};

module.exports = rateLimiter;