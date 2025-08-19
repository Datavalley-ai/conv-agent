// /app/src/app.js (Final, Corrected Version)

// --- Core Dependencies ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const logger = require('./utils/logger');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/error');

// --- Route Imports ---
const authRoutes = require('./routes/api/v1/auth');
const interviewRoutes = require('./routes/api/v1/interview');
const speechRoutes = require('./routes/api/v1/speech');
const adminRoutes = require('./routes/api/v1/admin');
const userRoutes = require('./routes/api/v1/userRoutes'); 



// --- Application Initialization ---
const app = express();

// --- Core Middleware ---
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "connect-src": ["'self'", "https://accounts.google.com"],
    },
  })
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Frontend Static File Serving ---
// MOVED HERE: This must come before your API routes.
// This tells Express to look in the 'public' folder for any matching files first.
app.use(express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
});

// --- Public Health Check Endpoint ---
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// --- API Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/interview', interviewRoutes);
app.use('/api/v1/speech', speechRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/users', userRoutes); 

// --- Frontend Page Routes ---
// This handles serving your HTML pages for different browser routes.
app.get(['/', '/signin', '/signup', '/dashboard', '/interview', '/results', '/admin/dashboard', '/admin/schedule', '/admin/users', '/admin/groups'], (req, res) => {
    // Basic security to prevent path traversal
    if (req.path.includes('..')) {
        return res.status(400).send('Invalid path');
    }
    // Handle the root path to serve index.html
    const page = req.path === '/' ? '/index' : req.path;
    res.sendFile(path.join(__dirname, `../public${page}.html`));
});

// --- Error Handling Middleware ---
app.use(notFound);
app.use(errorHandler);

// --- Server Startup ---
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();
        const server = app.listen(PORT, '0.0.0.0',() => {
            logger.info(`✅ Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });

        const shutdown = (signal) => {
            process.on(signal, () => {
                logger.info(`${signal} received, shutting down gracefully.`);
                server.close(() => {
                    logger.info('Process terminated.');
                    process.exit(0);
                });
            });
        };
        ['SIGINT', 'SIGTERM'].forEach(shutdown);

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();