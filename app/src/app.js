// /app/src/app.js

// --- Core Dependencies ---
require('dotenv').config(); // Load environment variables first
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const logger = require('./utils/logger'); // Assuming a logger utility exists
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/error');

// --- Route Imports ---
// Correctly import the renamed auth route file
const authRoutes = require('./routes/api/v1/auth'); 
const interviewRoutes = require('./routes/api/v1/interview'); // We will need this next
const speechRoutes = require('./routes/api/v1/speech'); 
const adminRoutes = require('./routes/api/v1/admin');
// --- Application Initialization ---
const app = express();

// --- Database Connection ---
connectDB();

// --- Core Middleware ---
app.use(helmet()); // Apply essential security headers
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies

// Simple request logger middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
});

// --- API Routes ---
// Mount the v1 API routes. All routes defined here will be prefixed with /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/interview', interviewRoutes);
app.use('/api/v1/speech', speechRoutes); 
app.use('/api/v1/admin', adminRoutes);
// Other v1 routes like /chat, /admin can be added here as we build them out.

// --- Frontend Static File Serving ---
// Serve the 'public' directory, which contains our HTML, CSS, and JS files
app.use(express.static(path.join(__dirname, '../public')));

// --- Frontend Page Routes ---
// These routes ensure that directly visiting URLs like /signin serves the correct HTML file.
app.get('/signin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/signin.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/signup.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/interview', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/interview.html'));
});

// --- Error Handling Middleware ---
// These must be the LAST app.use() calls
app.use(notFound); // Handle 404 Not Found errors
app.use(errorHandler); // Global error handler for all other errors

// --- Server Initialization ---
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    logger.info(`✅ Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// --- Graceful Shutdown ---
// Handle process termination signals to shut down the server gracefully
const gracefulShutdown = (signal) => {
    process.on(signal, () => {
        logger.info(`${signal} received, shutting down gracefully.`);
        server.close(() => {
            logger.info('Process terminated.');
            process.exit(0);
        });
    });
};

console.log(''); // Add a blank line for readability
console.log('--- Verifying All Registered API Routes ---');
function printRoutes(stack, basePath) {
    stack.forEach(function(r) {
        if (r.route && r.route.path) {
            const methods = Object.keys(r.route.methods).join(', ').toUpperCase();
            console.log(`✅ ${methods} ${basePath}${r.route.path}`);
        } else if (r.name === 'router') {
            // It's a sub-router, recurse into it
            printRoutes(r.handle.stack, basePath + r.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)', ''));
        }
    });
}
printRoutes(app._router.stack, '');
console.log('--- End of Route List ---');
console.log('');
// ===============================================================


['SIGINT', 'SIGTERM'].forEach(gracefulShutdown);