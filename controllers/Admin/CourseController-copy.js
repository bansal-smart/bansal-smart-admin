const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");

const { validateRequiredFields } = require("../../helpers/validationsHelper");
const List = async (req, res) => {
  try {
    let where =
      req.query.status === "trashed"
        ? "WHERE courses.deleted_at IS NOT NULL"
        : "WHERE courses.deleted_at IS NULL";

    const query = `${withCategory()} ${where} ORDER BY courses.id DESC`;
    const page_name =
      req.query.status === "trashed" ? "Trashed Course List" : "Course List";

    const customers = await new Promise((resolve, reject) => {
      pool.query(query, (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });

    res.render("admin/course/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      customers,
      req,
      page_name,
      list_url: "/admin/course-list",
      trashed_list_url: "/admin/course-list/?status=trashed",
      create_url: "/admin/course-create",
    });
  } catch (error) {
    console.error("Course List Error:", error);
    req.flash("error", error.message);
    res.redirect("back");
  }
};

const withCategory = () => `
  SELECT courses.*, categories.category_name
  FROM courses
  LEFT JOIN categories ON courses.category_id = categories.id
`;
const Create = async (req, res) => {
  try {
    const visibility = ["featured", "up_comming"]; // Corrected 'visibility' initialization
    const services = await getServicesFromTable(); // Fetch data from services_table
    const categories = await getCategoriesFromTable(); // Fetch data from services_table
    const course_classes = await getCourseClassesFromTable(); // Fetch data from services_table

    res.render("admin/course/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      visibility, // Pass the visibility array
      form_url: "/admin/course-update",
      page_name: "Create Course",
      services: services,
      course: [],
      categories: categories,
      course_classes,
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
    data.slug = data.title_heading
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

  console.log("Server checking for file at:", fullPath); // For debugging

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

    const getCategoriesQuery = "SELECT * FROM categories";
    const categories = await new Promise((resolve, reject) => {
      pool.query(getCategoriesQuery, function (error, result) {
        if (error) {
          req.flash("error", error.message);
          return reject(error);
        }
        resolve(result);
      });
    });

    // Fetch course classes from the database
    const getCourseClassesQuery = "SELECT * FROM course_classes";
    const course_classes = await new Promise((resolve, reject) => {
      pool.query(getCourseClassesQuery, function (error, result) {
        if (error) {
          req.flash("error", error.message);
          return reject(error);
        }
        resolve(result);
      });
    });

    const imageExists = checkImagePath(course.image);
    const detailsImageExists = checkImagePath(course.details_image);
    if (detailsImageExists) {
      console.log("✅ File exists in public.");
    } else {
      console.log("❌ File does not exist.");
    }
    // Render the view with the course, categories, and course_classes data
    course.teacher_ids =
      course.teacher_id?.split(",").map((id) => parseInt(id)) || [];

    res.render("admin/course/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      course: course, // Pass the course details to the view
      categories: categories, // Pass the categories for the select dropdown
      course_classes: course_classes, // Pass the course classes for the select dropdown
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
  } = req.body;

  const imageFile = req?.files?.image?.[0];
  const detailsImageFile = req?.files?.details_image?.[0];
  const brochureFile = req?.files?.brochure?.[0];

  // Slug generation
  let slug = inputSlug?.trim();
  if (!slug && title_heading) {
    slug = title_heading
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  // Validation
  const errors = {};
  if (!category_id?.trim()) errors.category_id = ["Category ID is required"];
  if (!course_class_id?.trim())
    errors.course_class_id = ["Course Class ID is required"];
  if (!course_name?.trim()) errors.course_name = ["Course name is required"];
  if (!title_heading?.trim())
    errors.title_heading = ["Title heading is required"];
  if (!slug) errors.slug = ["Slug is required"];
  if (!["free", "paid"].includes(course_type))
    errors.course_type = ["Course type must be 'free' or 'paid'"];
  if (course_type === "paid" && (!price || isNaN(price)))
    errors.price = ["Price is required and must be a number"];
  if (!discount_type?.trim())
    errors.discount_type = ["Discount type is required"];
  if (discount && isNaN(discount))
    errors.discount = ["Discount must be numeric"];
  if (!duration || isNaN(duration))
    errors.duration = ["Duration is required and must be numeric"];
  if (!content?.trim()) errors.content = ["Content is required"];
  if (!description?.trim()) errors.description = ["Description is required"];
  if (!start_time || isNaN(Date.parse(start_time)))
    errors.start_time = ["Valid start time is required"];
  if (!["0", "1"].includes(status))
    errors.status = ["Status must be '0' or '1'"];

  if (isInsert) {
    if (!imageFile) errors.image = ["Course image is required"];
    if (!detailsImageFile) errors.details_image = ["Details image is required"];
    if (!brochureFile) errors.brochure = ["Brochure file is required"];
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  // Calculate offer price
  let offer_price = 0;
  const parsedPrice = parseFloat(price);
  const parsedDiscount = parseFloat(discount);
  if (course_type === "paid" && !isNaN(parsedPrice)) {
    if (discount_type === "percentage" && !isNaN(parsedDiscount)) {
      offer_price = parsedPrice - (parsedPrice * parsedDiscount) / 100;
    } else if (discount_type === "amount" && !isNaN(parsedDiscount)) {
      offer_price = parsedPrice - parsedDiscount;
    } else {
      offer_price = parsedPrice;
    }
    if (offer_price < 0) offer_price = 0;
  }

  // Prepare data object
  const data = {
    category_id: category_id.trim(),
    course_class_id: course_class_id.trim(),
    course_name: course_name.trim(),
    title_heading: title_heading.trim(),
    slug,
    course_type,
    price,
    discount_type,
    discount,
    duration,
    content,
    description,
    start_time,
    status,
    course_visibility: Array.isArray(course_visibility)
      ? course_visibility.join(",")
      : "",
    service_id: Array.isArray(service_id) ? service_id.join(",") : "",
    teacher_id: Array.isArray(teacher_id) ? teacher_id.join(",") : "",
    video,
    seo_title,
    seo_description,
    mode_of_class,
    meeting_link,
    offer_price,
  };

  // Handle uploaded files
  if (imageFile) {
    data.image = path.join("/public/uploads/courses", imageFile.filename);
  }
  if (detailsImageFile) {
    data.details_image = path.join(
      "/public/uploads/courses",
      detailsImageFile.filename
    );
  }
  if (brochureFile) {
    data.brochure = path.join("/public/uploads/courses", brochureFile.filename);
  }

  try {
    const fields = Object.keys(data);
    const values = Object.values(data);

    if (isInsert) {
      const insertQuery = `INSERT INTO courses (${fields.join(
        ", "
      )}) VALUES (${fields.map(() => "?").join(", ")})`;
      pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Insert failed" });
        }
        return res.json({
          success: true,
          message: "Course created successfully",
        });
      });
    } else {
      const updateQuery = `UPDATE courses SET ${fields
        .map((field) => `${field} = ?`)
        .join(", ")} WHERE id = ?`;
      values.push(courseId);
      pool.query(updateQuery, values, (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Database error" });
        }
        // if (result.affectedRows === 0) {
        //   return res
        //     .status(404)
        //     .json({ success: false, message: "Course not found" });
        // }
        return res.json({
          success: true,
          message: "Course updated successfully",
        });
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const Updatess = async (req, res) => {
  const courseId = req.params.courseId;
  const data = req.body;

  console.log(data);

  try {
    if (!courseId || (!data && !req.files)) {
      return res
        .status(400)
        .json({ message: "Missing courseId or data to update." });
    }

    // ✅ Handle uploaded files and update data object
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        data.image = path.join(
          "/public/uploads/courses",
          req.files.image[0].filename
        );
      }
      if (req.files.details_image && req.files.details_image[0]) {
        data.details_image = path.join(
          "uploads/course",
          req.files.details_image[0].filename
        );
      }
    }

    const setClauses = [];
    const values = [];

    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        if (Array.isArray(data[key])) {
          setClauses.push(`${key} = ?`);
          values.push(data[key].join(","));
        } else {
          setClauses.push(`${key} = ?`);
          values.push(data[key]);
        }
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ message: "No valid fields to update." });
    }

    values.push(courseId); // WHERE clause

    const query = `UPDATE courses SET ${setClauses.join(", ")} WHERE id = ?`;

    pool.query(query, values, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.json({ message: "Course updated successfully", data: data });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const Delete = async (req, res) => {
  try {
    const categorieId = req.params.categorieId;

    const softDeleteQuery =
      "UPDATE customers SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Customer soft deleted successfully");
    return res.redirect("/admin/categorie-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/categorie-list`);
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
    const customerId = req.params.customerId;

    const getCustomerQuery = "SELECT * FROM customers WHERE id = ?";
    const customer = await new Promise((resolve, reject) => {
      pool.query(getCustomerQuery, [customerId], function (error, result) {
        if (error) {
          console.error(error);
          req.flash("error", error.message);
          reject(error);
        } else {
          resolve(result[0]);
        }
      });
    });

    res.render("admin/course/show", {
      success: req.flash("success"),
      error: req.flash("error"),
      customer: customer,
      form_url: "/admin/customer-update/" + customerId,
      page_name: "Show",
    });
  } catch (error) {
    console.log(error.message);
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
};
