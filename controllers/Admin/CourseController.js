const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");
const Helper = require("../../helpers/Helper");
const { validateRequiredFields } = require("../../helpers/validationsHelper");
function List(req, res) {


  const { category_id, course_status } = req.query;
  let course_type = req.params.course_type; // from route param

  const userRoles = req.session.userRole || []; // array of roles, e.g. ['Center']
  const userId = req.user.id;

  console.log('User Roles:', userRoles);
  console.log('User ID:', userId);

  let filters = [`courses.deleted_at IS NULL`]; // always exclude deleted courses
  let queryParams = [];

  // Role-based filter: if user has role 'Center', only show courses created by that user
  if (userRoles.includes('Center')) {
    filters.push(`courses.created_by = ?`);
    queryParams.push(userId);
   
  }

  // Add other filters
  // if (category_id) {
  //   filters.push(`courses.category_id = ?`);
  //   queryParams.push(category_id);
  // }

  if (course_status !== undefined && course_status !== '') {
    filters.push(`courses.batch_type = ?`);
    queryParams.push(course_status);
  }

  if (course_type) {
    if (course_type === 'online') filters.push(`courses.batch_type = 'online'`);
    else if (course_type === 'offline') filters.push(`courses.batch_type = 'offline'`);
    else if (course_type === 'free') filters.push(`courses.course_type = 'free'`);
    else if (course_type === 'paid') filters.push(`courses.course_type = 'paid'`);
  }

  // Build SQL query with all filters combined by AND
  let sql = `
    SELECT 
      courses.*, 
      categories.category_name,
      users.name AS uploaded_by_name,
      roles.name AS uploaded_by_role
    FROM courses
    LEFT JOIN categories ON courses.category_id = categories.id
    LEFT JOIN users ON courses.created_by = users.id
    LEFT JOIN roles ON users.role_id = roles.id
    WHERE ${filters.join(' AND ')}
    ORDER BY courses.id DESC
  `;

  runQuery(sql, queryParams)
    .then(courses => {
      return runQuery(`SELECT id, category_name FROM categories WHERE deleted_at IS NULL`)
        .then(category_list => {
          res.render('admin/course/list', {
            customers: courses,
            category_list,
            req,
            list_url: '/admin/course-list/all',
            trashed_list_url: '/admin/course-list?status=trashed',
            create_url: '/admin/course-create',
            page_name: 'Course List'
          });
        });
    })
    .catch(err => {
      console.error('DB Error:', err);
      res.status(500).send('Internal Server Error');
    });
}


const Create = async (req, res) => {
  try {
    const visibility = ["featured", "up_comming"];
    const services = await getServicesFromTable();
    const categories = await getCategoriesFromTable();
    const course_classes = await getCourseClassesFromTable();
    const faculties = await Helper.getActiveFaculties();
 const centers = await Helper.getCenters();
    let course = {};


    if (typeof course.teacher_id === "string") {
      course.teacher_ids = course.teacher_id
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));
    } else if (Array.isArray(course.teacher_id)) {
      course.teacher_ids = course.teacher_id.map((id) => parseInt(id));
    } else {
      course.teacher_ids = [];
    }


    res.render("admin/course/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      visibility,
      form_url: "/admin/course-update",
      page_name: "Create Course",
      services: services,
      course: course, // <== fix this
      categories: categories,
      course_classes,
      faculties,
      centers
    });
  } catch (error) {
    console.log(error.message);
  }
};

const getServicesFromTable = async () => {
  return new Promise((resolve, reject) => {
    const query =
      "SELECT * FROM services WHERE status = 1 AND deleted_at IS NULL"; // Correct SQL query
    pool.query(query, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
}
const getCategoriesFromTable = async () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM categories WHERE status = 1 AND deleted_at IS NULL AND category_type = 'course'`;
    pool.query(query, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const validateCourseData = (data) => {
  const errors = {};

  // Auto-generate slug if not provided
  if (!data.slug || data.slug.trim() === "") {
    data.slug = data.course_name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  if (!data.category_id || isNaN(data.category_id)) {
    errors.category_id = "Category ID is required and must be numeric";
  }
  if (!data.course_class_id || isNaN(data.course_class_id)) {
    errors.course_class_id = "Course class ID is required and must be numeric";
  }
  if (!data.course_name?.trim()) {
    errors.course_name = "Course name is required";
  }
  if (!data.title_heading?.trim()) {
    errors.title_heading = "Title heading is required";
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    errors.slug = "Slug is invalid. Use lowercase letters, numbers, hyphens";
  }
  if (!["free", "paid"].includes(data.course_type)) {
    errors.course_type = 'Course type must be "free" or "paid"';
  }
  if (data.course_type === "paid" && (!data.price || isNaN(data.price))) {
    errors.price = "Price is required and must be a number";
  }
  if (!["percentage", "fixed"].includes(data.discount_type)) {
    errors.discount_type = 'Discount type must be "percentage" or "fixed"';
  }
  if (data.discount && isNaN(data.discount)) {
    errors.discount = "Discount must be a number";
  }
  if (!data.duration || isNaN(data.duration)) {
    errors.duration = "Duration must be a number";
  }
  if (!Array.isArray(data.course_visibility)) {
    errors.course_visibility = "Course visibility must be an array";
  }
  if (!data.content?.trim()) {
    errors.content = "Content is required";
  }
  if (!data.description?.trim()) {
    errors.description = "Description is required";
  }
  if (
    !Array.isArray(data.service_id) ||
    data.service_id.some((id) => isNaN(id))
  ) {
    errors.service_id = "Service IDs must be numeric array";
  }
  if (!data.start_time || isNaN(new Date(data.start_time))) {
    errors.start_time = "Start time is invalid";
  }
  if (!["0", "1"].includes(data.status)) {
    errors.status = 'Status must be "0" or "1"';
  }

  return errors;
};

const getCourseClassesFromTable = async () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM course_classes WHERE status = 1 AND deleted_at IS NULL`;
    pool.query(query, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const fs = require("fs");
const path = require("path");

// const checkImagePath = (filePath) => {
//     const normalizedPath = filePath.normalize(filePath); // converts \ to /
//     const fullPath = filePath.join(__dirname, '..', 'public', normalizedPath);

//     return fs.existsSync(fullPath);
//       };

const checkImagePath = (relativePath) => {
  const normalizedPath = path.normalize(relativePath);

  // Get the absolute path from the project root (where the 'public' folder is located)
  const fullPath = path.join(__dirname, "..", "public", normalizedPath);
  // console.log("Server checking for file at:", fullPath); // For debugging
  // Check if the file exists on the server
  return fs.existsSync(fullPath);
};

const generateImageURL = (imagePath) => {
  const baseURL = "http://localhost:5000/"; // Base URL of your application
  const defaultImage = "admin/images/default-featured-image.png"; // Default image if path doesn't exist

  // Check if the image exists on the server
  const fileExists = checkImagePath(imagePath);

  // Return the correct URL: either the actual image URL or the default image URL
  return fileExists ? `${baseURL}${imagePath}` : `${baseURL}${defaultImage}`;
};
const Edit = async (req, res) => {
  try {
    const courseId = req.params.courseId; // Renamed for clarity (was 'customerId')

    // Fetch the course based on the provided courseId
    const getCourseQuery = "SELECT * FROM courses WHERE id = ?";
    const visibility = ["featured", "up_comming"]; // Corrected 'visibility' initialization
    const services = await getServicesFromTable(); // Fetch data from services_table
const centers = await Helper.getCenters();
    // Fetch the course details from the database
    const course = await new Promise((resolve, reject) => {
      pool.query(getCourseQuery, [courseId], function (error, result) {
        if (error) {
          req.flash("error", error.message);
          return reject(error);
        }
        if (result.length === 0) {
          req.flash("error", "Course not found");
          return reject(new Error("Course not found"));
        }
        resolve(result[0]); // Ensure result[0] contains course data
      });
    });

    const categories = await Helper.getActiveCategoriesByType();
    const course_classes = await Helper.getActiveCourseClasses();
    const faculties = await Helper.getActiveFaculties();

    const imageExists = checkImagePath(course.image);
    const detailsImageExists = checkImagePath(course.details_image);
    if (detailsImageExists) {
      console.log("✅ File exists in public.");
    } else {
      console.log("❌ File does not exist.");
    }
    if (typeof course.teacher_id === "string") {
      course.teacher_ids = course.teacher_id
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));
    } else if (Array.isArray(course.teacher_id)) {
      course.teacher_ids = course.teacher_id.map((id) => parseInt(id));
    } else {
      course.teacher_ids = [];
    }

    res.render("admin/course/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      course: course, // Pass the course details to the view
      categories: categories, // Pass the categories for the select dropdown
      course_classes: course_classes, // Pass the course classes for the select dropdown
      faculties: faculties,
      centers,
      services: services, // Pass the services data
      visibility, // Pass visibility options to the view
      form_url: "/admin/course-update/" + courseId, // URL for the update form
      page_name: "Edit",
      image: imageExists
        ? `${course.image}`
        : "admin/images/default-featured-image.png",
      details_image: detailsImageExists
        ? `${course.details_image}`
        : "admin/images/default-featured-image.png",
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect("back");
  }
};
const Update = async (req, res) => {
  const courseId = req.params.courseId;
  const isInsert = !courseId || courseId === "null" || courseId === "0";

  const {
    category_id,
    course_class_id,
    course_name,
    title_heading,
    slug: inputSlug,
    course_type = "free",
    price,
    discount_type,
    discount,
    duration,
    content,
    description,
    start_time,
    status,
    mode_of_class,
    meeting_link,
    course_visibility = [],
    service_id = [],
    teacher_id = [],
    video,
    seo_title,
    seo_description,
    batch_type,
    batch_year,
  } = req.body;

  const imageFile = req?.files?.image?.[0];
  const detailsImageFile = req?.files?.details_image?.[0];
  const brochureFile = req?.files?.brochure?.[0];

  // Generate slug if missing
  let slug = inputSlug?.trim();
  if (course_name) {
  slug = course_name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

  // --- Validation ---
  const errors = {};

  if (!category_id?.trim()) errors.category_id = ["Category is required"];
  if (!batch_type?.trim()) errors.batch_type = ["Batch Type is required"];
  if (!batch_year?.trim()) errors.batch_year = ["Batch Year is required"];
  if (!course_class_id?.trim()) errors.course_class_id = ["Course Class ID is required"];
  if (!course_name?.trim()) errors.course_name = ["Course name is required"];
  if (!title_heading?.trim()) errors.title_heading = ["Title heading is required"];
  if (!slug) errors.slug = ["Slug is required"];
  if (!["free", "paid"].includes(course_type)) errors.course_type = ["Invalid course type"];
  if (course_type === "paid" && (!price || isNaN(price))) errors.price = ["Price must be a number"];
  // if (!discount_type?.trim()) errors.discount_type = ["Discount type is required"];
  // if (discount && isNaN(discount)) errors.discount = ["Discount must be numeric"];
  if (!duration || isNaN(duration)) errors.duration = ["Duration must be numeric"];
  if (!content?.trim()) errors.content = ["Content is required"];
  if (!description?.trim()) errors.description = ["Description is required"];
  if (!start_time || isNaN(Date.parse(start_time))) errors.start_time = ["Valid start time is required"];
  if (!["0", "1"].includes(status)) errors.status = ["Status must be '0' or '1'"];

  // File validations only during insert
  if (isInsert) {
    if (!imageFile) errors.image = ["Course image is required"];
    if (!detailsImageFile) errors.details_image = ["Details image is required"];
    if (!brochureFile) errors.brochure = ["Brochure file is required"];
  }

  // If validation errors exist
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  // --- Offer price calculation ---
  let offer_price = 0;
  const parsedPrice = parseFloat(price);
  const parsedDiscount = parseFloat(discount);

  if (course_type === "paid" && !isNaN(parsedPrice)) {
    if (discount_type === "percentage" && !isNaN(parsedDiscount)) {
      offer_price = parsedPrice - (parsedPrice * parsedDiscount) / 100;
    } else if (discount_type === "price" && !isNaN(parsedDiscount)) {
      offer_price = parsedPrice - parsedDiscount;
    } else {
      offer_price = parsedPrice;
    }
    if (offer_price < 0) offer_price = 0;
  }

  // --- Prepare data ---
  const data = {
    category_id: category_id.trim(),
    course_class_id: course_class_id.trim(),
    course_name: course_name.trim(),
    title_heading: title_heading.trim(),
    slug,
    course_type,
    price: parsedPrice || 0,
    discount_type,
    discount: parsedDiscount || 0,
    duration: parseInt(duration),
    content: content.trim(),
    description: description.trim(),
    start_time,
    status,
    course_visibility: Array.isArray(course_visibility) ? course_visibility.join(",") : "",
    service_id: Array.isArray(service_id) ? service_id.join(",") : "",
    teacher_id: Array.isArray(teacher_id) ? teacher_id.join(",") : "",
    video,
    seo_title,
    seo_description,
    mode_of_class,
    meeting_link,
    offer_price,
    batch_type,
    batch_year,
  };

  // Add file paths
  if (imageFile) data.image = `/uploads/courses/${imageFile.filename}`;
  if (detailsImageFile) data.details_image = `/uploads/courses/${detailsImageFile.filename}`;
  if (brochureFile) data.brochure = `/uploads/courses/${brochureFile.filename}`;

  data.created_by = req.user?.id || null;

  // --- Database operation ---
  try {
    if (isInsert) {
      const fields = Object.keys(data);
      const placeholders = fields.map(() => "?").join(", ");
      const values = fields.map((key) => data[key]);

      const insertQuery = `INSERT INTO courses (${fields.join(", ")}) VALUES (${placeholders})`;

      pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error("Insert Error:", err);
          return res.status(500).json({ success: false, message: "Insert failed" });
        }
        return res.json({
          success: true,
          redirect_url: "/admin/course-list/all",
          message: "Course created successfully",
        });
      });
    } else {
      const fields = Object.keys(data);
      const setClause = fields.map((field) => `${field} = ?`).join(", ");
      const values = fields.map((key) => data[key]);
      values.push(courseId);

      const updateQuery = `UPDATE courses SET ${setClause} WHERE id = ?`;

      pool.query(updateQuery, values, (err, result) => {
        if (err) {
          console.error("Update Error:", err);
          return res.status(500).json({ success: false, message: "Update failed" });
        }
        return res.json({
          success: true,
          redirect_url: "/admin/course-list/all",
          message: "Course updated successfully",
        });
      });
    }
  } catch (err) {
    console.error("Exception:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


const Delete = async (req, res) => {
  try {
    const categorieId = req.params.courseId;

    const softDeleteQuery = "UPDATE courses SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Course soft deleted successfully");
    return res.redirect("/admin/course-list/all");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/course-list/all`);
  }
};

const Restore = async (req, res) => {
  try {
    const categorieId = req.params.categorieId;

    const RestoreQuery = "UPDATE customers SET deleted_at = null WHERE id = ?";

    pool.query(RestoreQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Customer Restored successfully");
    return res.redirect("/admin/categorie-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/categorie-list`);
  }
};

const PermanentDelete = async (req, res) => {
  try {
    const categorieId = req.params.categorieId;

    const DeleteQuery = "DELETE FROM customers WHERE id = ?";

    pool.query(DeleteQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Customer deleted successfully");
    return res.redirect("/admin/categorie-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/categorie-list`);
  }
};

const Show = async (req, res) => {
  try {
    const postId = req.params.courseId;

    // 1. Fetch course
    const courseQuery = `
      SELECT 
        ts.*, 
        c.category_name 
      FROM 
        \`courses\` ts
      LEFT JOIN 
        categories c ON ts.category_id = c.id
      WHERE 
        ts.id = ?
    `;

    const post = await new Promise((resolve, reject) => {
      pool.query(courseQuery, [postId], (error, result) => {
        if (error) return reject(error);
        if (result.length === 0) return reject(new Error("Course not found"));
        resolve(result[0]);
      });
    });

    // 2. Parse comma-separated IDs
    const teacherIds = post.teacher_id
      ? post.teacher_id.split(',').map(id => parseInt(id.trim()))
      : [];

    const serviceIds = post.service_id
      ? post.service_id.split(',').map(id => parseInt(id.trim()))
      : [];

    const teachers = await new Promise((resolve, reject) => {
      if (teacherIds.length === 0) return resolve([]);
      const query = `SELECT id, name FROM faculties WHERE id IN (?) AND status = 1 AND deleted_at IS NULL`;
      pool.query(query, [teacherIds], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    // 4. Fetch services
    const services = await new Promise((resolve, reject) => {
      if (serviceIds.length === 0) return resolve([]);
      const query = `SELECT id, title FROM services WHERE id IN (?) AND status = 1 AND deleted_at IS NULL`;
      pool.query(query, [serviceIds], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });


    const subjectCount = await Helper.getSubjectCountByCourseId(postId);
    const chapterCount = await Helper.getChapterCountByCourseId(postId);
    const pdfCount = await Helper.getPdfCountByCourseId(postId);
    const videoCount = await Helper.getVideoCountByCourseId(postId);
    const bookingCount = await Helper.getBookingCountByCourseId(postId);
    const testCount = await Helper.getTestCountByCourseId(postId);
    res.render("admin/course/show", {
      success: req.flash("success"),
      error: req.flash("error"),
      course: post,
      teachers,
      services,
      subjectCount,
      chapterCount,
      pdfCount,
      videoCount,
      testCount,
      bookingCount,
      form_url: `/admin/course-update/${postId}`,
      page_name: "Course Details",
    });

  } catch (error) {
    console.error("Show Error:", error.message);
    req.flash("error", "An unexpected error occurred");
    res.redirect("back");
  }
}

const Booking = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const status = req.query.status || "active";
    const page_name = "Course Booking List";

    // Build conditional WHERE clause
    let whereClause = `WHERE co.order_type = 'course'`;
    const params = [];

    if (courseId) {
      whereClause += ` AND co.course_id = ?`;
      params.push(courseId);
    }


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
      ${whereClause}
      ORDER BY co.created_at DESC
    `;

    const courseQuery = `
      SELECT 
        ts.*, 
        c.category_name 
      FROM 
        \`courses\` ts
      LEFT JOIN 
        categories c ON ts.category_id = c.id
      WHERE 
        ts.id = ?
    `;

    const course = await new Promise((resolve, reject) => {
      pool.query(courseQuery, [courseId], (error, result) => {
        if (error) return reject(error);
        if (result.length === 0) return reject(new Error("Course not found"));
        resolve(result[0]);
      });
    });
    const [bookings] = await pool.promise().query(query, params);
    const subjectCount = await Helper.getSubjectCountByCourseId(courseId);
    const chapterCount = await Helper.getChapterCountByCourseId(courseId);
    const pdfCount = await Helper.getPdfCountByCourseId(courseId);
    const videoCount = await Helper.getVideoCountByCourseId(courseId);
    const bookingCount = await Helper.getBookingCountByCourseId(courseId);
const testCount = await Helper.getTestCountByCourseId(courseId);
    res.render("admin/course/booking", {
      success: req.flash("success"),
      error: req.flash("error"),
      bookings,
      req,
      page_name,
      course,
      subjectCount,
      chapterCount,
      pdfCount,
      videoCount,
      bookingCount,
      testCount,
      list_url: `/admin/course-booking-list/${courseId}`,
      trashed_list_url: `/admin/course-booking-list/${courseId}?status=trashed`,
      create_url: "/admin/course-booking-create",
    });

  } catch (error) {
    console.error("CourseBooking List Error:", error);
    req.flash("error", "Server error in listing course bookings");
    res.redirect(req.get("Referrer") || "/");
  }
};

module.exports = {
  Create,
  List,
  Edit,
  Update,
  Delete,
  Restore,
  PermanentDelete,
  Show,
  Booking,
};
