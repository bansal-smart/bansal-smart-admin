const Customer = require("../../../models/customerModel");
const Restaurant = require("../../../models/restaurantModel");
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

    // Validation
    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "Name is required" });
    }

    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "Email is required" });
    }

    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid email format" });
    }

    if (!mobileNumber) {
      return res
        .status(400)
        .json({ success: false, error: "Mobile number is required" });
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      return res
        .status(400)
        .json({ success: false, error: "Mobile number must be 10 digits" });
    }

    if (!city) {
      return res
        .status(400)
        .json({ success: false, error: "City is required" });
    }

    if (!category_id) {
      return res
        .status(400)
        .json({ success: false, error: "Category ID is required" });
    }

    if (!class_id) {
      return res
        .status(400)
        .json({ success: false, error: "Class ID is required" });
    }

    if (!registration_type) {
      return res
        .status(400)
        .json({ success: false, error: "Registration type is required" });
    }

    if (registration_type === "offline" && !center_id) {
      return res.status(400).json({
        success: false,
        error: "Center ID is required for offline registration",
      });
    }

    // Find existing customer by mobile
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
            otp, // Remove this in production
          });
        });
      };

      if (!customer) {
        const sql = `
    INSERT INTO front_users 
    (name, email, mobile, city, category_id, class_id, registration_type, center_id, verify_otp_status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          0, // default verify_otp_status
        ];

        db.query(sql, values, (err, result) => {
          if (err) {
            return res.status(500).json({
              success: false,
              error: "Failed to create customer",
              details: err.message || err,
              stack: err.stack,
            });
          }

          // Save OTP after successful insert
          saveOtpCallback();
        });
      } else {
        // Update existing customer if not verified
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

          Customer.updateByMobile(
            mobileNumber,
            updateData,
            (err, updatedCustomer) => {
              if (err) {
                return res.status(500).json({
                  success: false,
                  error: "Failed to update customer",
                  details: err.message || err,
                });
              }
              saveOtpCallback();
            }
          );
        }
      }
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

      const payload = { id: customer.id, mobile: customer.mobile };
      const access_token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

      res.json({
        success: true,
        message: "OTP verified successfully",
        access_token,
        customer,
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
