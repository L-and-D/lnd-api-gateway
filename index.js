const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const verifyToken = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));

// Microservices URLs
const services = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    users: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    trainings: process.env.TRAINING_SERVICE_URL || 'http://localhost:3003',
    attendance: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3004',
};

// Protect routes except /api/auth
app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth')) {
        return next();
    }
    verifyToken(req, res, next);
});

// Proxy logic
const proxyOptions = (target, pathPrefix) => ({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${pathPrefix}`]: '' },
    // pathRewrite: (path, req) => {
    //     return path.replace('/api', '') || '/';
    // },
    on: {
        proxyReq: (proxyReq, req, res) => {
            console.log(`[PROXY] Forwarding to ${req.url}. User:`, req.user ? req.user.role : 'None');
            // Forward custom headers set by verifyToken
            if (req.user) {
                proxyReq.setHeader('x-user-id', req.user.id);
                proxyReq.setHeader('x-user-role', req.user.role);
            }
        }
    }
});

app.use('/api/auth', createProxyMiddleware(proxyOptions(services.auth, '/api/auth')));
app.use('/api/users', createProxyMiddleware(proxyOptions(services.users, '/api/users')));
app.use('/api/trainings', createProxyMiddleware(proxyOptions(services.trainings, '/api/trainings')));
app.use('/api/attendance', createProxyMiddleware(proxyOptions(services.attendance, '/api/attendance')));

// Stats Aggregation Routes
const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);

app.get('/', (req, res) => res.send('API Gateway is running.'));

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Gateway Error', error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`API Gateway is running on port ${PORT}`);
});
