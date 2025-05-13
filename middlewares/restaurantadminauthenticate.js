const jwt = require('jsonwebtoken');
const dbPool = require('../db/database');

function restaurantadminauthenticate(req, res, next) {
    try {
        const adminToken = req.cookies.admin_token;
        const restroToken = req.cookies.access_token;

        if (!adminToken && !restroToken) {
            return res.redirect('/restaurant/login'); // Redirect if neither is logged in
        }

        return next();

    } catch (error) {
        console.error("Authentication Error:", error.message);
        return res.redirect('/restaurant/login');
    }
}

module.exports = restaurantadminauthenticate;
