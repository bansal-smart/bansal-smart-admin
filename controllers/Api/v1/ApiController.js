// Dependencies
const pool = require("../../../db/database");
const randomstring = require("randomstring");
const { sendSuccess, sendError } = require("../../../helpers/Helper");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const dayjs = require("dayjs");
const Joi = require("joi");
const path = require("path");
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

        const test_series = await Helper.getTestSeriesByCategoryId(
          category.id,
          [
            "id",
            "name",
            "title_heading",
            "slug",
            "price",
            "discount",
            "offer_price",
            "image",
          ]
        );
        category.test_series = test_series;
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

      const topBanner = await Helper.getBanners(
        ["id", "title", "banner", "banner_link", "banner_type", "position"],
        {
          position: "top",
        }
      );

      const bottomBanner = await Helper.getBanners(
        ["id", "title", "banner", "banner_link", "banner_type", "position"],
        {
          position: "bottom",
        }
      );

      const testSeries = await Helper.getActiveTestSeries();

      // Prepare response data
      const data = {
        categories,
        servicableCities,
        testimonials,
        faqs,
        banners,
        testSeries,
        topBanner,
        bottomBanner,
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
          "category_id",
          "title_heading",
          "slug",
          "course_type",
          "mode_of_class",
          "discount_type",
          "discount",
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

  courseListForApp: async (req, res) => {
    try {
      const category_id = req.body.category_id;

      let courses = [];

      courses = await Helper.getCoursesByCategoryId(category_id, [
        "id",
        "course_name",
        "category_id",
        "title_heading",
        "slug",
        "course_type",
        "mode_of_class",
        "discount_type",
        "discount",
        "price",
        "offer_price",
        "image",
      ]);

      res.status(200).json({
        success: true,
        message: "Course List",
        base_url: BASE_URL,
        public_path: PUBLIC_PATH,
        path: req.originalUrl,
        NO_IMAGE_URL: NO_IMAGE_URL,
        data: courses,
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
        testimonials: testimonialRows,
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

      // if (!data || data.length === 0) {
      //   return Helper.sendSuccess(
      //     res,
      //     "No coupons found for this type",
      //     "No coupons available for type: " + type,
      //     404
      //   );
      // }

      return Helper.sendSuccess(res, "Coupons retrieved successfully", data);
    } catch (err) {
      //  return Helper.sendError(res, "Error fetching coupons", err, 500);
    }
  },
  createOrder: async (req, res) => {
    try {
      // Initialize Razorpay instance
      const razorpay = new Razorpay({
        // key_id: "rzp_test_Ql00vist0zmjZS", // Replace with your actual key
        // key_secret: "SwVDx8S9H52gW9Ex8x2k80CE", // Replace with your actual secret

     key_id: "rzp_live_x3idBzuRAkpem1", // Replace with your actual key
      key_secret: "BgSiTJm49mMHmCqRaZrnVLT8", // Replace with your actual secret

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
            .json({ status: false, msg: "Live test not found 600" });
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
          real_amount: Math.round(totalAmount),
          coupon_code: "",
          discount_amount: 0,
          total_amount_before_gst: Math.round(totalAmount),
          gst_per: gstPercentage,
          gst_amount: Math.round(gstAmount),
          total_amount: Math.round(totalAmount + gstAmount),
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
        real_amount: Math.round(totalAmount),
        coupon_code,
        discount_amount: Math.round(discountAmount),
        total_amount_before_gst: Math.round(finalAmount),
        gst_per: gstPercentage,
        gst_amount: Math.round(gstAmount),
        total_amount: Math.round(finalAmountWithGST),
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
    if (coupon.coupon_type === "percentage") {
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
    const {
      course_id,
      transaction_id = null,
      payment_type = null,
      payment_status = "complete",
      coupon_code = "",
    } = req.body;

    const user_id = req.user?.id;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required.",
      });
    }

    try {
      const promisePool = pool.promise();

      // Auto-detect order_type by checking if course exists
      let order_type = req.body.order_type;
      if (req.body.order_type == null) {
        order_type = "course";
      }
      let course;
      if (order_type === "test") {
        const [rows] = await promisePool.query(
          `SELECT * FROM test_series WHERE id = ? LIMIT 1`,
          [course_id]
        );
        course = rows[0];
      } else {
        const [rows] = await promisePool.query(
          `SELECT * FROM courses WHERE id = ? LIMIT 1`,
          [course_id]
        );
        course = rows[0];
      }

      const course_name =
        order_type === "test" ? course.name : course.course_name;
      const courseDuration = course.duration || 12;
      const courseExpiredDate = moment()
        .add(courseDuration, "months")
        .format("YYYY-MM-DD");

      const courseAmount = course.offer_price;
      let discountAmount = 0;
      let couponDiscount = "";
      let discountType = "";

      if (coupon_code) {
        const [coupons] = await promisePool.query(
          `SELECT * FROM coupons WHERE coupon_code = ? LIMIT 1`,
          [coupon_code]
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
      }

      const orderId =
        "ORD-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const amountBeforeGST = Math.round(courseAmount - discountAmount);
      const gstPercentage = 18;
      const gstAmount = Math.round((amountBeforeGST * gstPercentage) / 100);
      const totalAmountWithGST = amountBeforeGST + gstAmount;

      const [result] = await promisePool.query(
        `INSERT INTO course_orders (
        user_id, course_id, course_name, course_expired_date, course_amount,
        transaction_id, payment_type, payment_status, coupon_code, coupon_discount,
        discount_type, discount_amount, total_amount_before_gst, gst_per, gst_amount,
        total_amount, order_status, order_type, order_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          course_id,
          course_name,
          courseExpiredDate,
          courseAmount,
          transaction_id,
          payment_type,
          payment_status,
          coupon_code,
          couponDiscount,
          discountType,
          discountAmount,
          amountBeforeGST,
          gstPercentage,
          gstAmount,
          totalAmountWithGST,
          "complete",
          order_type,
          orderId,
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

  
  buyLiveTest: async (req, res) => {
  const {
    test_id,
    transaction_id = null,
    payment_type = null,
    payment_status = "complete",
    coupon_code = "",
  } = req.body;

  console.log(req.body);
  const user_id = req.user?.id;

  try {
    const promisePool = pool.promise();

    const [rows] = await promisePool.query(
      `SELECT * FROM live_test WHERE id = ? LIMIT 1`,
      [test_id]
    );


    
    const live_test = rows[0];

    if (!live_test) {
      return res.status(404).json({
        success: false,
        live_test:live_test,
        message: "Live test not found 919.",
      });
    }

    const live_test_name = live_test.test_name;
    const courseDuration = live_test.duration || 12;
    const courseExpiredDate = moment()
      .add(courseDuration, "months")
      .format("YYYY-MM-DD");

    const courseAmount = live_test.offer_price;
    let discountAmount = 0;
    let couponDiscount = "";
    let discountType = "";

    if (coupon_code) {
      const [coupons] = await promisePool.query(
        `SELECT * FROM coupons WHERE coupon_code = ? LIMIT 1`,
        [coupon_code]
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
    }

    const orderId =
      "ORD-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const amountBeforeGST = Math.round(courseAmount - discountAmount);
    const gstPercentage = 18;
    const gstAmount = Math.round((amountBeforeGST * gstPercentage) / 100);
    const totalAmountWithGST = amountBeforeGST + gstAmount;

    const order_type = "live_test";

    const [result] = await promisePool.query(
      `INSERT INTO live_test_orders (
        user_id, test_id, test_name, test_expired_date, test_amount,
        transaction_id, payment_type, payment_status, coupon_code, coupon_discount,
        discount_type, discount_amount, total_amount_before_gst, gst_per, gst_amount,
        total_amount, order_status,  order_id, order_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`,
      [
        user_id,
        test_id,
        live_test_name,
        courseExpiredDate,
        courseAmount,
        transaction_id,
        payment_type,
        payment_status,
        coupon_code,
        couponDiscount,
        discountType,
        discountAmount,
        amountBeforeGST,
        gstPercentage,
        gstAmount,
        totalAmountWithGST,
        "complete",
  order_type,
        orderId,
      ]
    );

    if (result.affectedRows === 1) {
      const [orders] = await promisePool.query(
        `SELECT * FROM live_test_orders WHERE id = ? LIMIT 1`,
        [result.insertId]
      );

      return res.json({
        success: true,
        message: "Live Test Order Placed Successfully",
        data: orders[0],
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to place the order. Please try again.",
      });
    }
  } catch (err) {
    console.error("Buy live test error:", err);
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

testSeriesWithCategoryList: async (req, res) => {
  try {
    // Step 1: Get all active categories
    const categories = await Helper.getActiveCategoriesByType("course", [
      "id",
      "category_name",
      "image",
      "slug",
    ]);

    // Step 2: Populate courses and test series for each category in parallel
    const populatedCategories = await Promise.all(
      categories.map(async (category) => {
        const [test_series] = await Promise.all([
          Helper.getTestSeriesByCategoryId(category.id, [
            "id",
            "name",
            "title_heading",
            "slug",
            "price",
            "discount",
            "offer_price",
            "image",
          ]),
        ]);

        return {
          ...category,
         
          test_series,
        };
      })
    );



    // Step 4: Respond with all compiled data
    return res.json({
      success: true,
      message: "Test series and courses by category fetched successfully",
      categories: populatedCategories,
     
    });

  } catch (error) {
    console.error("Error in testSeriesWithCategoryList:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching data",
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

      const trimmedSlug = slug.trim();
      const data = await Helper.getTestSeriesBySlug(trimmedSlug);

      if (!data) {
        return sendSuccess(res, "Test series not found.", {});
      }

      const otherTestSeries = await Helper.getOtherActiveTestSeries(
        trimmedSlug
      );
      data.otherTestSeries = otherTestSeries;
      return sendSuccess(res, "Test series details fetched successfully.", {
        data,
      });

      // const sendSuccess = (res, message, data = [], statusCode = 200) => {
      //   return res.status(statusCode).json({
      //     success: true,
      //     message,
      //     base_url: BASE_URL,
      //     public_path: PUBLIC_PATH,
      //     data,
      //     otherTestSeries,
      //   });
      // };
    } catch (error) {
      console.error("Error fetching test series detail:", error);
      return sendError(res, "Internal server error", error);
    }
  },

  liveTestListing: async (req, res) => {
  try {
    // Step 1: Get all active categories
    const categories = await Helper.getActiveCategoriesByType("course", [
      "id",
      "category_name",
      "image",
      "slug",
    ]);

    // Step 2: Populate live test for each category
    const populatedCategories = await Promise.all(
      categories.map(async (category) => {
        const live_test = await Helper.getLiveTestByCategoryId(category.id);

        return {
          ...category,
          live_test, // attach live tests to the category
        };
      })
    );

    // Step 3: Send the response
    return res.json({
      success: true,
      message: "Live test series by category fetched successfully",
      categories: populatedCategories,
    });

  } catch (error) {
    console.error("Error in liveTestListing:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching live test data",
    });
  }
},




  liveTestDetails: async (req, res) => {
    try {
      const slug = req.body.test_id;


      
      const data= await Helper.getLiveTestDetails(slug);

      // return sendSuccess(res, "Test series details fetched successfully.", {
      //   data,
      // });

      return res.json({
        success: true,
        message: "LiveTest Details.",
        data: data,
      });

      // const sendSuccess = (res, message, data = [], statusCode = 200) => {
      //   return res.status(statusCode).json({
      //     success: true,
      //     message,
      //     base_url: BASE_URL,
      //     public_path: PUBLIC_PATH,
      //     data,
      //     otherTestSeries,
      //   });
      // };
    } catch (error) {
      console.error("Error fetching test series detail:", error);
      return sendError(res, "Internal server error", error);
    }
  },
  blogList: async (req, res) => {
    try {
      const blogs = await Helper.getBlogs(); // Fetch all blogs
      return sendSuccess(res, "Blogs retrieved successfully.", blogs);
    } catch (err) {
      return Helper.sendError(res, "Error fetching blogs", err, 500);
    }
  },
  blogDetails: async (req, res) => {
    try {
      const slug = req.body.slug;
      const data = await Helper.getBlogDetails(slug);

      if (!data) {
        return Helper.sendError(res, "Blog not found", null, 404);
      }

      return sendSuccess(res, "Blog details retrieved successfully", data);
    } catch (err) {
      return Helper.sendError(res, "Error fetching blog details", err, 500);
    }
  },
  myOrder: async (req, res) => {
    const userId = req.session.userId || req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    try {
      const [orders] = await pool.promise().query(
        `
      SELECT co.*, c.course_name, c.image AS course_image
      FROM course_orders co
      JOIN courses c ON co.course_id = c.id
      WHERE co.user_id = ?
      ORDER BY co.created_at DESC
    `,
        [userId]
      );

      const baseImageUrl = `${req.protocol}://${req.get("host")}/admin/public`;

      const formatDate = (raw) =>
        raw
          ? new Date(raw).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : null;

      const formattedOrders = orders.map((order) => {
        let imageUrl = null;
        if (order.course_image) {
          let p = order.course_image.replace(/\\/g, "/");
          if (!p.startsWith("/")) p = "/" + p;
          if (!p.startsWith("/uploads")) p = "/uploads/" + p;
          imageUrl = baseImageUrl + p;
        }

        return {
          ...order,
          course_image: imageUrl,
          purchase_date: formatDate(order.created_at),
          expired_date: formatDate(order.course_expired_date),
        };
      });

      return res.json({
        success: true,
        message: "My orders with subjects fetched successfully.",
        orders: formattedOrders,
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching orders.",
      });
    }
  },
  myProfile: async (req, res) => {
    const userId = req.session.userId || req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    try {
      const [users] = await pool.promise().query(
        `
      SELECT 
        fu.*,
        c.category_name,
        cl.name as class_name,
        ce.name as center_name
      FROM front_users fu
      LEFT JOIN categories c ON fu.category_id = c.id
      LEFT JOIN course_classes cl ON fu.class_id = cl.id
      LEFT JOIN centers ce ON fu.center_id = ce.id
      WHERE fu.id = ? 
      LIMIT 1
      `,
        [userId]
      );

      if (users.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const user = users[0];

      // Format registration date
      const formatDate = (raw) =>
        raw
          ? new Date(raw).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : null;

      // Build full profile image URL
      let profileImageUrl = null;
      if (user.profile_image) {
        const baseUrl = `${req.protocol}://${req.get("host")}/admin/public`;
        let cleanPath = user.profile_image.replace(/\\/g, "/");
        if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;
        if (!cleanPath.startsWith("/uploads"))
          cleanPath = "/uploads" + cleanPath;
        profileImageUrl = baseUrl + cleanPath;
      }

      return res.json({
        success: true,
        message: "User profile fetched successfully",
        user: {
          ...user,
          profile_image: profileImageUrl,
          registration_date: formatDate(user.created_at),
        },
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching user profile.",
      });
    }
  },

  updateProfile: async (req, res) => {
    const userId = req.session.userId || req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    const { name, city, category_id, class_id, registration_type, center_id } =
      req.body;

    try {
      // Update user data
      const [result] = await pool.promise().query(
        `UPDATE front_users SET
          name = ?,
          city = ?,
          category_id = ?,
          class_id = ?,
          registration_type = ?,
          center_id = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          name,
          city,
          category_id,
          class_id,
          registration_type,
          center_id,
          userId,
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found or no changes made",
        });
      }

      return res.json({
        success: true,
        message: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while updating profile.",
      });
    }
  },

  updateProfileImage: async (req, res) => {
  const userId = req.session.userId || req.user?.id;
    console.log(userId); 
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized user",
    });
  }

  if (!req.file || !req.file.filename) {
    return res.status(422).json({
      success: false,
      message: "Profile picture is required",
    });
  }

  const fileName = req.file.filename;
  const filePath = `/uploads/users/${fileName}`;

  try {
    const [result] = await pool.promise().query(
      `UPDATE front_users SET profile_pic = ?, updated_at = NOW() WHERE id = ?`,
      [filePath, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found or no changes made",
      });
    }

    const fullImageUrl = `${req.protocol}://${req.get("host")}/admin/public${filePath}`;

    return res.json({
      success: true,
      message: "Profile picture updated successfully",
      profile_pic: fullImageUrl, // Return full URL
      user:req.user,
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating profile picture.",
    });
  }
},


  myCourse: async (req, res) => {
    const userId = req.session.userId || req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    try {
      const [orders] = await pool.promise().query(
        `
      SELECT co.*, c.course_name, c.image AS course_image
      FROM course_orders co
      JOIN courses c ON co.course_id = c.id
      WHERE co.user_id = ? AND co.order_type = "course"
      ORDER BY co.created_at DESC
      `,
        [userId]
      );

      const baseImageUrl = `${req.protocol}://${req.get("host")}/admin/public`;

      const formatDate = (raw) =>
        raw
          ? new Date(raw).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : null;

      const [allSubjects] = await pool
        .promise()
        .query(
          `SELECT * FROM course_subjects WHERE status = 1 AND deleted_at IS NULL`
        );

      const [allLiveTests] = await pool.promise().query(`
      SELECT * FROM live_test 
      WHERE status = 1 AND deleted_at IS NULL
    `);
      const formattedOrders = orders.map((order) => {
        let imageUrl = null;
        if (order.course_image) {
          let p = order.course_image.replace(/\\/g, "/");
          if (!p.startsWith("/")) p = "/" + p;
          if (!p.startsWith("/uploads")) p = "/uploads" + p;
          imageUrl = baseImageUrl + p;
        }

        const relatedSubjects = allSubjects.filter(
          (s) => s.course_id == order.course_id
        );

        const relatedLiveTests = allLiveTests.filter(
          (t) => t.course_id == order.course_id
        );

        return {
          ...order,
          course_image: imageUrl,
          subjects: relatedSubjects,
          live_test: relatedLiveTests,
          purchase_date: formatDate(order.created_at),
          expired_date: formatDate(order.course_expired_date),
        };
      });

      return res.json({
        success: true,
        message: "My Course orders",
        orders: formattedOrders,
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching orders.",
      });
    }
  },

  getStudyMaterialsBySubject: async (req, res) => {
    const { subject_id } = req.body;

    if (!subject_id) {
      return res
        .status(400)
        .json({ success: false, message: "subject_id is required" });
    }

    try {
      // Fetch PDFs

      const [subjectDetails] = await pool.promise().query(
        `SELECT cs.*, co.course_name
   FROM course_subjects cs
   LEFT JOIN courses co ON cs.course_id = co.id
   WHERE cs.id = ?`,
        [subject_id]
      );
      const [pdfs] = await pool.promise().query(
        `
      SELECT *
      FROM course_pdf
      WHERE status = 1 AND deleted_at IS NULL AND subject_id = ?
      ORDER BY id DESC
      `,
        [subject_id]
      );

      // Fetch Videos
      const [videos] = await pool.promise().query(
        `
      SELECT *
      FROM course_video
      WHERE status = 1 AND deleted_at IS NULL AND subject_id = ? 
      ORDER BY id DESC
      `,
        [subject_id]
      );

      // Count PDFs
      const [pdfCountResult] = await pool.promise().query(
        `
      SELECT COUNT(*) AS count
      FROM course_pdf
      WHERE status = 1 AND deleted_at IS NULL AND subject_id = ?
      `,
        [subject_id]
      );

      // Count Videos
      const [videoCountResult] = await pool.promise().query(
        `
      SELECT COUNT(*) AS count
      FROM course_video
      WHERE status = 1 AND deleted_at IS NULL AND subject_id = ?
      `,
        [subject_id]
      );

      const baseUrl = `${req.protocol}://${req.get("host")}/admin/public`;

      return res.json({
        success: true,
        message: "Study materials fetched successfully",
        subjectDetails,
        course_pdf_count: pdfCountResult[0].count,
        course_video_count: videoCountResult[0].count,
        course_pdf: pdfs,
        course_video: videos,
      });
    } catch (error) {
      console.error("Error fetching study materials:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching study materials.",
      });
    }
  },

  myTestSeries: async (req, res) => {
    const userId = req.session.userId || req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    try {
      // Fetch user's test series orders
      const [orders] = await pool.promise().query(
        `
      SELECT co.*, ts.name AS series_name, ts.image AS series_image
      FROM course_orders co
      JOIN test_series ts ON co.course_id = ts.id
      WHERE co.user_id = ? AND co.order_type = "test"
      ORDER BY co.created_at DESC
      `,
        [userId]
      );

      // Base URL for images
      const baseImageUrl = `${req.protocol}://${req.get("host")}/admin/public`;

      // Fetch all active exam_list entries
      const [examListData] = await pool
        .promise()
        .query(
          `SELECT * FROM live_test WHERE status = 1 AND deleted_at IS NULL`
        );

      // Function to format date as "23 Aug 2025"
      const formatDate = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      };

      // Map orders and attach exams and readable dates
      const formattedOrders = orders.map((order) => {
        // Format image path
        let imageUrl = null;
        if (order.series_image) {
          let cleanImagePath = order.series_image.replace(/\\/g, "/");
          if (!cleanImagePath.startsWith("/"))
            cleanImagePath = "/" + cleanImagePath;
          if (!cleanImagePath.startsWith("/uploads"))
            cleanImagePath = "/uploads" + cleanImagePath;
          imageUrl = baseImageUrl + cleanImagePath;
        }

        // Filter exams related to test_series_id
        const relatedExams = examListData.filter(
          (exam) => exam.test_series_id == order.course_id
        );

        return {
          ...order,
          series_image: imageUrl,
          exams: relatedExams,
          purchase_date: formatDate(order.created_at),
          expired_date: formatDate(order.course_expired_date),
        };
      });

      return res.json({
        success: true,
        message: "My Test Series orders",
        orders: formattedOrders,
      });
    } catch (error) {
      console.error("Error fetching test series orders:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching test series orders.",
      });
    }
  },

  // examList: async (req, res) => {
  //   const { test_series_id, user_id } = req.body;

  //   if (!test_series_id) {
  //     return res.status(400).json({
  //       success: false,
  //       message: "test_series_id is required",
  //     });
  //   }

  //   try {
  //     const baseImageUrl = `${req.protocol}://${req.get("host")}/admin/public`;

  //     // 1. Fetch test series details
  //     const [testSeriesRows] = await pool
  //       .promise()
  //       .query(
  //         `SELECT id, name FROM test_series WHERE id = ?`,
  //         [test_series_id]
  //       );

  //     if (testSeriesRows.length === 0) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Test series not found",
  //       });
  //     }

  //     // Optional: format the image URL
  //     const testSeriesDetails = {
  //       ...testSeriesRows[0],

  //     };

  //     // 2. Fetch exams by test_series_id
  //     const [exams] = await pool
  //       .promise()
  //       .query(
  //         `SELECT id, test_series_id, test_name, test_type, marks, test_pattern, test_location, duration_test, start_date_time, end_date_time, result_date
  //          FROM live_test
  //          WHERE status = 1 AND deleted_at IS NULL AND test_series_id = ?`,
  //         [test_series_id]
  //       );

  //     // 3. Fetch attempted tests by user
  //     const [attemptedRows] = await pool
  //       .promise()
  //       .query(
  //         `SELECT test_id FROM live_test_result WHERE frontuser_id = ?`,
  //         [user_id]
  //       );

  //     const attemptedTestIds = new Set(attemptedRows.map(row => row.test_id));

  //     const now = new Date();

  //     // 4. Format exams
  //     const formattedExams = exams.map((exam) => {
  //       const startTime = new Date(exam.start_date_time);
  //       const endTime = new Date(exam.end_date_time);
  //       const resultTime = exam.result_date ? new Date(exam.result_date) : null;

  //       return {
  //         ...exam,
  //         is_start: now >= startTime && now <= endTime,
  //         is_completed: now > endTime,
  //         is_expired: now > endTime,
  //         is_result: resultTime ? now >= resultTime : false,
  //         is_attempted: attemptedTestIds.has(exam.id),
  //         is_open: now >= startTime && now <= endTime,
  //         is_close: now > endTime,
  //       };
  //     });

  //     // 5. Send response with both test series details and exams
  //     return res.json({
  //       success: true,
  //       message: "Test series details and exams fetched successfully",
  //       data: testSeriesDetails,
  //       exams: formattedExams,
  //     });
  //   } catch (error) {
  //     console.error("Error fetching exams:", error);
  //     return res.status(500).json({
  //       success: false,
  //       message: "Server error while fetching exams",
  //     });
  //   }
  // },
  examList: async (req, res) => {
    const { test_series_id, user_id } = req.body;

    // if (!test_series_id) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "test_series_id is required",
    //   });
    // }

    try {
      const baseImageUrl = `${req.protocol}://${req.get("host")}/admin/public`;

      // 1. Fetch test series details
      const [testSeriesRows] = await pool
        .promise()
        .query(`SELECT id, name FROM test_series WHERE id = ?`, [
          test_series_id,
        ]);

      if (testSeriesRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Test series not found",
        });
      }

      // Optional: format the image URL
      const testSeriesDetails = {
        ...testSeriesRows[0],
      };

      // 2. Fetch exams by test_series_id
      const [exams] = await pool.promise().query(
        `SELECT id, test_series_id, test_name, test_type, marks, test_pattern, test_location, duration_test, start_date_time, end_date_time, result_date 
         FROM live_test 
         WHERE status = 1 AND deleted_at IS NULL AND test_series_id = ?`,
        [test_series_id]
      );

      // Get all exam IDs
      const examIds = exams.map((exam) => exam.id);

      // 3. Fetch question counts for all exams
      let questionCounts = {};
      if (examIds.length > 0) {
        const [questionCountRows] = await pool.promise().query(
          `SELECT test_id, COUNT(*) as no_of_questions 
         FROM live_test_questions 
         WHERE test_id IN (?) 
         GROUP BY test_id`,
          [examIds]
        );

        questionCounts = questionCountRows.reduce((acc, row) => {
          acc[row.test_id] = row.no_of_questions;
          return acc;
        }, {});
      }

      // 4. Fetch attempted tests by user
      const [attemptedRows] = await pool
        .promise()
        .query(`SELECT test_id FROM live_test_result WHERE frontuser_id = ?`, [
          user_id,
        ]);

      const attemptedTestIds = new Set(attemptedRows.map((row) => row.test_id));

      const now = new Date();

      // 5. Format exams with question counts and other flags
      const formattedExams = exams.map((exam) => {
        const startTime = new Date(exam.start_date_time);
        const endTime = new Date(exam.end_date_time);
        const resultTime = exam.result_date ? new Date(exam.result_date) : null;

        return {
          ...exam,
          start_date_time: dayjs(exam.start_date_time).format(
            "DD MMM YYYY, hh:mm A"
          ),
          end_date_time: dayjs(exam.end_date_time).format(
            "DD MMM YYYY, hh:mm A"
          ),
          result_date: exam.result_date
            ? dayjs(exam.result_date).format("DD MMM YYYY, hh:mm A")
            : null,
          no_of_question: questionCounts[exam.id] || 0,
          is_start: now >= startTime && now <= endTime,
          is_completed: now > endTime,
          is_expired: now > endTime,
          is_result: resultTime ? now >= resultTime : false,
          is_attempted: attemptedTestIds.has(exam.id),
          is_open: now >= startTime && now <= endTime,
          is_close: now > endTime,
          is_close1: now > endTime,
        };
      });

      // 6. Send response with both test series details and exams
      return res.json({
        success: true,
        message: "Test series details and exams fetched successfullysss",
        data: testSeriesDetails,
        exams: formattedExams,
      });
    } catch (error) {
      console.error("Error fetching exams:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching exams",
      });
    }
  },

  courseExamList: async (req, res) => {
    const { course_id } = req.body;
    const user_id = req.user.id;

    try {
      // 1. Fetch test series details
      const [course] = await pool
        .promise()
        .query(`SELECT id, course_name FROM courses WHERE id = ?`, [course_id]);

      if (course.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course found",
        });
      }

      // Optional: format the image URL
      const testSeriesDetails = {
        ...course[0],
      };

      // 2. Fetch exams by test_series_id
      const [exams] = await pool.promise().query(
        `SELECT id, course_id, test_name, test_type, marks, test_pattern, test_location, duration_test, start_date_time, end_date_time, result_date 
         FROM live_test 
         WHERE status = 1 AND test_location = 'course' AND deleted_at IS NULL AND course_id = ?`,
        [course_id]
      );

      // Get all exam IDs
      const examIds = exams.map((exam) => exam.id);

      // 3. Fetch question counts for all exams
      let questionCounts = {};
      if (examIds.length > 0) {
        const [questionCountRows] = await pool.promise().query(
          `SELECT test_id, COUNT(*) as no_of_questions 
         FROM live_test_questions 
         WHERE test_id IN (?) 
         GROUP BY test_id`,
          [examIds]
        );

        questionCounts = questionCountRows.reduce((acc, row) => {
          acc[row.test_id] = row.no_of_questions;
          return acc;
        }, {});
      }

      // 4. Fetch attempted tests by user
      const [attemptedRows] = await pool
        .promise()
        .query(`SELECT test_id FROM live_test_result WHERE frontuser_id = ?`, [
          user_id,
        ]);

      const attemptedTestIds = new Set(attemptedRows.map((row) => row.test_id));

      const now = new Date();

      const formattedExams = exams.map((exam) => {
        const startTime = new Date(exam.start_date_time);
        const endTime = new Date(exam.end_date_time);
        const resultTime = exam.result_date ? new Date(exam.result_date) : null;

        return {
          ...exam,
          start_date_time: dayjs(exam.start_date_time).format(
            "DD MMM YYYY, hh:mm A"
          ),
          end_date_time: dayjs(exam.end_date_time).format(
            "DD MMM YYYY, hh:mm A"
          ),
          result_date: exam.result_date
            ? dayjs(exam.result_date).format("DD MMM YYYY, hh:mm A")
            : null,
          no_of_question: questionCounts[exam.id] || 0,
          is_start: now >= startTime && now <= endTime,
          is_completed: now > endTime,
          is_expired: now > endTime,
          is_result: resultTime ? now >= resultTime : false,
          is_attempted: attemptedTestIds.has(exam.id),
          is_open: now >= startTime && now <= endTime,
          is_close: now > endTime,
          is_close1: now > endTime,
        };
      });

      // 6. Send response with both test series details and exams
      return res.json({
        success: true,
        message: "Test series details and exams fetched successfullysss",
        data: testSeriesDetails,
        exams: formattedExams,
      });
    } catch (error) {
      console.error("Error fetching exams:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching exams",
      });
    }
  },
  examDetails: async (req, res) => {
    const { exam_id } = req.body;
    const user_id = req.user?.id;

    if (!exam_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: "exam_id and user_id are required",
      });
    }

    try {
      // Fetch exam details
      const [examRows] = await pool.promise().query(
        `SELECT id, test_series_id, test_name, test_type, marks, test_pattern, instruction, test_location, duration_test, start_date_time, end_date_time, result_date
         FROM live_test 
         WHERE id = ? AND status = 1 AND deleted_at IS NULL`,
        [exam_id]
      );

      if (examRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Exam not found",
        });
      }

      const exam = examRows[0];

      // Check if user attempted the exam
      const [attemptedRows] = await pool
        .promise()
        .query(
          `SELECT test_id FROM live_test_result WHERE frontuser_id = ? AND test_id = ?`,
          [user_id, exam_id]
        );

      console.log(exam_id);
      const [questionRows] = await pool.promise().query(
        `SELECT * 
         FROM live_test_questions
         WHERE test_id = ?`,
        [exam_id]
      );

      const now = new Date();
      const startTime = new Date(exam.start_date_time);
      const endTime = new Date(exam.end_date_time);
      const resultTime = exam.result_date ? new Date(exam.result_date) : null;

      const formattedExam = {
        ...exam,
        no_of_question: questionRows.length || 0, // 👈 Count of questions
        is_start: now >= startTime && now <= endTime,
        is_completed: now > endTime,
        is_expired: now > endTime,
        is_result: resultTime ? now >= resultTime : false,
        is_attempted: attemptedRows.length > 0,
        is_open: now >= startTime && now <= endTime,
        is_close: now > endTime,
        // questions: questionRows,
      };

      return res.json({
        success: true,
        message: "Exam details fetched successfully",
        data: formattedExam,
      });
    } catch (error) {
      console.error("Error fetching exam details:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching exam details",
      });
    }
  },

  contactData: async (req, res) => {
    try {
      const module_settingsId = 1;

      // Select only required columns from module_settings
      const getmodule_settingsQuery = `
      SELECT 
        email, 
        mobile, 
        address, 
        whatsapp, 
        instagram, 
        youtube, 
        facebook, 
        linkedin 
      FROM module_settings 
      WHERE id = ?`;

      const module_settings = await new Promise((resolve, reject) => {
        pool.query(
          getmodule_settingsQuery,
          [module_settingsId],
          (error, result) => {
            if (error) {
              console.error(error);
              reject(error);
            } else {
              resolve(result[0]);
            }
          }
        );
      });

      return res.json({
        success: true,
        data: module_settings,
      });
    } catch (error) {
      console.error("Error fetching module settings:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  getQuestion: async (req, res) => {
    try {
      const userId = req.user?.id; // assuming you get user from auth middleware
      const { test_id, question_id } = req.body;

      if (!test_id) {
        return res.status(400).json({ success: false, message: "test_id" });
      }

      // 1. Fetch test details
      const [liveTestRows] = await pool.promise().query(
        `SELECT id, test_name, duration_test, is_result, test_pattern, testtype 
       FROM live_test WHERE id = ? LIMIT 1`,
        [test_id]
      );

      if (liveTestRows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Test not found" });
      }

      const live_test = liveTestRows[0];

      // 2. Check if test result exists for this user and test
      const [testResultRows] = await pool
        .promise()
        .query(
          `SELECT id FROM live_test_result WHERE test_id = ? AND frontuser_id = ? LIMIT 1`,
          [test_id, userId]
        );

      const is_test_result = testResultRows.length > 0 ? 1 : 0;

      // 3. Fetch all questions for the test
      const [allQuestions] = await pool.promise().query(
        `SELECT id, question, question_image, optionA, optionB, optionC, optionD, answer, level, question_type
       FROM live_test_questions
       WHERE test_id = ?
       ORDER BY id ASC`,
        [test_id]
      );

      let question = null;
      let questionSrNo = null;
      let nextQuestion = null;
      let prevQuestion = null;
      let is_answered = 0;
      let student_answer = null;
      let is_correct = null;

      if (question_id) {
        // Case 1: Specific question requested
        const [questionRows] = await pool
          .promise()
          .query(`SELECT * FROM live_test_questions WHERE id = ? LIMIT 1`, [
            question_id,
          ]);

        if (questionRows.length > 0) {
          question = questionRows[0];
          const index = allQuestions.findIndex((q) => q.id === question_id);
          if (index !== -1) {
            questionSrNo = index + 1;
            nextQuestion = allQuestions[index + 1] || null;
            prevQuestion = index > 0 ? allQuestions[index - 1] : null;
          }
        }
      } else {
        // Case 2: No question ID provided → Load first unattempted question
        let unattemptedFound = false;
        for (let i = 0; i < allQuestions.length; i++) {
          const q = allQuestions[i];
          const [attemptedRows] = await pool
            .promise()
            .query(
              `SELECT id FROM live_test_tmp WHERE user_id = ? AND test_id = ? AND question_id = ? AND student_answer IS NOT NULL LIMIT 1`,
              [userId, test_id, q.id]
            );

          if (attemptedRows.length === 0) {
            question = q;
            questionSrNo = i + 1;
            nextQuestion = allQuestions[i + 1] || null;
            prevQuestion = i > 0 ? allQuestions[i - 1] : null;
            unattemptedFound = true;
            break;
          }
        }

        // Case 3: All questions attempted → Load last attempted question
        if (!unattemptedFound) {
          const [lastAttemptedRows] = await pool
            .promise()
            .query(
              `SELECT * FROM live_test_tmp WHERE user_id = ? AND test_id = ? AND student_answer IS NOT NULL ORDER BY id DESC LIMIT 1`,
              [userId, test_id]
            );

          if (lastAttemptedRows.length > 0) {
            const lastAttempted = lastAttemptedRows[0];
            const [lastQuestionRows] = await pool
              .promise()
              .query(`SELECT * FROM live_test_questions WHERE id = ? LIMIT 1`, [
                lastAttempted.question_id,
              ]);
            if (lastQuestionRows.length > 0) {
              question = lastQuestionRows[0];
              const index = allQuestions.findIndex(
                (q) => q.id === lastAttempted.question_id
              );
              if (index !== -1) {
                questionSrNo = index + 1;
                nextQuestion = allQuestions[index + 1] || null;
                prevQuestion = index > 0 ? allQuestions[index - 1] : null;
              }
              is_answered = 1;
              student_answer = lastAttempted.student_answer;
              is_correct = student_answer == question.answer ? 1 : 0;
            }
          }
        }
      }

      // If question still exists and not answered yet, check answer status
      if (question && !is_answered) {
        const [answerDataRows] = await pool
          .promise()
          .query(
            `SELECT student_answer FROM live_test_tmp WHERE user_id = ? AND test_id = ? AND question_id = ? LIMIT 1`,
            [userId, test_id, question.id]
          );

        if (answerDataRows.length > 0) {
          is_answered = 1;
          student_answer = answerDataRows[0].student_answer;
          is_correct = student_answer == question.answer ? 1 : 0;
        }
      }

      const totalQuestions = allQuestions.length;

      // Count attempted questions
      const [attemptedCountRows] = await pool
        .promise()
        .query(
          `SELECT COUNT(*) as cnt FROM live_test_tmp WHERE user_id = ? AND test_id = ? AND student_answer IS NOT NULL`,
          [userId, test_id]
        );
      const attemptedCount = attemptedCountRows[0].cnt || 0;

      const all_attempted =
        attemptedCount === totalQuestions && totalQuestions > 0 ? 1 : 0;
      const is_last_question =
        question && question.id === allQuestions[allQuestions.length - 1].id
          ? 1
          : 0;

      const redirect_url =
        live_test.testtype === "Live" ? "test-result" : "practice-test-result";

      return res.json({
        success: true,
        live_test,
        question,
        question_sr_no: questionSrNo,
        next_id: nextQuestion ? nextQuestion.id : 0,
        is_next: nextQuestion ? 1 : 0,
        previous_id: prevQuestion ? prevQuestion.id : null,
        is_previous: prevQuestion ? 1 : 0,
        total_questions: totalQuestions,
        base_url: process.env.PUBLIC_URL || "", // adjust this accordingly
        is_answered,
        student_answer,
        is_correct,
        all_attempted,
        is_result: is_test_result,
        is_last_question,
        redirect_url,
      });
    } catch (error) {
      console.error("Error in getTestQuestion:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  submitLiveTest: async (req, res) => {
    const user = req.user;
    const user_id = user.id;
    const { test_id, question_id, student_answer, spend_time, next_id, count } =
      req.body;

    try {
      const [tempResults] = await pool
        .promise()
        .query(
          `SELECT * FROM live_test_tmp WHERE test_id = ? AND question_id = ? AND user_id = ? LIMIT 1`,
          [test_id, question_id, user_id]
        );
      const tempResult = tempResults[0] || null;

      const [lastAttempts] = await pool
        .promise()
        .query(
          `SELECT * FROM live_test_tmp WHERE test_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1`,
          [test_id, user_id]
        );
      const lastAttempt = lastAttempts[0] || null;

      const previousTime = lastAttempt?.total_time || 0;
      const currentTime = isNaN(spend_time) ? 0 : spend_time;
      const timeDiff = Math.max(0, currentTime - previousTime);

      if (tempResult) {
        await pool.promise().query(
          `UPDATE live_test_tmp SET student_answer = ?, is_skipped = ?, total_time = ?, spend_time = ? 
         WHERE test_id = ? AND question_id = ? AND user_id = ?`,
          [
            student_answer || "",
            student_answer ? 0 : 1,
            spend_time,
            timeDiff,
            test_id,
            question_id,
            user_id,
          ]
        );
      } else {
        await pool.promise().query(
          `INSERT INTO live_test_tmp (user_id, test_id, question_id, student_answer, is_skipped, total_time, spend_time)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            user_id,
            test_id,
            question_id,
            student_answer || "",
            student_answer ? 0 : 1,
            spend_time,
            timeDiff,
          ]
        );
      }

      const [liveTestData] = await pool
        .promise()
        .query(`SELECT * FROM live_test WHERE id = ?`, [test_id]);
      const live_test = liveTestData[0];

      const [allQuestions] = await pool
        .promise()
        .query(
          `SELECT * FROM live_test_questions WHERE test_id = ? ORDER BY id ASC`,
          [test_id]
        );

      const [lastQuestionData] = await pool
        .promise()
        .query(
          `SELECT * FROM live_test_questions WHERE test_id = ? ORDER BY id DESC LIMIT 1`,
          [test_id]
        );
      const lastQuestion = lastQuestionData[0];

      const [answeredCountResult] = await pool
        .promise()
        .query(
          `SELECT COUNT(*) AS answeredCount FROM live_test_tmp WHERE user_id = ? AND test_id = ? AND is_skipped = 0`,
          [user_id, test_id]
        );
      const answeredQuestion = answeredCountResult[0]?.answeredCount || 0;

      const noanswerQuestions =
        (live_test?.no_of_question || 0) - answeredQuestion;

      const totalQuestions = allQuestions.length;
      const currentQuestion = allQuestions.find((q) => q.id === next_id);
      const questionSrNo = allQuestions.findIndex((q) => q.id === next_id) + 1;
      const is_last_question = lastQuestion?.id === question_id ? 1 : 0;
      const is_next = lastQuestion?.id === question_id ? 0 : 1;
      const prevQuestion = [...allQuestions]
        .reverse()
        .find((q) => q.id < next_id);
      const nextQuestion = allQuestions.find((q) => q.id > next_id);
      const all_attempted =
        answeredQuestion === totalQuestions && totalQuestions > 0 ? 1 : 0;

      res.json({
        success: true,
        count: count + 1,
        live_test,
        question: currentQuestion,
        question_sr_no: questionSrNo,
        next_id: nextQuestion ? nextQuestion.id : null,
        is_next,
        previous_id: prevQuestion ? prevQuestion.id : null,
        is_previous: prevQuestion ? 1 : 0,
        total_questions: totalQuestions,
        answeredQuestion,
        noanswerQuestions,
        base_url: process.env.BASE_URL || "",
        all_attempted,
        is_last_question,
      });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
  submitFinalLiveTest: async (req, res) => {
    const user = req.user;
    const user_id = user.id;
    const test_id = req.body.test_id;

    try {
      // Get test
      const [testResults] = await pool
        .promise()
        .query(`SELECT * FROM live_test WHERE id = ? LIMIT 1`, [test_id]);
      const test = testResults[0];
      if (!test) {
        return res
          .status(404)
          .json({ status: false, message: "Test not found" });
      }

      // Get questions
      const [questions] = await pool
        .promise()
        .query(`SELECT * FROM live_test_questions WHERE test_id = ?`, [
          test_id,
        ]);

      // Attach student answer to each question
      for (const question of questions) {
        const [studentAnswerResult] = await pool
          .promise()
          .query(
            `SELECT * FROM live_test_tmp WHERE question_id = ? AND test_id = ? AND user_id = ? LIMIT 1`,
            [question.id, test_id, user_id]
          );

        const studentAnswer = studentAnswerResult[0];
        question.student_answer = studentAnswer?.student_answer || "";
        question.is_skipped = studentAnswer ? 0 : 1;
        question.spend_time = studentAnswer?.spend_time || 0;
      }

      // Insert into live_test_result (final test record)
      const [insertResult] = await pool.promise().query(
        `INSERT INTO live_test_result 
        (frontuser_id, test_id, test_name, category_id, category_name, course_id, subject_id, totalquestion, 
         start_date_time, end_date_time, passingmarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          test.id,
          test.test_name,
          test.category_id,
          test.category_name,
          test.course_id,
          test.subject_id,
          test.no_of_question,
          test.start_date_time,
          test.end_date_time,
          test.maximum_marks,
        ]
      );
      const result_id = insertResult.insertId;

      // Save individual questions
      for (const q of questions) {
        let is_correct = 0;
        let is_wrong = 0;
        if (q.is_skipped !== 1) {
          is_correct = q.student_answer === q.answer ? 1 : 0;
          is_wrong = is_correct ? 0 : 1;
        }

        // Ensure numeric values and avoid NaN
        const correct_mark = Number(q.correct_mark) || 0;
        const incorrect_mark = Number(q.incorrect_mark) || 0;

        const correct_score = is_correct * correct_mark;
        const wrong_score = is_wrong * incorrect_mark;
        const marks = correct_score - wrong_score;

        await pool.promise().query(
          `INSERT INTO live_test_result_details 
         (result_id, student_answer, question_id, frontuser_id, test_id, is_skipped, spend_time,
          is_correct, is_wrong, correct_score, wrong_score, marks, subject)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            result_id,
            q.student_answer,
            q.id,
            user_id,
            test_id,
            q.is_skipped,
            q.spend_time,
            is_correct,
            is_wrong,
            correct_score,
            wrong_score,
            marks,
            q.subject,
          ]
        );
      }

      // Calculate summary
      const [[summary]] = await pool.promise().query(
        `SELECT 
        SUM(is_correct) AS total_correct,
        SUM(is_wrong) AS total_wrong,
        SUM(is_skipped) AS total_skipped,
        SUM(correct_score) AS total_correct_score,
        SUM(wrong_score) AS total_wrong_score,
        SUM(marks) AS total_marks,
        SUM(spend_time) AS total_spend_time
      FROM live_test_result_details WHERE result_id = ?`,
        [result_id]
      );

      // Update final summary in live_test_result
      await pool.promise().query(
        `UPDATE live_test_result SET
        correct = ?, wrong = ?, skipped = ?, correct_score = ?, wrong_score = ?, 
        obtainmarks = ?, spend_time = ?
      WHERE id = ?`,
        [
          summary.total_correct || 0,
          summary.total_wrong || 0,
          summary.total_skipped || 0,
          summary.total_correct_score || 0,
          summary.total_wrong_score || 0,
          summary.total_marks || 0,
          summary.total_spend_time || 0,
          result_id,
        ]
      );

      // Delete temp answers
      await pool
        .promise()
        .query(`DELETE FROM live_test_tmp WHERE test_id = ? AND user_id = ?`, [
          test_id,
          user_id,
        ]);

      // Send response
      return res.json({
        status: true,
        message: "Test submitted successfully",
        total_correct: summary.total_correct || 0,
        total_wrong: summary.total_wrong || 0,
        total_skipped: summary.total_skipped || 0,
        correct_score: summary.total_correct_score || 0,
        wrong_score: summary.total_wrong_score || 0,
        obtain_marks: summary.total_marks || 0,
        passing_marks: test.maximum_marks,
        live: test,
        redirect_url:
          test.testtype === "Live" ? "test-result" : "practice-test-result",
      });
    } catch (err) {
      console.error("Submit Final Live Test Error:", err);
      // Return error details in response for easier debugging
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  },
  liveTestResult: async (req, res) => {
    const userId = req.user.id; // Assuming userId from JWT middleware or similar
    const testId = parseInt(req.body.test_id);

    if (!testId || isNaN(testId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing test_id" });
    }

    try {
      // 1. Get live test with course info
      const [liveTests] = await pool.promise().query(
        `SELECT lt.*, c.batch_type FROM live_test lt 
       LEFT JOIN courses c ON lt.course_id = c.id 
       WHERE lt.id = ?`,
        [testId]
      );

      const liveTest = liveTests[0];

      // Check if result declared
      const isResultDeclared = moment(liveTest.result_date).isSameOrBefore(
        moment()
      );

      // Check display history logic
      let isDisplayHistory = 0;
      if (
        liveTest.result_history_display_time &&
        moment(liveTest.result_history_display_time).isSameOrBefore(moment())
      ) {
        isDisplayHistory = 1;
      }

      // Fetch result data for user
      const [resultDatas] = await pool
        .promise()
        .query(
          `SELECT * FROM live_test_result WHERE test_id = ? AND frontuser_id = ? LIMIT 1`,
          [testId, userId]
        );
      const resultData = resultDatas[0] || null;

      // Subjective test and course batch check for history display
      if (
        liveTest.batch_type === "online" &&
        liveTest.test_pattern === "subjective" &&
        liveTest.testtype === "Live"
      ) {
        if (!resultData || !resultData.subjective_result) {
          isDisplayHistory = 0;
        } else {
          isDisplayHistory = 1;
        }
      }

      // Student answer sheets for subjective tests
      let studentAnswerSheet = "";
      let resultUploadedAnswerSheet = "";
      if (liveTest.test_pattern === "subjective" && resultData) {
        studentAnswerSheet = resultData.student_document || "";
        resultUploadedAnswerSheet = resultData.subjective_result || "";
      }

      // Fetch test result details for user
      const [results] = await pool
        .promise()
        .query(
          `SELECT * FROM live_test_result_details WHERE test_id = ? AND frontuser_id = ?`,
          [testId, userId]
        );

      // Counters
      let correct = 0,
        incorrect = 0,
        skipped = 0,
        timeTaken = 0;
      let questionHistory = [];
      let srNo = 1;

      for (const result of results) {
        let status = "not_attempted";
        if (result.is_skipped === 1) {
          skipped++;
          status = "skipped";
        } else if (result.is_correct === 1) {
          correct++;
          status = "correct";
        } else if (result.is_correct === 0) {
          incorrect++;
          status = "incorrect";
        }

        timeTaken += result.time_taken || 0;

        questionHistory.push({
          sr_no: srNo++,
          question_id: result.question_id,
          status,
          is_correct: result.is_correct,
          is_skipped: result.is_skipped,
          time_taken: result.time_taken,
        });
      }

      const totalQuestions = results.length;
      const attempts = correct + incorrect;
      const score = correct;
      const accuracy =
        attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
      // Assuming test total time is 50 mins as in PHP
      const speed = timeTaken > 0 ? (attempts / (50 / 60)).toFixed(2) : 0;

      let grade = 0;
      // if (liveTest.category_id === 20) {
      //   grade = getIGCSEGrading(accuracy);
      // } else {
      //   grade = getGrade1(accuracy);
      // }

      // Format display result date
      const displayResultDate = moment(liveTest.result_date).format(
        "DD MMM YYYY, hh:mm A"
      );
      liveTest.display_result_date = displayResultDate;

      // Get all result details grouped by user to calculate rank
      const [allResults] = await pool
        .promise()
        .query(`SELECT * FROM live_test_result_details WHERE test_id = ?`, [
          testId,
        ]);

      const userAccuracyList = [];
      const userAccuracyMap = {};
      const userAttemptsMap = {};

      // Group results by frontuser_id
      const groupedResults = {};
      for (const res of allResults) {
        if (!groupedResults[res.frontuser_id])
          groupedResults[res.frontuser_id] = [];
        groupedResults[res.frontuser_id].push(res);
      }

      for (const uid in groupedResults) {
        let userCorrect = 0,
          userIncorrect = 0;
        for (const r of groupedResults[uid]) {
          if (r.is_correct === 1) userCorrect++;
          else if (r.is_correct === 0) userIncorrect++;
        }
        const userAttempts = userCorrect + userIncorrect;
        const userAccuracy =
          userAttempts > 0
            ? parseFloat(((userCorrect / userAttempts) * 100).toFixed(2))
            : 0;

        userAccuracyList.push({
          user_id: parseInt(uid),
          accuracy: userAccuracy,
        });
        userAccuracyMap[uid] = userAccuracy;
        userAttemptsMap[uid] = userAttempts;
      }

      // Sort by accuracy desc
      userAccuracyList.sort((a, b) => b.accuracy - a.accuracy);

      let userRank = 0;
      let rank = 1;
      for (const item of userAccuracyList) {
        if (item.user_id === userId) {
          userRank = rank;
          break;
        }
        rank++;
      }

      // Additional display rules
      let isDisplayDate = 1;
      if (liveTest.batch_type === "online") {
        if (liveTest.testtype === "Practice") {
          isDisplayHistory = 1;
        }
        isDisplayDate = 0;
      }

      return res.json({
        success: true,
        message: "Test result fetched successfully",
        is_result_declared: isResultDeclared ? 1 : 0,
        is_display_history: isDisplayHistory,
        isDisplayDate,
        live_test: liveTest,
        data: {
          score: `${score}/${totalQuestions}`,
          attempts,
          speed: `${speed}/min`,
          accuracy: `${accuracy}%`,
          correct,
          incorrect,
          skipped,
          grade,
          rank: userRank,
          time_taken:
            resultData && resultData.spend_time
              ? `${resultData.spend_time} sec`
              : "",
          question_history: questionHistory,
          studentAnswerSheet,
          resultUploadedAnswerSheet,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  examAttemptHistory: async (req, res) => {
    try {
      const userId = req.user.id;
      const testId = req.body.test_id;

      // 1. Get test
      const [testRows] = await pool
        .promise()
        .query("SELECT * FROM live_test WHERE id = ?", [testId]);
      const test = testRows[0];

      // 2. Get all questions
      const [questions] = await pool
        .promise()
        .query(
          "SELECT test_id, id, question_type, question, optionA, optionB, optionC, optionD, answer, marks FROM live_test_questions WHERE test_id = ?",
          [testId]
        );

      // 3. Loop through questions and process
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];

        const [tmpAnswerRows] = await pool
          .promise()
          .query(
            `SELECT * FROM live_test_tmp WHERE test_id = ? AND question_id = ? AND user_id = ? LIMIT 1`,
            [testId, question.id, userId]
          );

        if (tmpAnswerRows.length > 0) {
          const tmpAnswer = tmpAnswerRows[0];
          const studentAnswer = tmpAnswer.student_answer;
          const isSkipped = tmpAnswer.is_skipped;

          const isCorrect = studentAnswer === question.answer ? 1 : 0;
          const isWrong =
            studentAnswer && studentAnswer !== question.answer ? 1 : 0;

          question.student_answer = studentAnswer;
          question.is_correct = isCorrect;
          question.is_wrong = isWrong;
          question.is_skipped = isSkipped;

          if (
            (!studentAnswer || studentAnswer === "") &&
            (!isSkipped || isSkipped === "")
          ) {
            question.is_attempted = 0;
            question.is_pending = 1;
          } else {
            question.is_attempted = 1;
            question.is_pending = 0;
          }
        } else {
          question.student_answer = null;
          question.is_correct = 0;
          question.is_wrong = 0;
          question.is_skipped = 1; // assume skipped if no entry
          question.is_attempted = 0;
          question.is_pending = 1;
        }
      }

      // ✅ 4. Count totals
      let totalAttempted = 0;
      let totalPending = 0;
      let totalSkipped = 0;

      for (const question of questions) {
        if (question.is_attempted === 1) totalAttempted++;
        if (question.is_pending === 1) totalPending++;
        if (question.is_skipped === 1) totalSkipped++;
      }

      const totalQuestions = questions.length;
      const progress =
        totalQuestions > 0
          ? Math.round((totalAttempted / totalQuestions) * 100)
          : 0;
      return res.json({
        success: true,
        message: "LiveTest Result History",
        test: test,
        data: questions,
        attempted: totalAttempted,
        pending: totalPending,
        skipped: totalSkipped,
        progress,
      });
    } catch (error) {
      console.error("Error in examAttemptHistory:", error);
      return res.status(500).json({ success: false, message: "Server Error" });
    }
  },
  NotificationList: async (req, res) => {
    try {
      const userId = req.user?.id || req.session?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized access",
        });
      }

      // const [notifications] = await pool.promise().query(
      //   `SELECT *
      //    FROM notifications
      //    WHERE user_id = ?
      //    ORDER BY created_at DESC`,
      //   [userId]
      // );

      const [notifications] = await pool.promise().query(
        `SELECT title, description, created_at 
       FROM notifications 
       
       ORDER BY created_at DESC`
      );

      return res.json({
        success: true,
        message: "Notifications fetched successfully",
        data: notifications,
      });
    } catch (error) {
      console.error("Notification List Error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching notifications",
        error: error.message,
      });
    }
  },
};

module.exports = ApiController;
