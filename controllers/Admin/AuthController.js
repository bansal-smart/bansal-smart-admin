const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const util = require("util");
const { console } = require("inspector");
const query = util.promisify(pool.query).bind(pool);
const login = async (req, res) => {
  try {
    if (req.session && req.session.userRole === "Super Admin") {
      console.log("User is already logged in:", req.session);
      return res.redirect("/admin/dashboard");
    }

    res.render("admin/auth/login", { message: "" });
  } catch (error) {
    console.error("Error in login controller:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const Postlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const rows = await query("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length > 0) {
      const user = rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        const tokenResult = jwt.sign(
          { customerId: user.id },
          "your_secret_key",
          { expiresIn: "7d" }
        );
        res.cookie("access_token", tokenResult, {
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.session.userRole = "Super Admin";
        res.userRole = "Super Admin";
        res.restaurantId = user.id;

        await assignRoleToUser(user.id, "Super Admin");

        console.log("✅ User role set in session:", req.session.userRole);
        return res.redirect("/admin/dashboard");
      } else {
        return res.render("admin/auth/login", {
          message: "Password Not Match",
        });
      }
    } else {
      return res.render("admin/auth/login", {
        message: "Email and password Invalid",
      });
    }
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({
        status: false,
        msg: "Internal server error",
        error: error.message,
      });
  }
};

const assignRoleToUser = async (userId, roleName) => {
  try {
    const roles = await query(`SELECT id FROM roles WHERE name = ?`, [
      roleName,
    ]);
    let roleId = roles.length > 0 ? roles[0].id : null;

    if (!roleId) {
      const insertRole = await query(`INSERT INTO roles (name) VALUES (?)`, [
        roleName,
      ]);
      roleId = insertRole.insertId;
    }

    await query(
      `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
      [userId, roleId]
    );

    console.log(`✅ Assigned role '${roleName}' to user ID ${userId}`);
  } catch (err) {
    console.error("❌ Error assigning role to user:", err.message);
  }
};
const Logout = (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("❌ Error destroying session:", err);
      }

      res.clearCookie("access_token");

      return res.redirect("/admin/login");
    });
  } catch (error) {
    console.error("❌ Logout error:", error.message);
    return res
      .status(500)
      .json({ status: false, msg: "Logout failed", error: error.message });
  }
};

module.exports = { login, Postlogin, Logout };
