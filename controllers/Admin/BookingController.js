const pool = require("../../db/database");

class BookingController {
  static async CourseBooking(req, res) {
    try {
      const status = req.query.status || "active";
       const page_name = "Course Booking List";

const whereClause = "WHERE order_type = 'course'";

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
    co.created_at,
    co.updated_at
  FROM course_orders co
  JOIN front_users u ON u.id = co.user_id
  JOIN courses ts ON ts.id = co.course_id
  WHERE co.order_type = 'course'
  ORDER BY co.created_at DESC
`;



      const [bookings] = await pool.promise().query(query);
      
      res.render("admin/booking/course-order", {
        success: req.flash("success"),
        error: req.flash("error"),
        bookings,
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

  static async TestSeriesBooking(req, res) {
    try {
      const status = req.query.status || "active";
    const page_name = "Test Series  Booking List";

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
          u.name AS user_name,
          u.email AS user_email,
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
  }
}

module.exports = BookingController;
