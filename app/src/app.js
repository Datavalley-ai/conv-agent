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

// --- Route Imports (Each variable is declared only ONCE) ---
const authRoutes = require('./routes/api/v1/auth');
const interviewRoutes = require('./routes/api/v1/interview');
const speechRoutes = require('./routes/api/v1/speech');
const adminRoutes = require('./routes/api/v1/admin');

// --- Application Initialization ---
const app = express();

// --- Core Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// --- Frontend Static File Serving ---
app.use(express.static(path.join(__dirname, '../public')));

// --- Frontend Page Routes ---
app.get(['/signin', '/signup', '/dashboard', '/interview', '/results', '/admin/dashboard', '/admin/schedule', '/admin/users'], (req, res) => {
    if (req.path.includes('..')) {
        return res.status(400).send('Invalid path');
    }
    res.sendFile(path.join(__dirname, `../public${req.path}.html`));
});

// --- Error Handling Middleware ---
app.use(notFound);
app.use(errorHandler);

// --- Server Startup ---
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();
        const server = app.listen(PORT, () => {
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