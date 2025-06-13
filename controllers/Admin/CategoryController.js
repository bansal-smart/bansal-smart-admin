const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");
const { validateRequiredFields } = require("../../helpers/validationsHelper");

// List Categories
const List = async (req, res) => {
  try {
    // Determine the filter condition based on status
    const where =
      req.query.status === "trashed"
        ? "WHERE categories.deleted_at IS NOT NULL"
        : "WHERE categories.deleted_at IS NULL";

    const page_name =
      req.query.status === "trashed"
        ? "Trashed Category List"
        : "Category List";

    // Define the SQL query to fetch categories
    const query = `
      SELECT * FROM categories
      ${where}
      ORDER BY categories.created_at DESC
    `;

    // Fetch data from the database
    const categories = await new Promise((resolve, reject) => {
      pool.query(query, (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });
   
    // Render the list view with categories data
    res.render("admin/category/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      categories,
      req,
      page_name,
      list_url : '/admin/category-list',
      trashed_list_url : '/admin/category-list/?status=trashed',
      create_url : '/admin/category-create'
    });
  } catch (error) {
    console.error("Category List Error:", error);
    req.flash("error", error.message);
    res.redirect("back");
  }
};

// Create Category
const Create = async (req, res) => {
  try {
    const categoryId = "";
    res.render("admin/category/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/category-update/" + categoryId, // URL for the update form
      page_name: "Create",
      title: "Category",
      category: {}, // Empty category for creation
    });
  } catch (error) {
    console.log(error.message);
  }
};

// Edit Category
const Edit = async (req, res) => {
  try {
    const categoryId = req.params.categoryId; // Changed name for clarity

    const category = await new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM categories WHERE id = ?",
        [categoryId],
        (error, result) => {
          if (error) {
            req.flash("error", error.message);
            return reject(error);
          }
          if (result.length === 0) {
            req.flash("error", "Category not found");
            return reject(new Error("Category not found"));
          }
          resolve(result[0]); // Ensure result[0] contains category data
        }
      );
    });

    res.render("admin/category/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      category: category,
      form_url: "/admin/category-update/" + categoryId, // URL for the update form
      page_name: "Edit",
      title: "Category",
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect("back");
  }
};

// Update Category
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')         // Replace spaces with -
    .replace(/[^\w\-]+/g, '')     // Remove all non-word chars
    .replace(/\-\-+/g, '-');      // Replace multiple - with single -
};

const Update = async (req, res) => {
  const categoryId = req.params.categoryId;
  let { category_name, category_type, status } = req.body;

  // Trim inputs
  category_name = category_name?.trim();
  category_type = category_type?.trim();

  const errors = {};

  // Validation
  if (!category_name) {
    errors.category_name = ["Category name is required"];
  }

  if (!category_type) {
    errors.category_type = ["Category type is required"];
  }

  if (status !== undefined && status !== null && status !== "") {
    if (!["0", "1"].includes(status.toString())) {
      errors.status = ["Status must be 0 or 1"];
    }
  } else {
    status = "1"; // Default if not provided
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  try {
    const slug = slugify(category_name);

    const data = { category_name, category_type, status, slug };
    const setClauses = [];
    const values = [];

    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        setClauses.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided",
      });
    }

    if (categoryId) {
      // UPDATE
      values.push(categoryId);
      const query = `UPDATE categories SET ${setClauses.join(", ")} WHERE id = ?`;

      pool.query(query, values, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: "Category update failed",
          });
        }

        return res.status(200).json({
          success: true,
          redirect_url: "/admin/category-list",
          message: "Category updated successfully",
        });
      });
    } else {
      // INSERT
      const insertQuery = `INSERT INTO categories (${Object.keys(data).join(", ")}) VALUES (${Object.keys(data).map(() => "?").join(", ")})`;

      pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: "Category creation failed",
          });
        }

        return res.status(200).json({
          success: true,
          redirect_url: "/admin/category-list",
          message: "Category created successfully",
        });
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      errors: [{ message: error.message || 'Unexpected server error' }],
    });
  }
};



// Soft Delete Category
const Delete = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    const softDeleteQuery =
      "UPDATE categories SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [categoryId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/category-list");
      }
    });

    req.flash("success", "Category soft deleted successfully");
    return res.redirect("/admin/category-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/category-list`);
  }
};

// Restore Category
const Restore = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    const restoreQuery = "UPDATE categories SET deleted_at = null WHERE id = ?";

    pool.query(restoreQuery, [categoryId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/category-list");
      }
    });

    req.flash("success", "Category restored successfully");
    return res.redirect("/admin/category-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/category-list`);
  }
};

// Permanent Delete Category
const PermanentDelete = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    const deleteQuery = "DELETE FROM categories WHERE id = ?";

    pool.query(deleteQuery, [categoryId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/category-list");
      }
    });

    req.flash("success", "Category deleted successfully");
    return res.redirect("/admin/category-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/category-list`);
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
};
