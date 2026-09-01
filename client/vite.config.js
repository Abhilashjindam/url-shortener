/*
 * vite.config.js — Vite Build Tool Configuration
 *
 * KEY CONCEPT — The Proxy:
 *
 *   PROBLEM: In development, React runs on localhost:5173 and Express on localhost:5000.
 *   When React calls /api/shorten, the browser sends it to localhost:5173/api/shorten.
 *   But our Express server is on port 5000! The request goes nowhere.
 *
 *   SOLUTION: The proxy intercepts any request starting with /api
 *   and forwards it to http://localhost:5000.
 *
 *   React fetch('/api/shorten')
 *       → Vite proxy intercepts
 *       → forwards to http://localhost:5000/api/shorten
 *       → Express handles it and responds
 *       → Vite sends response back to React
 *
 *   The browser thinks it's talking to localhost:5173.
 *   No CORS issues. No port numbers in your fetch() calls.
 *   Clean, simple, professional.
 *
 *   In PRODUCTION, your React build and Express server run on the same domain,
 *   so this proxy is only needed during development.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
