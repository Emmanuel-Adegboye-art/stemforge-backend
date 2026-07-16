const rateLimitMap = new Map();

const rateLimit = (windowMs = 60000, max = 30) => {
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        if (!rateLimitMap.has(key)) {
            rateLimitMap.set(key, []);
        }
        
        const requests = rateLimitMap.get(key).filter(time => now - time < windowMs);
        
        if (requests.length >= max) {
            return res.status(429).json({ 
                error: { message: 'Too many requests, please slow down' } 
            });
        }
        
        requests.push(now);
        rateLimitMap.set(key, requests);
        next();
    };
};

module.exports = { rateLimit };

