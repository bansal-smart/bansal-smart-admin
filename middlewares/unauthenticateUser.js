
const jwt = require('jsonwebtoken');

function unauthenticateCustomer(req, res, next) {
    const accessToken = req.cookies.access_token;
    if (accessToken) {
        try {
            const decodedToken = jwt.verify(accessToken, 'your_secret_key');
            if (decodedToken.customerId) {
                
                return res.redirect('/admin/dashboard');
            }
        } catch (error) {
            
            next();
        }
    } else {
        
        next();
    }
}

module.exports = { unauthenticateCustomer };
