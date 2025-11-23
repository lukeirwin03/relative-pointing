const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
require('./db'); // Initialize database

const sessionsRouter = require('./routes/sessions');
const tasksRouter = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Enhanced request logging with IP and timestamp
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${ip}`);
  next();
});

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

// Stricter rate limiting for session join attempts
const joinSessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 join attempts per 15 minutes
  message: 'Too many session join attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP address
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  },
  handler: (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.warn(`[SECURITY] Rate limit exceeded for IP: ${ip} - Path: ${req.path}`);
    res.status(429).json({
      error: 'Too many session join attempts. Please try again in a few minutes.'
    });
  }
});

// Rate limiting for session creation
const createSessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 session creations per hour
  message: 'Too many sessions created. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.warn(`[SECURITY] Create session rate limit exceeded for IP: ${ip}`);
    res.status(429).json({
      error: 'Too many sessions created from this IP. Please try again later.'
    });
  }
});

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Routes with specific rate limiting
app.post('/api/sessions', createSessionLimiter);
app.post('/api/sessions/:roomCode/join', joinSessionLimiter);

// Standard routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/sessions/:roomCode/tasks', tasksRouter);


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins a room
  socket.on('join-room', (data) => {
    const { roomCode } = data;
    socket.join(roomCode);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  Relative Pointing App - Backend       ║
╚════════════════════════════════════════╝

  Server running at http://localhost:${PORT}
  API available at http://localhost:${PORT}/api
  WebSocket available at ws://localhost:${PORT}

  Health check: http://localhost:${PORT}/api/health

  Press Ctrl+C to stop
  `);
});
