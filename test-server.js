#!/usr/bin/env node

/**
 * Simple HTTP server for serving Chrome extension files during testing
 * Serves the extension files from the current directory for UI testing
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;
const HOST = 'localhost';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  // Handle CORS headers for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let filePath = req.url;

  // Remove query parameters
  if (filePath.includes('?')) {
    filePath = filePath.split('?')[0];
  }

  // Default to index.html for root path
  if (filePath === '/' || filePath === '') {
    filePath = '/ui/main_popup.html';
  }

  // Construct full file path
  filePath = path.join(__dirname, filePath);

  // Get file extension and set content type
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Read file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        console.log(`File not found: ${filePath}`);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>404 Not Found</title>
          </head>
          <body>
            <h1>404 Not Found</h1>
            <p>File: ${filePath}</p>
            <p><a href="/ui/main_popup.html">Go to main popup</a></p>
          </body>
          </html>
        `);
      } else {
        // Server error
        console.error(`Server error: ${err}`);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>500 Internal Server Error</title>
          </head>
          <body>
            <h1>500 Internal Server Error</h1>
            <p>Error: ${err.message}</p>
          </body>
          </html>
        `);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Extension test server running at http://${HOST}:${PORT}`);
  console.log(`Serving files from: ${__dirname}`);
  console.log(`Main popup available at: http://${HOST}:${PORT}/ui/main_popup.html`);
  console.log(`Settings page available at: http://${HOST}:${PORT}/ui/settings.html`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});