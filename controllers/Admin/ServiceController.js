const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");
const checkImagePathAsync = require("../../utils/checkImagePth");
const { validateRequiredFields } = require("../../helpers/validationsHelper");

// List services
const List = async (req, res) => {
  try {
    // Determine the filter condition based on status
    const where =
      req.query.status === "trashed"
        ? "WHERE services.deleted_at IS NOT NULL"
        : "WHERE services.deleted_at IS NULL";

    const page_name =
      req.query.status === "trashed" ? "Trashed Service List" : "Service List";

    // Define the SQL query to fetch services
    const query = `
      SELECT * FROM services
      ${where}
      ORDER BY services.created_at DESC
    `;

    // Fetch data from the database
    const services = await new Promise((resolve, reject) => {
      pool.query(query, (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });

    // Render the list view with services data
    res.render("admin/service/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      services,
      req,
      page_name,
      list_url: "/admin/service-list",
      trashed_list_url: "/admin/service-list/?status=trashed",
      create_url: "/admin/service-create",
    });
  } catch (error) {
    console.error("Service List Error:", error);
    req.flash("error", error.message);
    res.redirect("back");
  }
};

// Create Service
const Create = async (req, res) => {
  try {
    res.render("admin/service/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/service-update",
      page_name: "Create",
      action: "Create",
      title: "Service",
      post: {}, // Empty Service for creation
      image: "",
    });
  } catch (error) {
    console.log(error.message);
  }
};

// Edit Service
const Edit = async (req, res) => {
  try {
    const serviceId = req.params.serviceId; // Changed name for clarity

    const post = await new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM services WHERE id = ?",
        [serviceId],
        (error, result) => {
          if (error) {
            req.flash("error", error.message);
            return reject(error);
          }
          if (result.length === 0) {
            req.flash("error", "Service not found");
            return reject(new Error("Service not found"));
          }
          resolve(result[0]); // Ensure result[0] contains Service data
        }
      );
    });

    const imageExists = await checkImagePathAsync(post.image);

    res.render("admin/service/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      post: post || {}, // Make sure post is defined, even if empty
      image: imageExists
        ? post.image
        : "admin/images/default-featured-image.png",
      form_url: "/admin/service-update/" + serviceId,
      page_name: "Edit",
      action: "Update",
      title: "Service",
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect("back");
  }
};

const fs = require("fs");
const path = require("path");
const checkImagePath = (relativePath) => {
  const normalizedPath = path.normalize(relativePath);

  // Get the absolute path from the project root (where the 'public' folder is located)
  const fullPath = path.join(__dirname, "..", "public", normalizedPath);

  console.log("Server checking for file at:", fullPath); // For debugging

  // Check if the file exists on the server
  return fs.existsSync(fullPath);
};

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const Update = async (req, res) => {
  const serviceId = req.params.serviceId;
  const data = req.body;

  const title = data.title?.trim();
  const slug = slugify(title || ""); // Slugify the title
  const service_type = data.service_type?.trim();
  const status = data.status?.trim();
  const imageFile = req.files?.image?.[0];

  const errors = {};

  // Required validations
  if (!title) errors.title = ["Title is required"];
  if (!service_type) errors.service_type = ["Service type is required"];

  // Optional status validation
  if (status && !["0", "1"].includes(status)) {
    errors.status = ["Status must be '0' or '1'"];
  }

  // Image validation for create
  if (!serviceId && !imageFile) {
    errors.image = ["Image is required"];
  }

  // Validate image file type and size
  if (imageFile) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxFileSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(imageFile.mimetype)) {
      errors.image = ["Only JPG, PNG, or WEBP images are allowed"];
    }

    if (imageFile.size > maxFileSize) {
      errors.image = ["Image size must be under 2MB"];
    }
  }

  // Return validation errors
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  try {
    // Check if the title already exists
    const checkQuery = `SELECT id FROM services WHERE title = ? ${
      serviceId ? "AND id != ?" : ""
    } AND deleted_at = 0`;

    const checkParams = serviceId ? [title, serviceId] : [title];

    pool.query(checkQuery, checkParams, (err, results) => {
      if (err) return res.status(500).json({ message: "Server error" });

      if (results.length > 0) {
        return res.status(422).json({
          success: false,
          errors: { title: ["Title already exists"] },
          message: "Title already exists",
        });
      }

      const fields = [];
      const placeholders = [];
      const values = [];
      const setClauses = [];

      const finalData = { title, service_type, status, slug }; // Add slug to final data

      // Prepare SQL fields for update or insert
      for (const key in finalData) {
        if (finalData[key] != null) {
          if (serviceId) {
            setClauses.push(`${key} = ?`);
          } else {
            fields.push(key);
            placeholders.push("?");
          }
          values.push(finalData[key]);
        }
      }

      // Handle image for create or update
      if (imageFile) {
        const imagePath = `/uploads/service/${imageFile.filename}`;
        if (serviceId) {
          setClauses.push("image = ?");
        } else {
          fields.push("image");
          placeholders.push("?");
        }
        values.push(imagePath);
      } else if (serviceId && data.image?.trim()) {
        // Use existing image path for update
        setClauses.push("image = ?");
        values.push(data.image.trim());
      }

      // Execute query for update or insert
      if (serviceId) {
        // Update logic
        if (setClauses.length === 0) {
          return res.status(400).json({ message: "Nothing to update" });
        }

        values.push(serviceId);
        const updateQuery = `UPDATE services SET ${setClauses.join(
          ", "
        )} WHERE id = ?`;

        pool.query(updateQuery, values, (err, result) => {
          if (err) return res.status(500).json({ message: "Server error" });
          if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Service not found" });
          }
          return res.json({
            success: true,
            message: "Service updated successfully",
            redirect_url: "/admin/service-list",
          });
        });
      } else {
        // Insert logic
        const insertQuery = `INSERT INTO services (${fields.join(
          ", "
        )}) VALUES (${placeholders.join(", ")})`;

        pool.query(insertQuery, values, (err, result) => {
          if (err) return res.status(500).json({ message: "Server error" });
          return res.json({
            success: true,
            message: "Service created successfully",
            redirect_url: "/admin/service-list",
            service_id: result.insertId,
          });
        });
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

const Updatew = async (req, res) => {
  const serviceId = req.params.serviceId;
  const data = req.body;
  console.log(data);

  try {
    const post = await new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM services WHERE id = ?",
        [serviceId],
        (error, result) => {
          if (error) {
            req.flash("error", error.message);
            return reject(error);
          }
          if (result.length === 0) {
            req.flash("error", "Service not found");
            return reject(new Error("Service not found"));
          }
          resolve(result[0]); // Ensure result[0] contains Service data
        }
      );
    });

    const setClauses = [];
    const values = [];

    // Add body fields to update
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        setClauses.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (req.files && req.files.image && req.files.image[0]) {
      // const imageExists = await checkImagePathAsync(post.image);

      // if (imageExists) {
      //   // Construct full path of the old image
      //   const oldImageFullPath = path.join(__dirname, '..', 'public', post.image); // Adjust based on structure
      //   try {
      //     await fs.unlink(oldImageFullPath);
      //     console.log('Old image deleted:', oldImageFullPath);
      //   } catch (err) {
      //     console.error('Error deleting old image:', err.message);
      //   }
      // }
      const imageFilename = req.files.image[0].filename;
      const imagePath = `/public/uploads/service/${imageFilename}`; // Save full path
      setClauses.push(`image = ?`);
      values.push(imagePath);
    }
    if (setClauses.length === 0) {
      return res.status(400).json({ message: "No valid fields to update." });
    }

    values.push(serviceId); // For WHERE clause

    const query = `UPDATE services SET ${setClauses.join(", ")} WHERE id = ?`;

    pool.query(query, values, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.json({
        success: true,
        message: "Service updated successfully",
        data: {
          ...data,
          image: req.files?.image?.[0]?.filename || undefined,
        },
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Soft Delete Service
const Delete = async (req, res) => {
  try {
    const serviceId = req.params.serviceId;

    const softDeleteQuery =
      "UPDATE services SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [serviceId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/service-list");
      }
    });

    req.flash("success", "Service soft deleted successfully");
    return res.redirect("/admin/service-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/service-list`);
  }
};

// Restore Service
const Restore = async (req, res) => {
  try {
    const serviceId = req.params.serviceId;

    const restoreQuery = "UPDATE services SET deleted_at = null WHERE id = ?";

    pool.query(restoreQuery, [serviceId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/service-list");
      }
    });

    req.flash("success", "Service restored successfully");
    return res.redirect("/admin/service-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/service-list`);
  }
};

// Permanent Delete Service
const PermanentDelete = async (req, res) => {
  try {
    const serviceId = req.params.serviceId;

    const deleteQuery = "DELETE FROM services WHERE id = ?";

    pool.query(deleteQuery, [serviceId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/service-list");
      }
    });

    req.flash("success", "Service deleted successfully");
    return res.redirect("/admin/service-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/service-list`);
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
