const pool = require("../../db/database");

class BookingController {

  static async CourseBooking(req, res) {
  try {
    const page_name = "Course Booking List";
    const {
      from_date,
      to_date,
      status,
      course,
      student,
      coupon,
    } = req.query;

    // Base query and conditions
    let conditions = [`co.order_type = 'course'`];
    let values = [];

    if (from_date) {
      conditions.push(`DATE(co.created_at) >= ?`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`DATE(co.created_at) <= ?`);
      values.push(to_date);
    }

    if (status) {
      conditions.push(`co.payment_status = ?`);
      values.push(status);
    }

    if (course) {
      conditions.push(`co.course_id = ?`);
      values.push(course);
    }

    if (student) {
      conditions.push(`co.user_id = ?`);
      values.push(student);
    }

    if (coupon) {
      conditions.push(`co.coupon_code = ?`);
      values.push(coupon);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        co.id,
        co.user_id,
        u.name AS customer_name,
        ts.course_name,
        co.transaction_id,
        co.payment_status,
        co.order_status,
        co.total_amount,
        co.coupon_code,
        co.created_at,
        co.updated_at
      FROM course_orders co
      JOIN front_users u ON u.id = co.user_id
      JOIN courses ts ON ts.id = co.course_id
      ${whereClause}
      ORDER BY co.created_at DESC
    `;

    const [bookings] = await pool.promise().query(query, values);

    // Get filter options
    const [courses] = await pool.promise().query(`
      SELECT DISTINCT c.id, c.course_name
      FROM courses c
      JOIN course_orders co ON co.course_id = c.id
      WHERE co.order_type = 'course'
    `);

    const [students] = await pool.promise().query(`
      SELECT DISTINCT u.id, u.name
      FROM front_users u
      JOIN course_orders co ON co.user_id = u.id
      WHERE co.order_type = 'course'
    `);

    const [coupons] = await pool.promise().query(`
      SELECT DISTINCT coupon_code
      FROM course_orders
      WHERE coupon_code IS NOT NULL AND coupon_code != ''
    `);

    res.render("admin/booking/course-order", {
      success: req.flash("success"),
      error: req.flash("error"),
      bookings,
      courses,
      students,
      coupons,
      req,
      page_name,
      list_url: "/admin/course-booking-list",
      trashed_list_url: "/admin/course-booking-list?status=trashed",
      create_url: "/admin/course-booking-create",
    });
  } catch (error) {
    console.error("CourseBooking List Error:", error);
    req.flash("error", "Server error in listing course bookings");
    res.redirect(req.get("Referrer") || "/");
  }
}


//   static async CourseBooking(req, res) {
//     try {
//       const status = req.query.status || "active";
//        const page_name = "Course Booking List";

// const whereClause = "WHERE order_type = 'course'";

// const query = `
//   SELECT
//     co.id,
//     co.user_id,
//     u.name AS customer_name,
//     ts.course_name,
//     co.transaction_id,
//     co.payment_status,
//     co.order_status,
//     co.total_amount,
//     co.created_at,
//     co.updated_at
//   FROM course_orders co
//   JOIN front_users u ON u.id = co.user_id
//   JOIN courses ts ON ts.id = co.course_id
//   WHERE co.order_type = 'course'
//   ORDER BY co.created_at DESC
// `;



//       const [bookings] = await pool.promise().query(query);
//        const [courses] = await pool.promise().query(`
//       SELECT DISTINCT c.id, c.course_name
//       FROM courses c
//       JOIN course_orders co ON co.course_id = c.id
//       WHERE co.order_type = 'course'
//     `);

//     // 🔹 Get unique user IDs from course_orders and their names
//     const [students] = await pool.promise().query(`
//       SELECT DISTINCT u.id, u.name
//       FROM front_users u
//       JOIN course_orders co ON co.user_id = u.id
//       WHERE co.order_type = 'course'
//     `);

//     // 🔹 Get distinct coupon codes used in course_orders
//     const [coupons] = await pool.promise().query(`
//       SELECT DISTINCT coupon_code
//       FROM course_orders
//       WHERE coupon_code IS NOT NULL AND coupon_code != ''
//     `);
//       res.render("admin/booking/course-order", {
//         success: req.flash("success"),
//         error: req.flash("error"),
//         bookings,
//           courses,
//       students,
//       coupons,
//         req,
//         page_name,
//         list_url: "/admin/course-booking-list",
//         trashed_list_url: "/admin/course-booking-list?status=trashed",
//         create_url: "/admin/course-booking-create",
//       });
//     } catch (error) {
//       console.error("CourseBooking List Error:", error);
//       req.flash("error", "Server error in listing course bookings");
//       res.redirect(req.get("Referrer") || "/");
//     }
//   }

  static async TestSeriesBooking(req, res) {
    try {

      const status = req.query.status || "active";
    const page_name = "Test Series  Booking List";
      console.log(page_name);
const whereClause = "WHERE order_type = 'test'";

    const query = `
  SELECT
    co.id,
    co.user_id,
    u.name AS customer_name,
    ts.name as course_name,
    co.transaction_id,
    co.payment_status,
    co.order_status,
    co.total_amount,
    co.created_at,
    co.updated_at
  FROM course_orders co
  JOIN front_users u ON u.id = co.user_id
  JOIN test_series ts ON ts.id = co.course_id
  WHERE co.order_type = 'test'
  ORDER BY co.created_at DESC
`;


      const [bookings] = await pool.promise().query(query);
      console.log(bookings)
      res.render("admin/booking/test-series-order", {
        success: req.flash("success"),
        error: req.flash("error"),
        bookings,
        req,
        page_name,
        list_url: "/admin/test-series-booking-list",
        trashed_list_url: "/admin/test-series-booking-list?status=trashed",
      });
    } catch (error) {
      console.error("TestSeriesBooking List Error:", error);
      req.flash("error", "Server error in listing test series bookings");
      res.redirect(req.get("Referrer") || "/");
    }
  }

  static async bookingDetails(req, res) {
    try {
      const bookingId = req.params.bookingId;

      const query = `
        SELECT 
          tsb.*,
          u.name AS customer_name,
          u.email AS email,
          u.mobile AS mobile,
          ts.name AS test_series_name
        FROM course_orders tsb
        LEFT JOIN front_users u ON tsb.user_id = u.id
        LEFT JOIN test_series ts ON tsb.course_id = ts.id
        WHERE tsb.id = ?
      `;

      const [results] = await pool.promise().query(query, [bookingId]);


      if (results.length === 0) {
        req.flash("error", "Booking not found");
        return res.redirect("/admin/test-series-booking-list");
      }

      const booking = results[0];

      console.log(booking); 
      res.render("admin/booking/booking_details", {
        success: req.flash("success"),
        error: req.flash("error"),
        booking,
        req,
        page_name: "Booking Details",
        list_url: "/admin/test-series-booking-list",
      });
    } catch (error) {
      console.error("Booking Details Error:", error);
      req.flash("error", "Server error retrieving booking details");
      res.redirect(req.get("Referrer") || "/");
    }
  };

  static async LiveTestBooking(req, res) {
  try {
    const page_name = "Live Test Booking List";
    const {
      from_date,
      to_date,
      status,
      course,
      student,
      coupon,
    } = req.query;

    // Base query and conditions
    let conditions = [];
    let values = [];

    if (from_date) {
      conditions.push(`DATE(co.created_at) >= ?`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`DATE(co.created_at) <= ?`);
      values.push(to_date);
    }

    if (status) {
      conditions.push(`co.payment_status = ?`);
      values.push(status);
    }

    if (course) {
      conditions.push(`co.course_id = ?`);
      values.push(course);
    }

    if (student) {
      conditions.push(`co.user_id = ?`);
      values.push(student);
    }

    if (coupon) {
      conditions.push(`co.coupon_code = ?`);
      values.push(coupon);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        co.id,
        co.user_id,
        u.name AS customer_name,
        ts.test_name,
        co.transaction_id,
        co.payment_status,
        co.order_status,
        co.total_amount,
        co.coupon_code,
        co.created_at,
        co.updated_at
      FROM live_test_orders co
      JOIN front_users u ON u.id = co.user_id
      JOIN live_test ts ON ts.id = co.test_id
      ${whereClause}
      ORDER BY co.created_at DESC
    `;

    const [bookings] = await pool.promise().query(query, values);

    // Get filter options
    const [courses] = await pool.promise().query(`
      SELECT DISTINCT c.id, c.test_name
      FROM live_test c
      JOIN live_test_orders co ON co.test_id = c.id
     
    `);

    const [students] = await pool.promise().query(`
      SELECT DISTINCT u.id, u.name
      FROM front_users u
      JOIN live_test_orders co ON co.user_id = u.id
    `);

    const [coupons] = await pool.promise().query(`
      SELECT DISTINCT coupon_code
      FROM live_test_orders
      WHERE coupon_code IS NOT NULL AND coupon_code != ''
    `);

    res.render("admin/booking/live-test-order", {
      success: req.flash("success"),
      error: req.flash("error"),
      bookings,
      courses,
      students,
      coupons,
      req,
      page_name,
      list_url: "/admin/course-booking-list",
      trashed_list_url: "/admin/course-booking-list?status=trashed",
      create_url: "/admin/course-booking-create",
    });
  } catch (error) {
    console.error("CourseBooking List Error:", error);
    req.flash("error", "Server error in listing course bookings");
    res.redirect(req.get("Referrer") || "/");
  }
}
}

module.exports = BookingController;
