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

     

const permissions = getPermissions(customer.role_id);



        res.locals.user = customer;
        res.locals.roles = req.roles;
        res.locals.permissions = permissions;

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

async function getPermissions(roleId) {
  try {
    const results = await query(`
      SELECT DISTINCT p.name
      FROM permissions p
      INNER JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = ?
    `, [roleId]);

    // results is an array of objects like [{ name: 'perm1' }, { name: 'perm2' }, ...]
    // So map to get an array of strings:
    return results.map(row => row.name);
  } catch (error) {
    console.error('Error running query:', error);
    return [];
  }
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    dbPool.query(sql, params, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
}

module.exports = adminAuthenticateCustomer;
