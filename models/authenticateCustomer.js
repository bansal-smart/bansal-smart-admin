const jwt = require('jsonwebtoken');
const dbPool = require('../db/database');

function authenticateCustomer(req, res, next) {
	const authorizationHeader = req.headers['authorization'];

	if (!authorizationHeader) {
		return res.status(200).json({ status: false, msg: 'Unauthorized: Access token missing' });
	}

	const accessToken = authorizationHeader.split(' ')[1];

	try {
		
		const decodedToken = jwt.verify(accessToken, 'your_secret_key');
		const customerId = decodedToken.customerId;

		if (!customerId) {
			return res.status(200).json({ status: false, msg: 'Unauthorized: Invalid access token' });
		}

		dbPool.query('SELECT * FROM customers WHERE id = ?', [customerId], (error, rows) => {
			if (error) {
				console.error(error);
				return res.status(500).json({ status: false, msg: 'Internal server error.' });
			}

			if (rows.length > 0) {
				req.customer = rows[0];
				next();
			}
		});

	} catch (error) {
		return res.status(200).json({ status: false, msg: 'Unauthorized: Invalid access token' });
	}
}

module.exports = authenticateCustomer;
