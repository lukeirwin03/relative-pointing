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
const PORT = process.env.PORT || 5001;

// Create HTTP server for Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Trust proxy (needed for rate limiting behind nginx)
app.set('trust proxy', 1);

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));

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
  max: 1000, // limit each IP to 1000 requests per windowMs (more reasonable for app usage)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
});

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Standard routes (rate limiters applied as middleware within the route chain)
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
