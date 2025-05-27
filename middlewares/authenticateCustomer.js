const jwt = require('jsonwebtoken');
const dbPool = require('../db/database');

function authenticateCustomer(req, res, next) {
	const authorizationHeader = req.headers['authorization'];

	if (!authorizationHeader) {
		return res.status(401).json({ success: false, message: 'Access token missing' });
	}

	const accessToken = authorizationHeader.split(' ')[1];
	
	try {
		const decodedToken = jwt.verify(accessToken, 'your_jwt_secret_key'); // Ideally use process.env.JWT_SECRET

		const customerId = decodedToken.id;

		if (!customerId) {
			return res.status(401).json({ success: false, message: 'Invalid access token: missing user ID' });
		}

		dbPool.query('SELECT * FROM front_users WHERE id = ?', [customerId], (error, rows) => {
			if (error) {
				console.error('DB Error:', error);
				return res.status(500).json({
					success: false,
					message: 'Database error',
					error: error.message || error
				});
			}

			if (rows.length === 0) {
				return res.status(404).json({ success: false, message: 'User not found' });
			}

			// Attach user data to request object as req.user
			req.user = rows[0];
			next();
		});
	} catch (error) {
		console.error('Token Error:', error);
		return res.status(401).json({
			success: false,
			message: 'Invalid or expired access token',
			error: error.message || error
		});
	}
}

module.exports = authenticateCustomer;
