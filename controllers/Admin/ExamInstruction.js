// Full CRUD Module for Live Class Management

const pool = require("../../db/database");
const randomstring = require("randomstring");
const Helper = require("../../helpers/Helper");
const jwt = require("jsonwebtoken");
const { validateRequiredFields } = require("../../helpers/validationsHelper");

const handleError = (res, error, context = "Unknown") => {
  console.error(`Error in ${context}:`, error);
  res.status(500).render("admin/error", {
    title: "Server Error",
    page_name: `${module_name} - ${context}`,
    error_message: error.message,
    stack: error.stack,
    full_error: error,
  });
};

const table_name = "exam_instruction";
const folder_path = "exam-instruction";
const module_name = "Exam Instruction";
const module_title = "Exam Instruction";
const route = "exam-instruction";
const actions_url = `/admin/${folder_path}`;
const List = async (req, res) => {
  try {
    const status = req.query.status || "active";
    const examId = req.params.postId || null;

    let where = `WHERE deleted_at IS NULL`;
    const params = [];

    if (status === "trashed") {
      where = `WHERE deleted_at IS NOT NULL`;
    }

    if (examId) {
      where += ` AND exam_id = ?`;
      params.push(examId);
    }

    const query = `
      SELECT 
        id,
        exam_id,
        title,
        description,
        status,
        created_at,
        updated_at,
        deleted_at
      FROM ${table_name}
      ${where}
      ORDER BY id DESC
    `;

    const items = await new Promise((resolve, reject) => {
      pool.query(query, params, (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });

    res.render(`admin/${folder_path}/list`, {
      success: req.flash("success"),
      error: req.flash("error"),
      page_name: `${module_name} List`,
      title: `${module_name} List`,
      module_name:module_name,
      req,
      items,
      route,
      status,
      showTrash: status === "trashed",
      create_url: examId
        ? `/admin/${route}-create/${examId}`
        : `/admin/${route}-create`,
      list_url: examId
        ? `/admin/${route}-list/${examId}`
        : `/admin/${route}-list`,
      trashed_list_url: examId
        ? `/admin/${route}-list/${examId}?status=trashed`
        : `/admin/${route}-list?status=trashed`,
    });
  } catch (error) {
    handleError(res, error, "List");
  }
};

const Create = async (req, res) => {
  try {
    const post = {};

    res.render(`admin/${folder_path}/create`, {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: `${actions_url}-update`, // 🔁 dynamic form action
      page_name: `Create ${module_name}`,
      action: "Create",
      title: `${module_name} Form`,
      post,
     
    });
  } catch (error) {
    handleError(res, error, "Create");
  }
};

const Edit = async (req, res) => {
  try {
    const postId = req.params.postId;

    const getLiveClassQuery = `SELECT * FROM ${table_name} WHERE id = ?`;

    const post = await new Promise((resolve, reject) => {
      pool.query(getLiveClassQuery, [postId], (error, result) => {
        if (error) {
          req.flash("error", error.message);
          return reject(error);
        }
        if (result.length === 0) {
          req.flash("error", `${module_name} not found.`);
          return reject(new Error(`${module_name} not found.`));
        }
        resolve(result[0]);
      });
    });

    res.render(`admin/${folder_path}/create`, {
      success: req.flash("success"),
      error: req.flash("error"),
      post,
      form_url: `${actions_url}-update/${postId}`,
      page_name: `Edit ${module_name}`,
      action: "Update",
      title: module_name,

    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect(req.get("Referrer") || `${actions_url}/list`);
  }
};
const Update = async (req, res) => {
  const postId = req.params.postId;
  const isInsert = !postId || postId === "null" || postId === "0";

  const { exam_id, title, description, status } = req.body;
  const errors = {};

  console.log(req.body);

  // ✅ Basic validation
  //if (!exam_id?.trim()) errors.exam_id = ["Exam ID is required"];
  if (!title?.trim()) errors.title = ["Title is required"];
  if (!description?.trim()) errors.description = ["Description is required"];
  if (!["0", "1"].includes(status)) errors.status = ["Status must be 0 or 1"];

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  try {
    if (isInsert) {
      // ✅ INSERT
      const insertQuery = `
        INSERT INTO ${table_name} (
          exam_id, title, description, status
        ) VALUES (?, ?, ?, ?)
      `;

      pool.query(
        insertQuery,
        [
          exam_id?.trim(),
          title.trim(),
          description?.trim() || "",
          status,
        ],
        (err) => {
          if (err) {
            console.error("Insert Error:", err);
            return res.status(500).json({
              success: false,
              message: "Insert failed",
            });
          }

          return res.json({
            success: true,
            redirect_url: `${actions_url}-list`,
            message: `${module_name} added successfully`,
          });
        }
      );
    } else {
      // ✅ UPDATE
      const updateQuery = `
        UPDATE ${table_name}
        SET exam_id = ?, title = ?, description = ?, status = ?
        WHERE id = ?
      `;

      pool.query(
        updateQuery,
        [
          exam_id?.trim(),
          title.trim(),
          description?.trim() || "",
          status,
          postId,
        ],
        (err) => {
          if (err) {
            console.error("Update Error:", err);
            return res.status(500).json({
              success: false,
              message: "Update failed",
            });
          }

          return res.json({
            success: true,
            redirect_url: `${actions_url}-list`,
            message: `${module_name} updated successfully`,
          });
        }
      );
    }
  } catch (err) {
    console.error("Catch Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const Show = async (req, res) => {
  const postId = req.params.postId;

  try {
    const query = `
      SELECT * FROM ${table_name}
      WHERE id = ?
      LIMIT 1
    `;

    const post = await new Promise((resolve, reject) => {
      pool.query(query, [postId], (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        if (result.length === 0) {
          req.flash("error", `${module_name} not found`);
          return reject(new Error(`${module_name} not found`));
        }
        resolve(result[0]);
      });
    });
    unset(id,exam_id)
    // Dynamically map each column to a label-value pair
    const infoFields = Object.entries(post).map(([key, value]) => ({
      label: key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()), // Format label
      value: value,
    }));

    res.render(`admin/${folder_path}/show`, {
      success: req.flash("success"),
      error: req.flash("error"),
      post,
      req,
      page_name: `${module_name} Details`,
      back_url: `${actions_url}/list`,
      title: `${module_name} Details`,
      route,
      module_name,
      infoFields,
    });
  } catch (error) {
    console.error(`${module_name} Show Error:`, error);
    req.flash("error", error.message);
    res.redirect(`${actions_url}/list`);
  }
};


const Delete = async (req, res) => {
  await Helper.handleTableAction({
    req,
    res,
    action: "soft-delete",
    table_name,
    redirectUrl: `${actions_url}-list`,
    title: module_title,
  });
};

// Restore
const Restore = async (req, res) => {
  await Helper.handleTableAction({
    req,
    res,
    action: "restore",
    table_name,
    redirectUrl: `${actions_url}-list`,
    title: module_title,
  });
};

// Permanent Delete
const PermanentDelete = async (req, res) => {
  await Helper.handleTableAction({
    req,
    res,
    action: "delete",
    table_name,
    redirectUrl: `${actions_url}-list`,
    title: module_title,
  });
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
