import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import apiRoutes from './server/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Protect server files and private database directories from static access
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (p.startsWith('/data') || p.startsWith('/server') || p.includes('.env') || p.includes('package.json')) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
});

// Mount Membership API routes
app.use('/api', apiRoutes);

// Determine static root: dist if it exists, otherwise project root
const staticDir = fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
  ? path.join(__dirname, 'dist')
  : __dirname;

// Serve static assets with html extension resolution
app.use(express.static(staticDir, {
  extensions: ['html', 'htm'],
  index: 'index.html',
  maxAge: 0
}));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ZENVORA SHOOP server running on http://0.0.0.0:${PORT} (serving ${staticDir})`);
});
