const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");
const checkImagePathAsync = require("../../utils/checkImagePth");
const { validateRequiredFields } = require("../../helpers/validationsHelper");
const fs = require("fs");
const path = require("path");
const base_url = process.env.BASE_URL;
// List Coupons
const List = async (req, res) => {
  try {
    const where =
      req.query.status === "trashed"
        ? "WHERE coupons.deleted_at IS NOT NULL"
        : "WHERE coupons.deleted_at IS NULL";

    const page_name =
      req.query.status === "trashed" ? "Trashed Coupon List" : "Coupon List";

    const query = `
      SELECT * FROM coupons
      ${where}
      ORDER BY coupons.id DESC
    `;

    const coupons = await new Promise((resolve, reject) => {
      pool.query(query, (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });

    res.render("admin/coupons/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      coupons,
      req,
      page_name,
        list_url: "/admin/coupon-list",
      trashed_list_url: "/admin/coupon-list/?status=trashed",
      create_url: "/admin/coupon-create",
    });
  } catch (error) {
    console.error("Coupon List Error:", error);
    req.flash("error", error.message);
    res.redirect("back");
  }
};

// Create Coupon
const Create = async (req, res) => {
  try {
    res.render("admin/coupons/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/coupon-update",
      page_name: "Create",
      title: "Coupon",
      post: {},
      image: "",
    });
  } catch (error) {
    console.log(error.message);
  }
};

// Edit Coupon
const Edit = async (req, res) => {
  try {
    const couponId = req.params.couponId;
    console.log(couponId); 
    const post = await new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM coupons WHERE id = ?",
        [couponId],
        (error, result) => {
          if (error) {
            req.flash("error", error.message);
            return reject(error);
          }
          if (result.length === 0) {
            req.flash("error", "Coupon not found");
            return reject(new Error("Coupon not found"));
          }
          resolve(result[0]);
        }
      );
    });

    const imageExists = checkImagePath(post.coupon_image); // use post.coupon_image
    
    res.render("admin/coupons/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      post,
    image: `${post.coupon_image}`,
      form_url: "/admin/coupon-update/" + couponId,
      page_name: "Edit",
      title: "Coupon",
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect(req.get("Referrer") || "/"); // fix deprecated redirect
  }
};
const Update = async (req, res) => {
  const couponId = req.params.couponId;
  const body = req.body;
 const isInsert = !couponId || couponId === "null" || couponId === "0";
  console.log(req.body);

  // Destructure and sanitize fields
  const coupon_for = body.coupon_for?.trim();
  const visibility = body.visibility?.trim();
  const coupon_name = body.coupon_name?.trim();
  const coupon_code = body.coupon_code?.trim();
  const begin_date = body.begin_date?.trim();
  const end_date = body.end_date?.trim();
  const coupon_type = body.coupon_type?.trim();
  const coupon_discount = body.coupon_discount?.trim();
  const cart_value = body.cart_value?.trim();
  const coupon_uses = body.coupon_uses?.trim();
  const coupon_description = body.coupon_description?.trim();
  const status = body.status?.trim();
  const imageFile = req?.files?.coupon_image?.[0];
  // Validation
  const errors = {};
  if (!coupon_for) errors.coupon_for = ["Coupon for is required"];
  if (!visibility) errors.visibility = ["Visibility is required"];
  if (!coupon_name) errors.coupon_name = ["Coupon name is required"];
  if (!coupon_code) errors.coupon_code = ["Coupon code is required"];
  if (!begin_date || isNaN(Date.parse(begin_date)))
    errors.begin_date = ["Valid begin date is required"];
  if (!end_date || isNaN(Date.parse(end_date)))
    errors.end_date = ["Valid end date is required"];
  if (!coupon_type) errors.coupon_type = ["Coupon type is required"];
  if (!coupon_discount || isNaN(coupon_discount))
    errors.coupon_discount = ["Discount must be numeric"];
  if (!cart_value || isNaN(cart_value))
    errors.cart_value = ["Cart value must be numeric"];
  if (!coupon_uses || isNaN(coupon_uses))
    errors.coupon_uses = ["Uses must be numeric"];
  if (!coupon_description)
    errors.coupon_description = ["Description is required"];
  if (!["0", "1"].includes(status))
    errors.status = ["Status must be '0' or '1'"];

   if (isInsert) {
    if (!imageFile) errors.image = ["Coupon image is required"];

  }
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0], // First error message
    });
  }

  const data = {
    coupon_for,
    visibility,
    coupon_name,
    coupon_code,
    begin_date,
    end_date,
    coupon_type,
    coupon_discount,
    cart_value,
    coupon_uses,
    coupon_description,
    status,
  };

  try {

      if (imageFile) data.coupon_image = `/uploads/coupons/${imageFile.filename}`;
    if (couponId) {
      // Update query
      const fields = Object.keys(data);
      const values = Object.values(data);
      const setString = fields.map((field) => `${field} = ?`).join(", ");
      values.push(couponId);

      const updateQuery = `UPDATE coupons SET ${setString} WHERE id = ?`;

      pool.query(updateQuery, values, (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Database error" });
        }

        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Coupon not found" });
        }

        return res.json({
          success: true,
          message: "Coupon updated successfully",
        });
      });
    } else {
      // Insert query
      const fields = Object.keys(data);
      const values = Object.values(data);
      const insertQuery = `INSERT INTO coupons (${fields.join(
        ", "
      )}) VALUES (${fields.map(() => "?").join(", ")})`;

      pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error(err);
       
            return res.status(500).json({
  success: false,
  message: "Insert failed",
  error: err.message, // Only message
});
        }

        return res.json({
          success: true,
          redirect_url: "/admin/coupon-list",
          message: "Coupon created successfully",
        });
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



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

// Update Coupon
const Updateee = async (req, res) => {
  const couponId = req.params.couponId;
  const data = req.body;
  const coupon_for = data.coupon_for?.trim();
  const visibility = data.visibility?.trim();
  const coupon_name = data.coupon_name?.trim();
  const coupon_code = data.coupon_code?.trim();
  const begin_date = data.begin_date?.trim();
  const end_date = data.end_date?.trim();
  const coupon_type = data.coupon_type?.trim();
  const coupon_discount = data.coupon_discount?.trim();
  const cart_value = data.cart_value?.trim();
  const coupon_uses = data.coupon_uses?.trim();
  const coupon_description = data.coupon_description?.trim();
  const status = data.status?.trim();

  const errors = {};

  // Required Field Validations
  if (!coupon_for) errors.coupon_for = ["Coupon target is required"];
  if (!visibility) errors.visibility = ["Visibility is required"];
  if (!coupon_name) errors.coupon_name = ["Coupon name is required"];
  if (!coupon_code) errors.coupon_code = ["Coupon code is required"];
  if (!begin_date) errors.begin_date = ["Begin date is required"];
  if (!end_date) errors.end_date = ["End date is required"];
  if (!coupon_type) errors.coupon_type = ["Coupon type is required"];

  if (!coupon_discount) {
    errors.coupon_discount = ["Coupon discount is required"];
  } else if (isNaN(coupon_discount)) {
    errors.coupon_discount = ["Coupon discount must be a number"];
  }

  if (!cart_value) {
    errors.cart_value = ["Cart value is required"];
  } else if (isNaN(cart_value)) {
    errors.cart_value = ["Cart value must be a number"];
  }

  if (!coupon_uses) {
    errors.coupon_uses = ["Coupon uses is required"];
  } else if (isNaN(coupon_uses)) {
    errors.coupon_uses = ["Coupon uses must be a number"];
  }

  // Optional: Validate date logic
  if (begin_date && end_date && new Date(begin_date) > new Date(end_date)) {
    errors.date_range = ["End date must be after begin date"];
  }

  // Optional: Status validation (if you expect only '0' or '1')
  if (status && !["0", "1"].includes(status)) {
    errors.status = ["Status must be '0' or '1'"];
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0], // return the first error message
    });
  }
  try {
    const setClauses = [];
    const fields = [];
    const placeholders = [];
    const values = [];

    // Build fields and values for insert or update
    const finalData = {
      coupon_for,
      visibility,
      coupon_name,
      coupon_code,
      begin_date,
      end_date,
      coupon_type,
      coupon_discount,
      cart_value,
      coupon_uses,
      coupon_description,
      status,
    };

    for (const key in finalData) {
      if (finalData[key] !== undefined && finalData[key] !== null) {
        if (couponId) {
          setClauses.push(`${key} = ?`);
        } else {
          fields.push(key);
          placeholders.push("?");
        }
        values.push(finalData[key]);
      }
    }

    // Handle file if provided
    if (req.files && req.files.coupon_image && req.files.coupon_image[0]) {
      const imageFilename = req.files.coupon_image[0].filename;
      const imagePath = `/uploads/coupons/${imageFilename}`;
      if (couponId) {
        setClauses.push("coupon_image = ?");
      } else {
        fields.push("coupon_image");
        placeholders.push("?");
      }
      values.push(imagePath);
    }

    if (couponId) {
      // Update logic
      values.push(couponId);
      const query = `UPDATE coupons SET ${setClauses.join(", ")} WHERE id = ?`;

      pool.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Coupon not found" });
        }
        return res.json({
          success: true,
          message: "Coupon updated successfully",
          redirect_url: "/admin/coupon-list",
        });
      });
    } else {
      // Insert logic
      const query = `INSERT INTO coupons (${fields.join(
        ", "
      )}) VALUES (${placeholders.join(", ")})`;

      pool.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ message: "Server error" });
        return res.json({
          success: true,
          message: "Coupon created successfully",
          redirect_url: "/admin/coupon-list",
        });
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
// Soft Delete Coupon
const Delete = async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const softDeleteQuery =
      "UPDATE coupons SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [couponId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/coupon-list");
      }
    });

    req.flash("success", "Coupon soft deleted successfully");
    return res.redirect("/admin/coupon-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/coupon-list`);
  }
};

// Restore Coupon
const Restore = async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const restoreQuery = "UPDATE coupons SET deleted_at = null WHERE id = ?";

    pool.query(restoreQuery, [couponId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/coupon-list");
      }
    });

    req.flash("success", "Coupon restored successfully");
    return res.redirect("/admin/coupon-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/coupon-list`);
  }
};

// Permanent Delete Coupon
const PermanentDelete = async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const deleteQuery = "DELETE FROM coupons WHERE id = ?";

    pool.query(deleteQuery, [couponId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/coupon-list");
      }
    });

    req.flash("success", "Coupon deleted permanently");
    return res.redirect("/admin/coupon-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/coupon-list`);
  }
};

const Show = async (req, res) => {
  try {
    const couponId = req.params.couponId;

    const getCouponQuery = "SELECT * FROM coupons WHERE id = ?";
    const coupon = await new Promise((resolve, reject) => {
      pool.query(getCouponQuery, [couponId], function (error, result) {
        if (error) {
          console.error(error);
          req.flash("error", error.message);
          return reject(error);
        }
        resolve(result.length > 0 ? result[0] : null);
      });
    });

    if (!coupon) {
      req.flash("error", "Coupon not found");
      return res.redirect("/admin/coupons");
    }

    // If coupon image doesn't exist, use default image
    coupon.image = coupon.coupon_image
      ? coupon.coupon_image
      : "admin/images/default-featured-image.png";

    res.render("admin/coupons/show", {
      success: req.flash("success"),
      error: req.flash("error"),
      coupon: coupon,
      form_url: "/admin/coupon-update/" + couponId,
      page_name: "Coupon Details",
    });
  } catch (error) {
    console.error(error.message);
    req.flash("error", "Something went wrong");
    return res.redirect("/admin/coupons");
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
