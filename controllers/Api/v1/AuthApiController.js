const Customer = require("../../../models/customerModel");
const Restaurant = require("../../../models/restaurantModel");
const dbPool = require('../../../db/database');
const jwt = require("jsonwebtoken");
const {
  validateRequiredFields,
} = require("../../../helpers/validationsHelper");
const bcrypt = require("bcrypt");
const db = require("../../../db/database");
const Helper = require("../../../helpers/Helper");
const generateOtp = () => 1234; // For testing; use random in production

const JWT_SECRET = "your_jwt_secret_key";

const AuthApiController = {
  register: (req, res) => {
  const {
    name,
    email,
    mobileNumber,
    city,
    category_id,
    class_id,
    registration_type,
    center_id,
  } = req.body;

  // Basic validation
  if (!name) return res.status(400).json({ success: false, error: "Name is required" });
  if (!email) return res.status(400).json({ success: false, error: "Email is required" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ success: false, error: "Invalid email format" });

  if (!mobileNumber) return res.status(400).json({ success: false, error: "Mobile number is required" });
  if (!/^\d{10}$/.test(mobileNumber))
    return res.status(400).json({ success: false, error: "Mobile number must be 10 digits" });

  if (!city) return res.status(400).json({ success: false, error: "City is required" });
  if (!category_id) return res.status(400).json({ success: false, error: "Category ID is required" });
  if (!class_id) return res.status(400).json({ success: false, error: "Class ID is required" });
  if (!registration_type) return res.status(400).json({ success: false, error: "Registration type is required" });
  if (registration_type === "offline" && !center_id)
    return res.status(400).json({ success: false, error: "Center ID is required for offline registration" });
 const otp = generateOtp();
      const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes from now
  // Step 1: Check if email or mobile is already registered (verified or not)
  const checkEmailMobileQuery = `
    SELECT * FROM front_users 
    WHERE email = ? OR mobile = ?
  `;

  db.query(checkEmailMobileQuery, [email, mobileNumber], (err, existingUsers) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: "Internal server error while checking email or mobile",
        details: err.message || err,
      });
    }

    if (existingUsers.length > 0) {
      // Check if any user is verified
      const verifiedUser = existingUsers.find(u => u.verify_otp_status === 1);
      if (verifiedUser) {
        if (verifiedUser.email === email) {
          return res.status(400).json({ success: false, error: "Email is already registered and verified" });
        } else {
          return res.status(400).json({ success: false, error: "Mobile number is already registered and verified" });
        }
      }

      // User exists but not verified
      const unverifiedUser = existingUsers.find(u => u.verify_otp_status === 0);
     if (unverifiedUser) {
  if (unverifiedUser.email === email) {
    return res.status(200).json({
       success: true,
      mobile: mobileNumber,
      message: "OTP send. Please verify OTP.",
      otp
    });
  } else {
    return res.status(200).json({
       success: true,
      mobile: mobileNumber,
      message: "OTP send. Please verify OTP.",
      otp
    });
  }
}
    }

    // Step 2: Proceed to find or insert/update customer
    Customer.findByMobile(mobileNumber, (err, customer) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: "Internal server error",
          details: err.message || err,
        });
      }

     

      const saveOtpCallback = () => {
        const otpQuery = `UPDATE front_users SET register_otp = ?, otp_expires = ? WHERE mobile = ?`;
        db.query(otpQuery, [otp, otpExpires, mobileNumber], (err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              error: "Failed to save OTP",
              details: err.message || err,
            });
          }

          return res.json({
            success: true,
            mobile: mobileNumber,
            message: "OTP sent successfully",
            otp, // ⚠️ For development only; remove in production
          });
        });
      };

      // Step 3: If customer doesn't exist, insert
      if (!customer) {
        const sql = `
          INSERT INTO front_users 
          (name, email, mobile, city, category_id, class_id, registration_type, center_id, verify_otp_status, register_otp, otp_expires) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          name,
          email,
          mobileNumber,
          city,
          category_id,
          class_id,
          registration_type,
          registration_type === "offline" ? center_id : null,
          0, // OTP not verified yet
          otp,
          otpExpires,
        ];

        db.query(sql, values, (err, result) => {
          if (err) {
            return res.status(500).json({
              success: false,
              error: "Failed to create customer",
              details: err.message || err,
            });
          }

          return res.json({
            success: true,
            mobile: mobileNumber,
            message: "OTP sent successfully",
            otp, // ⚠️ Remove this in production
          });
        });

      } else {
        // Step 4: If customer exists but not verified, update
        if (customer.verify_otp_status) {
          return res.status(400).json({
            success: false,
            error: "User already registered and verified",
          });
        } else {
          const updateData = {
            name,
            email,
            city,
            category_id,
            class_id,
            registration_type,
            center_id: registration_type === "offline" ? center_id : null,
          };

          Customer.updateByMobile(mobileNumber, updateData, (err) => {
            if (err) {
              return res.status(500).json({
                success: false,
                error: "Failed to update customer",
                details: err.message || err,
              });
            }

            // Save OTP after update
            saveOtpCallback();
          });
        }
      }
    });
  });
},


  sendOtp: (req, res) => {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res
        .status(400)
        .json({ success: false, error: "Mobile number is required" });
    }

    const isValidMobile = /^\d{10}$/.test(mobileNumber);
    if (!isValidMobile) {
      return res
        .status(400)
        .json({ success: false, error: "Mobile number must be 10 digits" });
    }

    Customer.findByMobile(mobileNumber, (err, customer) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: "Internal server error",
          details: err.message || err,
        });
      }

      const otp = generateOtp();

      const saveOtpCallback = () => {
        Customer.saveOtp(mobileNumber, otp, (err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              error: "Failed to save OTP",
              details: err.message || err,
            });
          }

          res.json({
            success: true,
            mobile: mobileNumber,
            message: "OTP sent successfully",
            otp, // Remove in production
          });
        });
      };

      if (!customer) {
        res.json({
          success: false,
          message: "No User found",
        });
      } else {
        saveOtpCallback();
      }
    });
  },

  verifyOtp: (req, res) => {
  const { mobileNumber, otp } = req.body;

  if (!mobileNumber || !otp) {
    return res
      .status(400)
      .json({ success: false, error: "Mobile number and OTP are required" });
  }

  Customer.verifyOtp(mobileNumber, otp, (err, customer) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        details: err.message || err,
      });
    }

    if (!customer) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid OTP or OTP expired" });
    }

    // ✅ Update verify_otp_status = 1
    const updateSql = `UPDATE front_users SET verify_otp_status = 1 WHERE mobile = ?`;
    dbPool.query(updateSql, [mobileNumber], (updateErr, updateResult) => {
      if (updateErr) {
        return res.status(500).json({
          success: false,
          error: "Failed to update verification status",
          details: updateErr.message || updateErr,
        });
      }

      // ✅ Generate JWT token
      const payload = { id: customer.id, mobile: customer.mobile };
      const access_token = jwt.sign(payload, JWT_SECRET);

      res.json({
        success: true,
        message: "OTP verified successfully",
        access_token,
        customer: { ...customer, verify_otp_status: 1 }, // return updated status
      });
    });
  });
},

  restaurantRegister: (req, res) => {
    try {
      const { name, email, mobile, password, confirm_password } = req.body;
      let restaurant_image = "";

      if (req.files && req.files.length > 0) {
        restaurant_image = req.files
          .map((file) => file.path.replace(/\\/g, "/"))
          .join(",");
      }

      const is_home = req.body.is_home ? 1 : 0;
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const isValidMobile = /^\d{10}$/.test(mobile);

      const requiredFields = [
        "name",
        "email",
        "mobile",
        "password",
        "confirm_password",
      ];
      const missingFields = validateRequiredFields(req, res, requiredFields);
      const errors = [];

      if (missingFields.length > 0) {
        errors.push(...missingFields);
      }

      if (!isValidEmail) {
        errors.push({ field: "email", message: "Invalid email format" });
      }

      if (!isValidMobile) {
        errors.push({
          field: "mobile",
          message: "Mobile number must be 10 digits",
        });
      }

      if (password !== confirm_password) {
        errors.push({
          field: "confirm_password",
          message: "Confirm Password should be the same as Password",
        });
      }

      if (errors.length > 0) {
        return res
          .status(400)
          .json({ success: false, error: errors[0].message });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);

      Restaurant.create(
        name,
        email,
        mobile,
        hashedPassword,
        restaurant_image,
        is_home,
        (err, newRestaurant) => {
          if (err) {
            return res.status(500).json({
              success: false,
              error: "Failed to create restaurant",
              details: err.message || err,
            });
          }

          res.json({
            success: true,
            message: "Restaurant registered successfully",
            restaurant: newRestaurant,
          });
        }
      );
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        details: err.message,
      });
    }
  },
};

module.exports = AuthApiController;
