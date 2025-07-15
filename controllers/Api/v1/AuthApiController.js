const Customer = require("../../../models/customerModel");
const Restaurant = require("../../../models/restaurantModel");
const dbPool = require("../../../db/database");
const jwt = require("jsonwebtoken");
const axios = require("axios");
  const util = require("util");


const {
  validateRequiredFields,
} = require("../../../helpers/validationsHelper");
const bcrypt = require("bcrypt");
const db = require("../../../db/database");
const Helper = require("../../../helpers/Helper");
const generateOtp = () => Math.floor(1000 + Math.random() * 9000);

const JWT_SECRET = "your_jwt_secret_key";

const AuthApiController = {


register: async (req, res) => {
  try {
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

    // Validations
    if (!name) return res.status(400).json({ success: false, error: "Name is required" });
    if (!email) return res.status(400).json({ success: false, error: "Email is required" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: "Invalid email format" });
    if (!mobileNumber) return res.status(400).json({ success: false, error: "Mobile number is required" });
    if (!/^\d{10}$/.test(mobileNumber)) return res.status(400).json({ success: false, error: "Mobile number must be 10 digits" });
    if (!city) return res.status(400).json({ success: false, error: "City is required" });
    if (!category_id) return res.status(400).json({ success: false, error: "Category ID is required" });
    if (!class_id) return res.status(400).json({ success: false, error: "Class ID is required" });
    if (!registration_type) return res.status(400).json({ success: false, error: "Registration type is required" });
    if (registration_type === "offline" && !center_id) {
      return res.status(400).json({ success: false, error: "Center ID is required for offline registration" });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // Check for existing user
    const existingUsers = await dbPool.promise().query(`SELECT * FROM front_users WHERE email = ? OR mobile = ?`, [email, mobileNumber]);

    const verifiedUser = existingUsers.find(u => u.verify_otp_status === 1);
    if (verifiedUser) {
      return res.status(200).json({
        success: false,
        error: verifiedUser.email === email ? "Email is already registered and verified" : "Mobile number is already registered and verified",
      });
    }

    const unverifiedUser = existingUsers.find(u => u.verify_otp_status === 0);
    if (unverifiedUser) {
      // Update OTP for unverified user
      await dbPool.promise().query(`UPDATE front_users SET register_otp = ?, otp_expires = ? WHERE mobile = ?`, [otp, otpExpires, mobileNumber]);

      // Send OTP SMS
      const SMS_USERNAME = "20190320";
      const SMS_PASSWORD = "Bansal@1234";
      const SENDER_ID = "VBNSAL";
      const message = `Dear Applicant, ${otp} is your verification code for Online Application at Bansal Classes. Team Bansal`;
      const encodedMsg = encodeURIComponent(message);
      const smsApiUrl = `http://164.52.195.161/API/SendMsg.aspx?uname=${SMS_USERNAME}&pass=${SMS_PASSWORD}&send=${SENDER_ID}&dest=${mobileNumber}&msg=${encodedMsg}&priority=1`;

      try {
        await axios.get(smsApiUrl);
      } catch (error) {
        console.error("❌ SMS Error:", error?.response?.data || error.message);
      }

      return res.status(200).json({
        success: true,
        mobile: mobileNumber,
        message: "OTP sent. Please verify.",
        otp, // ⚠️ remove in production
      });
    }

    // Now handle insert/update in front_users
    Customer.findByMobile(mobileNumber, async (err, customer) => {
      if (err) {
        return res.status(500).json({ success: false, error: "Internal error", details: err.message });
      }

      if (!customer) {
        // Insert new user
        const insertQuery = `
          INSERT INTO front_users 
          (name, email, mobile, city, category_id, class_id, registration_type, center_id, verify_otp_status, register_otp, otp_expires) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [
          name,
          email,
          mobileNumber,
          city,
          category_id,
          class_id,
          registration_type,
          registration_type === "offline" ? center_id : null,
          0,
          otp,
          otpExpires,
        ];

        try {
          await dbPool.promise().query(insertQuery, values);
          // Send OTP SMS
          const SMS_USERNAME = "20190320";
          const SMS_PASSWORD = "Bansal@1234";
          const SENDER_ID = "VBNSAL";
          const message = `Dear Applicant, ${otp} is your verification code for Online Application at Bansal Classes. Team Bansal`;
          const encodedMsg = encodeURIComponent(message);
          const smsApiUrl = `http://164.52.195.161/API/SendMsg.aspx?uname=${SMS_USERNAME}&pass=${SMS_PASSWORD}&send=${SENDER_ID}&dest=${mobileNumber}&msg=${encodedMsg}&priority=1`;

          try {
            await axios.get(smsApiUrl);
          } catch (error) {
            console.error("❌ SMS Error:", error?.response?.data || error.message);
          }

          return res.json({
            success: true,
            mobile: mobileNumber,
            message: "OTP sent successfully",
            otp, // ⚠️ remove in production
          });
        } catch (insertErr) {
          return res.status(500).json({ success: false, error: "Insert failed", details: insertErr.message });
        }
      } else {
        // Customer exists but unverified, update user
        if (customer.verify_otp_status === 1) {
          return res.status(400).json({ success: false, error: "User already registered and verified" });
        }

        const updateData = {
          name,
          email,
          city,
          category_id,
          class_id,
          registration_type,
          center_id: registration_type === "offline" ? center_id : null,
        };

        Customer.updateByMobile(mobileNumber, updateData, async (err) => {
          if (err) {
            return res.status(500).json({ success: false, error: "Failed to update customer", details: err.message });
          }

          await dbPool.promise().query(`UPDATE front_users SET register_otp = ?, otp_expires = ? WHERE mobile = ?`, [otp, otpExpires, mobileNumber]);

          // Send OTP SMS
          const SMS_USERNAME = "20190320";
          const SMS_PASSWORD = "Bansal@1234";
          const SENDER_ID = "VBNSAL";
          const message = `Dear Applicant, ${otp} is your verification code for Online Application at Bansal Classes. Team Bansal`;
          const encodedMsg = encodeURIComponent(message);
          const smsApiUrl = `http://164.52.195.161/API/SendMsg.aspx?uname=${SMS_USERNAME}&pass=${SMS_PASSWORD}&send=${SENDER_ID}&dest=${mobileNumber}&msg=${encodedMsg}&priority=1`;

          try {
            await axios.get(smsApiUrl);
          } catch (error) {
            console.error("❌ SMS Error:", error?.response?.data || error.message);
          }

          return res.status(200).json({
            success: true,
            mobile: mobileNumber,
            message: "OTP sent successfully",
            otp, // ⚠️ remove in production
          });
        });
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Unexpected error", details: error.message });
  }
},
  register1: (req, res) => {
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
    if (!name)
      return res
        .status(400)
        .json({ success: false, error: "Name is required" });
    if (!email)
      return res
        .status(400)
        .json({ success: false, error: "Email is required" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res
        .status(400)
        .json({ success: false, error: "Invalid email format" });

    if (!mobileNumber)
      return res
        .status(400)
        .json({ success: false, error: "Mobile number is required" });
    if (!/^\d{10}$/.test(mobileNumber))
      return res
        .status(400)
        .json({ success: false, error: "Mobile number must be 10 digits" });

    if (!city)
      return res
        .status(400)
        .json({ success: false, error: "City is required" });
    if (!category_id)
      return res
        .status(400)
        .json({ success: false, error: "Category ID is required" });
    if (!class_id)
      return res
        .status(400)
        .json({ success: false, error: "Class ID is required" });
    if (!registration_type)
      return res
        .status(400)
        .json({ success: false, error: "Registration type is required" });
    if (registration_type === "offline" && !center_id)
      return res.status(400).json({
        success: false,
        error: "Center ID is required for offline registration",
      });
    const otp = generateOtp();
    const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes from now
    // Step 1: Check if email or mobile is already registered (verified or not)
    const checkEmailMobileQuery = `
    SELECT * FROM front_users 
    WHERE email = ? OR mobile = ?
  `;

    dbPool.promise().query(
      checkEmailMobileQuery,
      [email, mobileNumber],
      (err, existingUsers) => {
        if (err) {
          return res.status(500).json({
            success: false,
            error: "Internal server error while checking email or mobile",
            details: err.message || err,
          });
        }

        if (existingUsers.length > 0) {
          // Check if any user is verified
          const verifiedUser = existingUsers.find(
            (u) => u.verify_otp_status === 1
          );
          if (verifiedUser) {
            if (verifiedUser.email === email) {
              return res.status(200).json({
                success: false,
                error: "Email is already registered and verified",
              });
            } else {
              return res.status(200).json({
                success: false,
                error: "Mobile number is already registered and verified",
              });
            }
          }

          // User exists but not verified
          const unverifiedUser = existingUsers.find(
            (u) => u.verify_otp_status === 0
          );
          if (unverifiedUser) {
            if (unverifiedUser.email === email) {
              return res.status(200).json({
                success: true,
                mobile: mobileNumber,
                message: "OTP send. Please verify OTPs 295.",
                otp,
              });
            } else {
              return res.status(200).json({
                success: true,
                mobile: mobileNumber,
                message: "OTP send. Please verify OTPs 302.",
                otp,
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

          const saveOtpCallback = async () => {
            const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

            try {
              const otpQuery = `UPDATE front_users SET register_otp = ?, otp_expires = ? WHERE mobile = ?`;

              await new Promise((resolve, reject) => {
                dbPool.promise().query(
                  otpQuery,
                  [otp, otpExpires, mobileNumber],
                  (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                  }
                );
              });

              // ✅ Uncomment and configure to send OTP SMS
              // await axios.post("https://sms-provider.com/send", {
              //   mobile: mobileNumber,
              //   message: `Your OTP is ${otp}`,
              // });

              const SMS_USERNAME = "20190320";
              const SMS_PASSWORD = "Bansal@1234";
              const SENDER_ID = "VBNSAL"; // Ensure it's DLT approved
              const User = customer.name;
              const message = `Dear Applicant, ${otp} is your verification code for Online Application at Bansal Classes. Team Bansal`;
              const encodedMsg = encodeURIComponent(message);

              // Build API URL
              const smsApiUrl = `http://164.52.195.161/API/SendMsg.aspx?uname=${SMS_USERNAME}&pass=${SMS_PASSWORD}&send=${SENDER_ID}&dest=${mobileNumber}&msg=${encodedMsg}&priority=1`;

              try {
                const response = await axios.get(smsApiUrl);
                const responseData = response.status;
                if (responseData == "200") {
                  // console.log("✅ SMS sent successfully!");
                } else {
                  //console.error("❌ Failed to send SMS:", responseData);
                }
              } catch (error) {
                console.error("🚨 Error while sending SMS:", {
                  message: error.message,
                  status: error.response?.status,
                  data: error.response?.data,
                });
              }

              return res.json({
                success: true,
                mobile: mobileNumber,
                message: "OTP sent successfully",
                otp, // ⚠️ Remove in production
              });
            } catch (error) {
              console.error("Error in saveOtpCallback:", error);
              return res.status(500).json({
                success: false,
                message: "Failed to send OTP",
                error: error.message || error,
              });
            }
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

            dbPool.promise().query(sql, values, (err, result) => {
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
      }
    );
  },

  sendOtp: async (req, res) => {
    try {
      const { mobileNumber } = req.body;

      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          error: "Mobile number is required",
        });
      }

      const isValidMobile = /^\d{10}$/.test(mobileNumber);
      if (!isValidMobile) {
        return res.status(400).json({
          success: false,
          error: "Mobile number must be 10 digits",
        });
      }

      // Convert to Promise-style if your model uses callbacks
      const customer = await new Promise((resolve, reject) => {
        Customer.findByMobile(mobileNumber, (err, data) => {
          if (err) return reject(err);
          resolve(data);
        });
      });

      if (!customer) {
        return res.json({
          success: false,
          message: "No user found",
        });
      }

      const otp = generateOtp();

      // Save OTP
      await new Promise((resolve, reject) => {
        Customer.saveOtp(mobileNumber, otp, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      // const SMS_USERNAME = "20190320";
      // const SMS_PASSWORD = "Bansal@1234";
      // const SENDER_ID = "VBNSAL"; // Use the correct approved sender ID

      // const User = customer.name;

      // const message = `Dear ${User}, Download our app BANSAL LIVE ADMISSION from Playstore to appear in BOOST. Your registered number is ${mobileNumber}. You can login via OTP. Team BANSAL`;

      // const encodedMsg = encodeURIComponent(message);
      // const smsApiUrl = `http://164.52.195.161/API/SendMsg.aspx?uname=${SMS_USERNAME}&pass=${SMS_PASSWORD}&send=${SENDER_ID}&dest=${mobileNumber}&msg=${encodedMsg}&priority=1`;

      // const response = await axios.get(smsApiUrl);

      // return response;

      //Helper.sendOtp(Customer,otp );

      const SMS_USERNAME = "20190320";
      const SMS_PASSWORD = "Bansal@1234";
      const SENDER_ID = "VBNSAL"; // Ensure it's DLT approved
      const User = customer.name;
      const message = `Dear Applicant, ${otp} is your verification code for Online Application at Bansal Classes. Team Bansal`;
      const encodedMsg = encodeURIComponent(message);

      // Build API URL
      const smsApiUrl = `http://164.52.195.161/API/SendMsg.aspx?uname=${SMS_USERNAME}&pass=${SMS_PASSWORD}&send=${SENDER_ID}&dest=${mobileNumber}&msg=${encodedMsg}&priority=1`;

      try {
        const response = await axios.get(smsApiUrl);
        const responseData = response.status;
        if (responseData == "200") {
          // console.log("✅ SMS sent successfully!");
        } else {
          //console.error("❌ Failed to send SMS:", responseData);
        }
      } catch (error) {
        console.error("🚨 Error while sending SMS:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }

      // Send SMS
      // const smsResponse = await axios.post("https://sms-provider.com/send", {
      //   entity_id: "1201161734332781452",
      //   sender_id: "JIOOTP",
      //   template_id: "1207165572160768275",
      //   mobile: mobileNumber,
      //   message: `Your OTP is ${otp}`,
      // }, {
      //   headers: {
      //     Authorization: "Bearer YOUR_PROVIDER_API_KEY",
      //     "Content-Type": "application/json",
      //   },
      // });

      return res.json({
        success: true,
        mobile: mobileNumber,

        message: "OTP sent successfully",
        otp, // ⚠️ Remove in production
      });
    } catch (err) {
      const stack = err.stack?.split("\n")[1]?.trim(); // extract first stack line
      console.error("OTP error:", err);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        details: err.message || err,
        at: stack, // includes file & line number
      });
    }
  },
  sendOtpp: (req, res) => {
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
