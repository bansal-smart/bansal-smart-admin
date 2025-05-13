const db = require('../db/database');

const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    const userId = req.user.id; // Assume you’ve set req.user via auth middleware

    const [rows] = await db.query(
      `SELECT p.name FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN roles r ON rp.role_id = r.id
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ? AND p.name = ?`,
      [userId, permissionName]
    );

    if (rows.length > 0) {
      next();
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }
  };
};

module.exports = checkPermission;
