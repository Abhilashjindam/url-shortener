/*
 * models/Url.js — The Database Blueprint
 *
 * WHAT IS A MODEL?
 *   A Mongoose model defines the SHAPE of every document in our MongoDB collection.
 *   Think of it as a form template — every URL entry you save must fill in these fields.
 *
 * WHY MONGOOSE INSTEAD OF RAW MONGODB?
 *   Raw MongoDB lets you save anything — no rules, no validation.
 *   Mongoose adds a schema (structure), validations, and helper methods on top.
 *   This is the difference between a Word doc (free-form) and a structured form.
 *
 * WHY MONGODB (NOT REDIS LIKE THE ARTICLE)?
 *   Redis stores data in RAM — ultra fast but data is lost when the server restarts.
 *   MongoDB stores to disk — slightly slower but PERSISTENT (survives restarts).
 *   For a portfolio project you want to demo anytime — persistence is more important.
 *   MongoDB Atlas is also FREE to host in the cloud, and it looks great on a resume.
 */

const mongoose = require('mongoose');

const UrlSchema = new mongoose.Schema({
  longUrl: {
    type: String,
    required: true,  // This field MUST be present — Mongoose will reject saves without it
  },

  shortCode: {
    type: String,
    required: true,
    unique: true,    // MongoDB creates a unique index on this field
                     // Two URLs can't have the same short code
  },

  clicks: {
    type: Number,
    default: 0,      // Every new URL starts with 0 clicks
  },

  createdAt: {
    type: Date,
    default: Date.now,

    /*
     * TTL INDEX (Time To Live):
     * MongoDB has a built-in feature to auto-delete documents after N seconds.
     * expires: 604800 = 7 days in seconds (60 * 60 * 24 * 7)
     *
     * This is the "link expiry" feature — completely automatic!
     * No cron job, no cleanup code needed. MongoDB handles it internally.
     * This is a great talking point in interviews.
     */
    expires: 60 * 60 * 24 * 7, // 7 days
  },
});

/*
 * mongoose.model('Url', UrlSchema) does two things:
 * 1. Creates a MongoDB collection named 'urls' (pluralised, lowercased automatically)
 * 2. Returns a Model class we can use to query/save/delete documents
 */
module.exports = mongoose.model('Url', UrlSchema);
