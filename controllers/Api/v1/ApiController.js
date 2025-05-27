// Dependencies
const pool = require("../../../db/database");
const randomstring = require("randomstring");
const { sendSuccess, sendError } = require("../../../helpers/Helper");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const Joi = require("joi");
const Helper = require("../../../helpers/Helper");
const Razorpay = require("razorpay"); // Import Razorpay

// Initialize Razorpay instance

const {
  BASE_URL,
  PUBLIC_PATH,
  NO_IMAGE_URL,
} = require("../../../config/constants");
const {
  fetchMenus,
  fetchMenuDetail,
  fetchBanners,
  fetchRestaurants,
  fetchPlaces,
  fetchOfferBanners,
  fetchTestimonial,
  fetchInstaVideo,
} = require("../../Admin/CommonController");

// Controller
const ApiController = {
  /**
   * Home API
   * Fetches categories, courses, servicable cities, testimonials, FAQs, and banners.
   */

  test: async (req, res) => {
    res.status(200).json({
      success: true,
      message: "Test",
    });
  },
  homeApi: async (req, res) => {
    try {
      // Fetch categories with selected columns
      const categories = await Helper.getActiveCategoriesByType("course", [
        "id",
        "category_name",
        "image",
        "slug",
      ]);

      // Fetch courses for each category and add them to the category object
      for (const category of categories) {
        const courses = await Helper.getCoursesByCategoryId(category.id, [
          "id",
          "course_name",
          "title_heading",
          "slug",
          "course_type",
          "mode_of_class",
          "price",
          "discount",
          "offer_price",
          "batch_type",
          "content",
          "image",

          "details_image",
        ]);
        category.courses = courses;
      }

      // Fetch servicable cities
      const servicableCities = await Helper.getServicableCities();


      const testimonials = await Helper.getTestimonials([
        "id",
        "name",
        "description",
        "subject",
        "image",
      ]);

      // Fetch FAQs
      const faqs = await Helper.getFaqs([
        "id",
        "title",
        "description",
        "status",
      ]);

      // Fetch banners
      const banners = await Helper.getBanners([
        "id",
        "title",
        "banner",
        "banner_link",
        "banner_type",
        "position",
      ]);

      // Prepare response data
      const data = {
        categories,
        servicableCities,
        testimonials,
        faqs,
        banners,
      };

      // Send response
      res.status(200).json({
        success: true,
        message: "Home List",

        base_url: BASE_URL,
        public_path: PUBLIC_PATH,
        NO_IMAGE_URL: NO_IMAGE_URL,
        path: req.originalUrl,
        data,
      });
    } catch (error) {
      console.error("Error in homeApi:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",

        base_url: BASE_URL,
        public_path: PUBLIC_PATH,
        NO_IMAGE_URL: NO_IMAGE_URL,
        path: req.originalUrl,
        error: error.message,
      });
    }
  },

  courseList: async (req, res) => {
    try {
      const { category_id } = req.query;
      const slug = req.body.slug;

      const filters = { status: "active" };
      if (category_id) {
        filters.category_id = category_id;
      }

      const categories = await Helper.getActiveCategoriesByType("course", [
        "id",
        "category_name",
        "image",
        "slug",
      ]);

      let selectedCategory = null;
      const other_categories = [];

      for (const category of categories) {
        const isActive = slug && category.slug === slug;
        category.is_active = isActive ? 1 : 0;

        if (isActive) {
          selectedCategory = category;
        } else {
          other_categories.push(category);
        }

        const courses = await Helper.getCoursesByCategoryId(category.id, [
          "id",
          "course_name",
          "title_heading",
          "slug",
          "course_type",
          "mode_of_class",
          "price",
          "discount",
          "offer_price",
          "image",
        ]);

        category.courses = courses;
      }

      res.status(200).json({
        success: true,
        message: "Course List",
        base_url: BASE_URL,
        public_path: PUBLIC_PATH,
        path: req.originalUrl,
        NO_IMAGE_URL: NO_IMAGE_URL,
        data: categories,
        other_categories: other_categories,
      });
    } catch (error) {
      console.error("Error in courseList:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  courseDetails: async (req, res) => {
    try {
      const { slug } = req.body;

      if (!slug) {
        return res.status(400).json({
          success: false,
          message: "Course slug is required",
          base_url: BASE_URL,
          public_path: PUBLIC_PATH,
          NO_IMAGE_URL: NO_IMAGE_URL,
          path: req.originalUrl,
        });
      }

      // Fetch course details by slug
      const course = await Helper.getCourseBySlug(slug);
      const teachers = await Helper.getActiveFaculties();
      const faq = await Helper.getFaqs();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
          base_url: BASE_URL,
          public_path: PUBLIC_PATH,
          path: req.originalUrl,
        });
      }

      // Add hardcoded values (should be replaced with dynamic values later)
      course.subject_name = "Subject Name";
      course.class_name = "Class Name";
      course.category_name = "Category Name";
      course.course = 3;
      course.video_count = 3;
      course.pdf_count = 3;
      course.audio_count = 3;
      course.notes_count = 3;

      // GST Calculation
      const discountAmount = 0; // If any logic needed, apply here
      const gstPercentage = 18;
      const gstAmount = Math.round((course.offer_price * gstPercentage) / 100);
      const totalAmountWithGST = course.offer_price + gstAmount;

      course.discount_amount = discountAmount;
      course.gst_per = gstPercentage;
      course.gst_amount = gstAmount;
      course.total_amount = totalAmountWithGST;

      return res.status(200).json({
        success: true,
        message: "Course Details",
        base_url: BASE_URL,
        public_path: PUBLIC_PATH,
        NO_IMAGE_URL: NO_IMAGE_URL,
        path: req.originalUrl,
        data: course,
        teachers,
        faq,
      });
    } catch (error) {
      console.error("Error in courseDetails:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        base_url: BASE_URL,
        public_path: PUBLIC_PATH,
        NO_IMAGE_URL: NO_IMAGE_URL,
        path: req.originalUrl,
        error: error.message,
      });
    }
  },
  getCms: async (req, res) => {
    try {
      const { slug } = req.body;

      if (!slug || typeof slug !== "string") {
        return res.status(400).json({
          success: false,
          message: "Slug is required and must be a string",
          errors: { slug: ["Slug is required and must be a string"] },
        });
      }

      const data = await Helper.getCMSContentBySlug(slug.trim());

      if (!data) {
        return res.status(404).json({
          success: false,
          message: `No content found for slug: ${slug}`,
          data: null,
        });
      }

      return res.json({
        success: true,
        message: "CMS content retrieved successfully",
        data,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  },

  categoryList: async (req, res) => {
    try {
      const data = await Helper.getActiveCategoriesByType("course", [
        "id",
        "category_name",
        "slug",
      ]);

      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No active course categories found",
          data: [],
        });
      }

      return res.json({
        success: true,
        message: "Course categories retrieved successfully",
        data,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Error fetching course categories",
        error: err.message,
      });
    }
  },

  courseClassList: async (req, res) => {
    try {
      const { category_id } = req.body;

      // Validate category_id
      if (!category_id || isNaN(category_id)) {
        return res.status(400).json({
          success: false,
          message: "category_id is required and must be a valid number",
          errors: { category_id: ["Invalid or missing category_id"] },
        });
      }

      // Pass category_id to helper
      const data = await Helper.getActiveCourseClasses(category_id);

      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No course classes found for category_id: ${category_id}`,
          data: [],
        });
      }

      return res.json({
        success: true,
        message: "Course classes retrieved successfully",
        data,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Error fetching course classes",
        error: err.message,
      });
    }
  },

 centerList: async (req, res) => {
  try {
    
    const columns = Array.isArray(req.body.columns) ? req.body.columns : [];
    const data = await Helper.getCenters(columns, req.body.city);
    const cities = await Helper.getServicableCities();
    const [testimonialRows] = await Helper.getTestimonials();

    // if (!data || data.length === 0) {
    //   return Helper.sendError(res, "No centers found", null, 404);
    // }

    return res.status(200).json({
      success: true,
      message: "Centers retrieved successfully",
      data,
      cities,
      testimonials: testimonialRows
    });
  } catch (err) {
    return Helper.sendError(res, "Error fetching centers", err, 500);
  }
},

centerDetails: async (req, res) => {
  try {
    const center_id = req.body.center_id;
    const data = await Helper.getCenterDetails(center_id);
     const courses = await Helper.getCenterCourses(center_id);

    return res.status(200).json({
      success: true,
      message: "Centers retrieved successfully",
      data,
      courses,
    });
  } catch (err) {
    return Helper.sendError(res, "Error fetching centers", err, 500);
  }
},
  couponList: async (req, res) => {
    try {
      const type = req.body.type;

      if (!type) {
        // Pass a descriptive error string instead of null
        return Helper.sendError(
          res,
          "Coupon type is required",
          "Missing query parameter: type",
          400
        );
      }

      const data = await Helper.getActiveCouponList(type);

      if (!data || data.length === 0) {
        return Helper.sendError(
          res,
          "No coupons found for this type",
          "No coupons available for type: " + type,
          404
        );
      }

      return Helper.sendSuccess(res, "Coupons retrieved successfully", data);
    } catch (err) {
      return Helper.sendError(res, "Error fetching coupons", err, 500);
    }
  },
  createOrder: async (req, res) => {
    try {
      // Initialize Razorpay instance
      const razorpay = new Razorpay({
        key_id: "rzp_test_Ql00vist0zmjZS", // Replace with your actual key
        key_secret: "SwVDx8S9H52gW9Ex8x2k80CE", // Replace with your actual secret
      });

      const { amount, receipt } = req.body;

      if (!amount || isNaN(amount)) {
        return res.status(400).json({
          success: false,
          message: "Amount is required and must be numeric",
        });
      }

      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: amount * 100, // Amount in paise
        currency: "INR",
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: { platform: "NodeJS" },
      });

      return res.json({
        success: true,
        message: "Order created successfully",
        order: razorpayOrder,
      });
    } catch (error) {
      console.error("Order creation failed:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating order",
        error: error.message,
      });
    }
  },
  applyCoupon: async (req, res) => {
    try {
      const userId = req.user?.id;
      const { coupon_code, course_id, coupon_for, remove } = req.body;

      if (!course_id) {
        return res.status(400).json({
          status: false,
          msg: "course_id are required",
        });
      }

      // Fetch coupon
      const [coupons] = await pool
        .promise()
        .query("SELECT * FROM coupons WHERE coupon_code = ?", [coupon_code]);
      if (coupons.length === 0) {
        return res.status(404).json({ status: false, msg: "Coupon not found" });
      }
      const coupon = coupons[0];
      console.log("coupon Data");
      console.log(coupon);
      // Validate coupon applicability
      let course;
      console.log(coupon_for);
      if (coupon_for === "test") {
        if (coupon.coupon_for === "course") {
          return res.json({
            status: false,
            msg: "This Coupon not applicable for Test",
          });
        }
        const [tests] = await pool
          .promise()
          .query("SELECT * FROM test_series WHERE id = ?", [course_id]);
        if (tests.length === 0) {
          return res
            .status(404)
            .json({ status: false, msg: "Live test not found" });
        }
        course = tests[0];
      } else {
        // if (coupon.coupon_for === "test") {
        //   return res.json({
        //     status: false,
        //     msg: "This Coupon not applicable for Course",
        //   });
        // }
        const [courses] = await pool
          .promise()
          .query("SELECT * FROM courses WHERE id = ?", [course_id]);
        if (courses.length === 0) {
          return res
            .status(404)
            .json({ status: false, msg: "Course not found" });
        }
        course = courses[0];
      }

      // Convert offer_price to number safely
      const totalAmount = Number(course.offer_price);

      if (isNaN(totalAmount) || totalAmount <= 0) {
        return res.json({ status: false, msg: "Invalid course price" });
      }

      const gstPercentage = 18;

      if (remove == 1) {
        await pool
          .promise()
          .query(
            "DELETE FROM coupon_applied WHERE coupon_id = ? AND user_id = ?",
            [coupon.id, userId]
          );
        const gstAmount = Math.round((totalAmount * gstPercentage) / 100);

        return res.json({
          status: true,
          real_amount: totalAmount,
          coupon_code: "",
          discount_amount: 0,
          total_amount_before_gst: totalAmount,
          gst_per: gstPercentage,
          gst_amount: gstAmount,
          total_amount: totalAmount + gstAmount,
          message: "Coupon removed successfully",
        });
      }

      // Validate minimum cart value (ensure cart_value is number)
      if (totalAmount < Number(coupon.cart_value)) {
        return res.json({
          status: false,
          msg: `Minimum cart value is ${coupon.cart_value}`,
        });
      }

      // Validate expiry date
      const today = new Date().toISOString().slice(0, 10);
      if (coupon.end_date < today) {
        return res.json({ status: false, msg: "Coupon expired" });
      }

      // Calculate discount amount
      const discountAmount = ApiController.calculateDiscount(
        coupon,
        totalAmount
      );

      if (discountAmount < 0) {
        return res.json({
          status: false,
          msg: "Total price must be greater than the discount",
        });
      }

      if (discountAmount > totalAmount) {
        return res.json({
          status: false,
          msg: "Discount cannot be greater than the total amount",
        });
      }

      // Check coupon usage limit per user per course
      if (userId) {
        const [[couponUseCount]] = await pool
          .promise()
          .query(
            "SELECT COUNT(*) as count FROM coupon_applied WHERE coupon_id = ? AND user_id = ? AND course_id = ?",
            [coupon.id, userId, course_id]
          );

        if (couponUseCount.count >= coupon.coupon_uses) {
          return res.json({ status: false, msg: "Coupon Limit Exceeded" });
        }
      }

      // Calculate final amounts safely

      const finalAmount = totalAmount - discountAmount;
      const gstAmount = Math.round((finalAmount * gstPercentage) / 100);
      const finalAmountWithGST = finalAmount + gstAmount;

      // Insert coupon usage record
      await pool
        .promise()
        .query(
          "INSERT INTO coupon_applied (coupon_id, user_id, course_id) VALUES (?, ?, ?)",
          [coupon.id, userId, course_id]
        );

      return res.json({
        status: true,
        real_amount: totalAmount,
        coupon_code,
        discount_amount: discountAmount,
        total_amount_before_gst: finalAmount,
        gst_per: gstPercentage,
        gst_amount: gstAmount,
        total_amount: finalAmountWithGST,
        message: "Coupon applied successfully",
      });
    } catch (error) {
      console.error("Error applying coupon:", error);
      return res.status(500).json({
        status: false,
        msg: "Error applying coupon",
        error: error.message,
      });
    }
  },

  calculateDiscount: (coupon, totalAmount) => {
    console.log(coupon);
    const discountValue = Number(coupon.coupon_discount);
    if (coupon.discount_type === "percentage") {
      return (totalAmount * discountValue) / 100;
    }
    return discountValue; // fixed amount
  },

  // function calculateDiscount(coupon, amount) {
  //   if (coupon.coupon_type === 'percentage') {
  //     return (coupon.coupon_discount / 100) * amount;
  //   } else if (coupon.coupon_type === 'fixed') {
  //     return coupon.coupon_discount;
  //   }
  //   return 0;
  // }

  buyCourse: async (req, res) => {
    const schema = Joi.object({
      course_id: Joi.number().required(),
      transaction_id: Joi.string().optional(),
      payment_type: Joi.string().optional(),
      payment_status: Joi.string().optional(),
      order_type: Joi.string().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const user_id = req.user?.id;
    const order_type = req.body.order_type;

    try {
      const promisePool = pool.promise();

      const [existingOrders] = await promisePool.query(
        `SELECT * FROM course_orders WHERE user_id = ? AND course_id = ? AND course_expired_date >= CURDATE() LIMIT 1`,
        [user_id, value.course_id]
      );

      console.log(existingOrders);
      if (existingOrders.length > 0) {
        return res.json({
          success: false,
          message: "You already have access to this course or test series.",
        });
      }

      let courses;

      if (order_type == "test") {
        const [rows] = await promisePool.query(
          `SELECT * FROM test_series WHERE id = ? LIMIT 1`,
          [value.course_id]
        );
        courses = rows;
      } else {
        const [rows] = await promisePool.query(
          `SELECT * FROM courses WHERE id = ? LIMIT 1`,
          [value.course_id]
        );
        courses = rows;
      }

      if (courses.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found.",
        });
      }

      const course = courses[0];
      const courseDuration = course.duration || 12;
      const courseExpiredDate = moment()
        .add(courseDuration, "months")
        .format("YYYY-MM-DD");

      const courseAmount = course.offer_price;
      let discountAmount = 0;
      let couponDiscount = "";
      let discountType = "";

      if (value.coupon_code) {
        const [coupons] = await promisePool.query(
          `SELECT * FROM coupons WHERE coupon_code = ? LIMIT 1`,
          [value.coupon_code]
        );

        if (coupons.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid coupon code.",
          });
        }

        const coupon = coupons[0];
        couponDiscount = coupon.coupon_discount;
        discountType = coupon.coupon_type;

        discountAmount = ApiController.calculateDiscount(coupon, courseAmount);
        //console.log(discountAmount);
      }

      const amountBeforeGST = Math.round(courseAmount - discountAmount);
      const gstPercentage = 18;
      const gstAmount = Math.round((amountBeforeGST * gstPercentage) / 100);
      const totalAmountWithGST = amountBeforeGST + gstAmount;
      const [result] = await promisePool.query(
        `INSERT INTO course_orders (
    user_id, course_id, course_name, course_expired_date, course_amount,
    transaction_id, payment_type, payment_status, coupon_code, coupon_discount,
    discount_type, discount_amount, total_amount_before_gst, gst_per, gst_amount,
    total_amount, order_status, order_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          value.course_id,
          course.course_name,
          courseExpiredDate,
          courseAmount,
          value.transaction_id || null,
          value.payment_type || null,
          value.payment_status || null,
          value.coupon_code || "",
          couponDiscount,
          discountType,
          discountAmount,
          amountBeforeGST,
          gstPercentage,
          gstAmount,
          totalAmountWithGST,
          "complete",
          order_type,
        ]
      );

      if (result.affectedRows === 1) {
        const [orders] = await promisePool.query(
          `SELECT * FROM course_orders WHERE id = ? LIMIT 1`,
          [result.insertId]
        );

        return res.json({
          success: true,
          message: "Order Placed Successfully",
          data: orders[0],
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to place the order. Please try again.",
        });
      }
    } catch (err) {
      console.error("Buy course error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
        error: err.message,
        details: err.stack?.split("\n")[1]?.trim(),
      });
    }
  },

  aboutUs: async (req, res) => {
    try {
      //const [aboutRows] = await pool.execute('SELECT * FROM cms WHERE slug = ?', ['about-us']);

      const [aboutRows] = await pool
        .promise()
        .execute("SELECT * FROM cms WHERE slug = ?", ["about-us"]);

      const [teacherRows] = await Helper.getActiveFaculties(); // must return [rows, fields]
      const [testimonialRows] = await Helper.getTestimonials(); // must return [rows, fields]

      res.json({
        success: true,
        message: "About Us data fetched successfully",
        data: {
          aboutUs: aboutRows[0] || {},
          teachers: teacherRows,
          testimonials: testimonialRows,
        },
      });
    } catch (error) {
      console.error("Error fetching About Us data:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  testSeriesList: async (req, res) => {
    try {
      const testSeries = await Helper.getActiveTestSeries();

      if (testSeries.length === 0) {
        return Helper.sendSuccess(res, "No test series available.", []);
      }

      return Helper.sendSuccess(
        res,
        "Test series fetched successfully.",
        testSeries
      );
    } catch (error) {
      console.error("Error fetching test series:", error);
      return Helper.sendError(res, "Internal server error", error);
    }
  },
  testSeriesDetails: async (req, res) => {
    try {
      const slug = req.body.slug;

      if (!slug || typeof slug !== "string" || slug.trim() === "") {
        return sendError(
          res,
          "Slug parameter is required and must be a non-empty string.",
          null,
          400
        );
      }

      const testSeries = await Helper.getTestSeriesBySlug(slug.trim());

      if (!testSeries) {
        return sendSuccess(res, "Test series not found.", {});
      }

      return sendSuccess(
        res,
        "Test series details fetched successfully.",
        testSeries
      );
    } catch (error) {
      console.error("Error fetching test series detail:", error);
      return sendError(res, "Internal server error", error);
    }
  },
};

module.exports = ApiController;
