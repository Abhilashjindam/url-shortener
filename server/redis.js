// server/redis.js

const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,

  // No TLS — Redis Cloud free tier on this endpoint uses plain connection
  lazyConnect: true,
  maxRetriesPerRequest: 1,

  // Stop retrying forever — if it fails, fail fast and move on
  retryStrategy(times) {
    if (times > 3) {
      return null; // stop retrying after 3 attempts
    }
    return 1000; // wait 1 second between retries
  },
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("⚠️  Redis error (app will continue without cache):", err.message);
});

module.exports = redis;