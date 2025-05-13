const dbPool = require('../db/database');

const Customer = {
    
    findByMobile: (mobileNumber, callback) => {
        dbPool.query('SELECT * FROM customers WHERE mobile = ?', [mobileNumber], (error, results) => {
            if (error) return callback(error, null);
            callback(null, results[0]);
        });
    },

    
    saveOtp: (mobileNumber, otp, callback) => {
        const expiresIn = Date.now() + 5 * 60 * 1000; 
        dbPool.query('UPDATE customers SET otp = ?, otp_expires = ? WHERE mobile = ?', [otp, expiresIn, mobileNumber], (error, results) => {
            if (error) return callback(error, null);
            callback(null, results);
        });
    },

    
    verifyOtp: (mobileNumber, otp, callback) => {
        dbPool.query('SELECT * FROM customers WHERE mobile = ? AND otp = ? AND otp_expires > ?', [mobileNumber, otp, Date.now()], (error, results) => {
            if (error) return callback(error, null);
            callback(null, results[0]);
        });
    },

	 
	create: (mobileNumber, callback) => {
		const query = 'INSERT INTO customers (mobile, role) VALUES (?, ?)';
		const values = [mobileNumber, 'customer']; 
	
		dbPool.query(query, values, (error, results) => {
			if (error) {
				return callback(error, null);
			}
			callback(null, results[0]);
		});

    },

};

module.exports = Customer;
