const dbPool = require('../db/database');
const bcrypt = require('bcrypt');

const Restaurant = {
	 
	create: (name, email, mobile, password, restaurant_image, is_home, callback) => {
        const hashedPassword = bcrypt.hashSync(password, 10);
        const query = 'INSERT INTO restaurants (name, email, mobile, password, image, is_home, role) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const values = [name, email, mobile, hashedPassword, restaurant_image, is_home, 'restaurant'];

        dbPool.query(query, values, (error, results) => {
            if (error) {
                return callback(error, null);
            }
            callback(null, results[0]);
        });
    },

};

module.exports = Restaurant;
