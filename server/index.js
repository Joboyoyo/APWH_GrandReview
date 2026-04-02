import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.json());

// --- Data helpers ---
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { users: {} };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function findUserByToken(token) {
  const data = readData();
  for (const [username, user] of Object.entries(data.users)) {
    if (user.token === token) return { username, ...user };
  }
  return null;
}

// --- Auth middleware ---
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const token = header.slice(7);
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
}

// --- Routes ---

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

  const data = readData();
  const key = username.toLowerCase();
  if (data.users[key]) return res.status(409).json({ error: 'Username already taken' });

  const hash = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(32).toString('hex');

  data.users[key] = {
    displayName: username,
    passwordHash: hash,
    token,
    scores: {},
    createdAt: Date.now(),
  };
  writeData(data);

  res.json({ username: data.users[key].displayName, token });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const data = readData();
  const key = username.toLowerCase();
  const user = data.users[key];
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

  // Rotate token on login
  const token = crypto.randomBytes(32).toString('hex');
  data.users[key].token = token;
  writeData(data);

  res.json({ username: user.displayName, token });
});

// Get scores
app.get('/api/scores', auth, (req, res) => {
  res.json({ scores: req.user.scores || {} });
});

// Save scores
app.post('/api/scores', auth, (req, res) => {
  const { scores } = req.body;
  if (!scores || typeof scores !== 'object') return res.status(400).json({ error: 'Invalid scores data' });

  const data = readData();
  const key = req.user.username.toLowerCase();
  // Merge: keep best scores
  const existing = data.users[key].scores || {};
  for (const [eventId, newScore] of Object.entries(scores)) {
    const prev = existing[eventId];
    if (!prev || newScore.best > prev.best || newScore.lastAttempt > prev.lastAttempt) {
      existing[eventId] = {
        ...newScore,
        best: Math.max(newScore.best || 0, prev?.best || 0),
        attempts: (prev?.attempts || 0) + (newScore.attempts || 1) - (prev?.attempts || 0),
      };
    }
  }
  data.users[key].scores = existing;
  writeData(data);

  res.json({ scores: existing });
});

// Validate token
app.get('/api/me', auth, (req, res) => {
  res.json({ username: req.user.displayName });
});

app.listen(PORT, () => {
  console.log(`APWH server running on http://localhost:${PORT}`);
});
