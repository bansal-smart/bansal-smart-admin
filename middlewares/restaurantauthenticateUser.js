const jwt = require('jsonwebtoken');
const dbPool = require('../db/database');

function restaurantauthenticateUser(req, res, next) {
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
        return res.redirect('/restaurant/login'); 
    }

    try {
        
        const decodedToken = jwt.verify(accessToken, 'your_secret_restro_key');
        const restaurantId = decodedToken.restaurantId;

        if (!restaurantId) {
            return res.redirect('/restaurant/login'); 
        }

        dbPool.query('SELECT * FROM restaurants WHERE id = ?', [restaurantId], (error, rows) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: false, msg: 'Internal server error.' });
            }

            if (rows.length > 0) {
                req.restaurant = rows[0];
                req.user = rows[0];
              
                next(); 
            } else {
                return res.redirect('/restaurant/login'); 
            }
        });

    } catch (error) {
        console.log(error.message);
        return res.redirect('/restaurant/login'); 
    }
}

module.exports = restaurantauthenticateUser;
