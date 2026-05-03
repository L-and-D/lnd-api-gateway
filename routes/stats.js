const express = require('express');
const axios = require('axios');
const router = express.Router();

const services = {
    users: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    trainings: process.env.TRAINING_SERVICE_URL || 'http://localhost:3003',
    attendance: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3004',
};

// Middleware to forward headers
const createConfig = (req) => ({
    headers: {
        'x-user-id': req.user.id,
        'x-user-role': req.user.role
    }
});

const redisClient = require('../redisClient');

router.get('/admin', async (req, res, next) => {
    try {
        if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });

        const cacheKey = `stats:admin`;
        
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                console.log(`[CACHE HIT] Returning cached data for ${cacheKey}`);
                return res.json(JSON.parse(cachedData));
            }
        } catch (cacheErr) {
            console.error('Redis cache error:', cacheErr);
        }

        console.log(`[CACHE MISS] Fetching fresh data for ${cacheKey}`);
        const config = createConfig(req);
        const [usersRes, trainingsRes] = await Promise.all([
            axios.get(`${services.users}/stats`, config),
            axios.get(`${services.trainings}/stats`, config)
        ]);

        const allTrainingsRes = await axios.get(`${services.trainings}/`, config);
        const trainings = allTrainingsRes.data;

        const enrollmentStats = trainings.map(t => ({
            name: t.title,
            enrollments: Math.floor(Math.random() * t.capacity)
        }));

        const result = {
            users: usersRes.data,
            trainings: trainingsRes.data,
            enrollments: enrollmentStats,
            recentActivity: [
                { id: 1, action: 'New User Registered', time: '10 mins ago' },
                { id: 2, action: 'Training "React Native" Created', time: '1 hour ago' },
                { id: 3, action: 'Attendance marked for "Docker 101"', time: '2 hours ago' }
            ]
        };

        try {
            await redisClient.setEx(cacheKey, 60, JSON.stringify(result)); // Cache for 60 seconds
        } catch (cacheErr) {
            console.error('Redis set error:', cacheErr);
        }

        res.json(result);
    } catch (error) {
        console.error('Admin Stats Error:', error.message);
        res.status(500).json({ message: 'Failed to fetch admin stats' });
    }
});

router.get('/trainer', async (req, res, next) => {
    try {
        if (req.user.role !== 'Trainer') return res.status(403).json({ message: 'Forbidden' });

        const cacheKey = `stats:trainer:${req.user.id}`;
        
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                console.log(`[CACHE HIT] Returning cached data for ${cacheKey}`);
                return res.json(JSON.parse(cachedData));
            }
        } catch (cacheErr) {
            console.error('Redis cache error:', cacheErr);
        }

        console.log(`[CACHE MISS] Fetching fresh data for ${cacheKey}`);
        const config = createConfig(req);
        const trainingsRes = await axios.get(`${services.trainings}/trainer/${req.user.id}`, config);
        const trainings = trainingsRes.data;

        const totalAssigned = trainings.length;
        const upcoming = trainings.filter(t => t.status === 'Upcoming').length;
        const ongoing = trainings.filter(t => t.status === 'Ongoing').length;
        
        const performance = trainings.map(t => ({
            name: t.title,
            score: Math.floor(Math.random() * 40) + 60 
        }));

        const result = {
            assigned: totalAssigned,
            upcoming,
            ongoing,
            trainings,
            performance
        };

        try {
            await redisClient.setEx(cacheKey, 60, JSON.stringify(result));
        } catch (cacheErr) {
            console.error('Redis set error:', cacheErr);
        }

        res.json(result);
    } catch (error) {
        console.error('Trainer Stats Error:', error.message);
        res.status(500).json({ message: 'Failed to fetch trainer stats' });
    }
});

router.get('/employee', async (req, res, next) => {
    try {
        const cacheKey = `stats:employee:${req.user.id}`;
        
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                console.log(`[CACHE HIT] Returning cached data for ${cacheKey}`);
                return res.json(JSON.parse(cachedData));
            }
        } catch (cacheErr) {
            console.error('Redis cache error:', cacheErr);
        }

        console.log(`[CACHE MISS] Fetching fresh data for ${cacheKey}`);
        const config = createConfig(req);
        const trainingsRes = await axios.get(`${services.trainings}/`, config); 
        const allTrainings = trainingsRes.data;
        
        const enrolled = allTrainings.slice(0, 3).map(t => ({
            ...t,
            progress: Math.floor(Math.random() * 100),
            status: Math.random() > 0.5 ? 'In Progress' : 'Completed'
        }));

        const completedCourses = enrolled.filter(t => t.status === 'Completed').length;

        const result = {
            enrolledCount: enrolled.length,
            completedCourses,
            enrolled,
            upcomingSessions: enrolled.filter(t => t.status !== 'Completed')
        };

        try {
            await redisClient.setEx(cacheKey, 60, JSON.stringify(result));
        } catch (cacheErr) {
            console.error('Redis set error:', cacheErr);
        }

        res.json(result);
    } catch (error) {
        console.error('Employee Stats Error:', error.message);
        res.status(500).json({ message: 'Failed to fetch employee stats' });
    }
});

module.exports = router;
