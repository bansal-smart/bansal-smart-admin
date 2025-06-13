    const pool = require("../../db/database");
const util = require("util");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const query = util.promisify(pool.query).bind(pool);

// Show login page
const login = async (req, res) => {
  try {
    if (req.session && req.session.userRole === "Super Admin") {
      return res.redirect("/admin/dashboard");
    }

    return res.render("admin/auth/login", { message: "" });
  } catch (error) {
    console.error("❌ Login view error:", error.message);
    return res.status(500).send("Internal Server Error");
  }
};

// Handle login POST
const Postlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const users = await query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.render("admin/auth/login", { message: "Email or password is invalid." });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("admin/auth/login", { message: "Incorrect password." });
    }

    // Fetch user roles
    const roleRows = await query(`
      SELECT r.name FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `, [user.id]);

    if (roleRows.length === 0) {
      return res.render("admin/auth/login", { message: "No role assigned to this user." });
    }

    const roles = roleRows.map(r => r.name);
    const userRole = roles[0]; // Use the first role

    // Fetch permissions based
//console.log(user.role_id);
//     // Fetch permissions based on roles
//     const permissionsRows = await query(`
//   SELECT DISTINCT p.name
//   FROM permissions p
//   INNER JOIN role_permissions rp ON rp.permission_id = p.id
//   WHERE rp.role_id = ?
// `, [user.role_id]);

//     const permissions = permissionsRows.map(p => p.name);

    const permissions = getPermissions(user.role_id);
    req.session.permissions = permissions;
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, roles, permissions },
      "your_secret_key",
      { expiresIn: "7d" }
    );

    // Set cookie and session
    res.cookie("access_token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    req.session.userRole = userRole;
    req.session.userId = user.id;


    // console.log("✅ User logged in:", { id: user.id, role: userRole, permissions });

    return res.redirect("/admin/dashboard");

  } catch (error) {
    console.error("❌ Login error:", error.message);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Assign role to a user (utility)
const assignRoleToUser = async (userId, roleName) => {
  try {
    const roles = await query("SELECT id FROM roles WHERE name = ?", [roleName]);
    let roleId = roles.length > 0 ? roles[0].id : null;

    if (!roleId) {
      const insertResult = await query("INSERT INTO roles (name) VALUES (?)", [roleName]);
      roleId = insertResult.insertId;
    }

    await query("INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleId]);

    console.log(`✅ Role '${roleName}' assigned to user ID ${userId}`);
  } catch (error) {
    console.error("❌ Role assignment error:", error.message);
  }
};

// Handle logout
const Logout = (req, res) => {
  try {
    req.session.destroy(err => {
      if (err) {
        console.error("❌ Session destroy error:", err);
      }

      res.clearCookie("access_token");
      return res.redirect("/admin/login");
    });
  } catch (error) {
    console.error("❌ Logout error:", error.message);
    return res.status(500).json({
      status: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};


async function getPermissions(roleId) {
  try {
    const results = await runQuery(`
      SELECT DISTINCT p.name
      FROM permissions p
      INNER JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = ?
    `, [roleId]);

    console.log('Permissions:', results);
  } catch (error) {
    console.error('Error running query:', error);
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
module.exports = {
  login,
  Postlogin,
  Logout,
  assignRoleToUser,
};
