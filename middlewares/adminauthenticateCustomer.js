const jwt = require('jsonwebtoken');
const dbPool = require('../db/database');

function adminauthenticateCustomer(req, res, next) {
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
        return res.redirect('/admin/login'); 
    }

    try {
        
        const decodedToken = jwt.verify(accessToken, 'your_secret_key');
        const customerId = decodedToken.customerId;

        if (!customerId) {
            return res.redirect('/admin/login'); 
        }

        dbPool.query('SELECT * FROM customers WHERE id = ?', [customerId], (error, rows) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: false, msg: 'Internal server error.' });
            }

            if (rows.length > 0) {
                req.customer = rows[0];
                req.user = rows[0];
                next(); 
            } else {
                return res.redirect('/admin/login'); 
            }
        });

    } catch (error) {
        console.log(error.message);
        return res.redirect('/admin/login'); 
    }
}

module.exports = adminauthenticateCustomer;
