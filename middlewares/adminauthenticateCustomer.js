const jwt = require('jsonwebtoken');
const dbPool = require('../db/database');

function adminAuthenticateCustomer(req, res, next) {

   
  const accessToken = req.cookies.access_token;
 
  if (!accessToken) {
     console.log("No token found, redirecting to login");
    return res.redirect('/admin/login');
  }

  try {
    const decodedToken = jwt.verify(accessToken, 'your_secret_key');
    const customerId = decodedToken.userId;
   // console.log(customerId);
    if (!customerId) {
      return res.redirect('/admin/login');
    }

    dbPool.query('SELECT * FROM users WHERE id = ?', [customerId], (error, rows) => {
      if (error) {
     //   console.error(error);
        return res.status(500).json({ status: false, msg: 'Internal server error.' });
      }

      if (rows.length > 0) {
        
        const customer = rows[0];
        req.customer = customer;
        req.user = customer;

        // Store role and permissions from token/session
        req.roles = decodedToken.roles || [];
        req.permissions = decodedToken.permissions || [];
       
        // Make permissions available to views
        res.locals.user = customer;
        res.locals.roles = req.roles;
        res.locals.permissions = req.permissions;
        
        req.session.userRole = req.roles;

        
        req.session.permissions = req.permissions;

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

module.exports = adminAuthenticateCustomer;
