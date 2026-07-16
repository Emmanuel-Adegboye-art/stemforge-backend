function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: {
                message: 'Validation failed',
                details: Object.values(err.errors).map(e => e.message)
            }
        });
    }
    
    if (err.code === 11000) {
        return res.status(400).json({
            error: { message: 'Duplicate entry' }
        });
    }
    
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: { message: 'Invalid authentication token' }
        });
    }
    
    const response = {
        error: { message: err.message || 'Internal server error' }
    };

    if (err.details) {
        response.error.details = err.details;
    }

    res.status(err.status || 500).json(response);
}

module.exports = errorHandler;
