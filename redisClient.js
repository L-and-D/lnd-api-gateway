const { createClient } = require('redis');

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

// Initialize connection
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('Initial Redis Connection Failed:', err);
    }
})();

module.exports = redisClient;
