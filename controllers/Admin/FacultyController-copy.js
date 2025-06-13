const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");
const { validateRequiredFields } = require("../../helpers/validationsHelper");
const List = async (req, res) => {
  try {
    // Building where condition based on status query parameter
    let where =
      req.query.status === "trashed"
        ? "WHERE faculties.deleted_at IS NOT NULL"
        : "WHERE faculties.deleted_at IS NULL";

    const query = `
      SELECT 
        faculties.*, 
        categories.category_name  
      FROM faculties 
      LEFT JOIN categories ON faculties.category_id = categories.id 
      ${where} 
      ORDER BY faculties.id DESC`;
    const page_name =
      req.query.status === "trashed" ? "Trashed Faculty List" : "Faculty List";

    // Fetching data from MySQL
    const customers = await new Promise((resolve, reject) => {
      pool.query(query, (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });

    // Rendering the list page
    res.render("admin/faculty/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      customers,
      req,
      page_name,
      list_url: "/admin/faculty-list",
      trashed_list_url: "/admin/faculty-list/?status=trashed",
      create_url: "/admin/faculty-create",
    });
  } catch (error) {
    console.error("Faculty List Error:", error);
    req.flash("error", error.message);
    res.redirect(req.get("Referrer") || "/admin/faculty-list");
  }
};

const Create = async (req, res) => {
  try {
    const categories = await getCategoriesFromTable();

    let post = {};

    res.render("admin/faculty/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/faculty-update",
      page_name: "Create Faculty",
      action: "Create",
      post: post,
      categories: categories,
    });
  } catch (error) {
    console.log(error.message);
    req.flash("error", "An error occurred while fetching data.");
    res.redirect("/admin/faculty-list");
  }
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

const fs = require("fs");
const path = require("path");
const checkImagePath = (relativePath) => {
  const normalizedPath = path.normalize(relativePath);

  const fullPath = path.join(__dirname, "..", "public", normalizedPath);

  console.log("Server checking for file at:", fullPath);

  return fs.existsSync(fullPath);
};

const Edit = async (req, res) => {
  try {
    const postId = req.params.postId;

    const getCourseQuery = "SELECT * FROM faculties WHERE id = ?";

    const post = await new Promise((resolve, reject) => {
      pool.query(getCourseQuery, [postId], function (error, result) {
        if (error) {
          req.flash("error", error.message);
          return reject(error);
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

    const imageExists = checkImagePath(post.image);

    res.render("admin/faculty/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      post: post, // Pass the course details to the view
      categories: categories, // Pass the categories for the select dropdown

      form_url: "/admin/faculty-update/" + postId, // URL for the update form
      page_name: "Edit",
      action: "Update",
      image: imageExists
        ? `${post.image}`
        : "admin/images/default-featured-image.png",
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect("back");
  }
};
const Update = async (req, res) => {
  const facultyId = req.params.postId;

  console.log(req.body);
  const isInsert = !facultyId || facultyId === "null" || facultyId === "0";

  const {
    category_id,
    name,
    email,
    phone,
    subject,
    experience,
    teaching_mode,
    short_description,
    description,
    status,
  } = req.body;

  const imageFile = req?.files?.image?.[0];

  // Slug generation (optional)
  let slug = name
    ?.toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  // Validation
  const errors = {};
  if (!category_id?.trim()) errors.category_id = ["Category is required"];
  if (!name?.trim()) errors.name = ["Name is required"];
  if (!email?.trim()) errors.email = ["Email is required"];
  if (!phone?.trim()) errors.phone = ["Phone is required"];
  if (!subject?.trim()) errors.subject = ["Subject is required"];
  if (!experience?.trim()) errors.experience = ["Experience is required"];
  if (!["online", "offline"].includes(teaching_mode))
    errors.teaching_mode = ["Teaching mode must be 'online' or 'offline'"];
  if (!short_description?.trim())
    errors.short_description = ["Short description is required"];
  if (!description?.trim()) errors.description = ["Description is required"];
  if (!["0", "1"].includes(status))
    errors.status = ["Status must be '0' or '1'"];

  if (isInsert && !imageFile) {
    errors.image = ["Faculty image is required"];
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  // Prepare data
  const data = {
    category_id: category_id.trim(),
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    subject: subject.trim(),
    experience: experience.trim(),
    teaching_mode,
    short_description: short_description.trim(),
    description: description.trim(),
    status,
  };

  // Add image path if uploaded
  if (imageFile) {
    data.image = `/uploads/faculty/${imageFile.filename}`;
  }

  try {
    if (isInsert) {
      const fields = Object.keys(data);
      const placeholders = fields.map(() => "?");
      const values = fields.map((key) => data[key]);

      const insertQuery = `INSERT INTO faculties (${fields.join(
        ", "
      )}) VALUES (${placeholders.join(", ")})`;

      pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Insert failed" });
        }
        return res.json({
          success: true,
          redirect_url: "/admin/faculty-list",
          message: "Faculty created successfully",
        });
      });
    } else {
      const fields = Object.keys(data);
      const setClause = fields.map((field) => `${field} = ?`).join(", ");
      const values = fields.map((key) => data[key]);
      values.push(facultyId);

      const updateQuery = `UPDATE faculties SET ${setClause} WHERE id = ?`;

      pool.query(updateQuery, values, (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Update failed" });
        }
        return res.json({
          success: true,
          redirect_url: "/admin/faculty-list",
          message: "Faculty updated successfully",
        });
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const Delete = async (req, res) => {
  try {
    const categorieId = req.params.postId;

    const softDeleteQuery =
      "UPDATE faculties SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Faculty deleted successfully");
    return res.redirect("/admin/faculty-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/faculty-list`);
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
  const facultyId = req.params.postId;

  try {
    const query = `
      SELECT 
        faculties.*, 
        categories.category_name 
      FROM faculties 
      LEFT JOIN categories ON faculties.category_id = categories.id 
      WHERE faculties.id = ? 
      LIMIT 1
    `;

    const faculty = await new Promise((resolve, reject) => {
      pool.query(query, [facultyId], (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        if (result.length === 0) {
          req.flash("error", "Faculty not found");
          return reject(new Error("Faculty not found"));
        }
        resolve(result[0]);
      });
    });

    res.render("admin/faculty/show", {
      success: req.flash("success"),
      error: req.flash("error"),
      faculty,
      req,
      page_name: "Faculty Details",
      back_url: "/admin/faculty-list",
    });
  } catch (error) {
    console.error("Faculty Show Error:", error);
    req.flash("error", error.message);
    res.redirect("/admin/faculty-list");
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
