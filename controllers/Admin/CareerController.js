const pool = require("../../db/database");
const randomstring = require("randomstring");
const Helper = require("../../helpers/Helper");
const jwt = require("jsonwebtoken");
const slugify = require("slugify"); // npm install slugify
const { validateRequiredFields } = require("../../helpers/validationsHelper");

const table_name = "faculty_trainings";
const folder_path = "career";
const module_name = "Faculty Training";
const route = "career";
const actions_url = `/admin/${folder_path}`;

const runQuery = (query, params = []) =>
  new Promise((resolve, reject) => {
    pool.query(query, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

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

const List = async (req, res) => {
  const type = req.params.type; // "active", "inactive", or "trashed"
  const filters = [];

  try {
    // Build filter conditions
    if (type === "trashed") {
      filters.push(`ft.deleted_at IS NOT NULL`);
    } else {
      filters.push(`ft.deleted_at IS NULL`);
      if (type === "active") {
        filters.push(`ft.status = 1`);
      } else if (type === "inactive") {
        filters.push(`ft.status = 0`);
      }
    }

    // Build WHERE clause
    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const query = `
      SELECT ft.*, 
        (
          SELECT COUNT(*) 
          FROM faculty_training_requests ftr 
          WHERE ftr.training_id = ft.id AND ftr.deleted_at IS NULL
        ) AS request_count
      FROM ${table_name} ft
      ${whereClause}
      ORDER BY ft.id DESC
    `;

    const items = await runQuery(query);

    const page_name =
      type === "trashed"
        ? `Trashed ${module_name} List`
        : `${module_name} List`;

    res.render(`admin/${folder_path}/list`, {
      success: req.flash("success"),
      error: req.flash("error"),
      items,
      req,
      page_name,
      route,
      type,
      list_url: `/admin/${route}-list`,
      trashed_list_url: `/admin/${route}-list/trashed`,
      create_url: `/admin/${route}-create`,
    });
  } catch (error) {
    handleError(res, error, "List");
  }
};
const Create = async (req, res) => {
  try {
    res.render(`admin/${folder_path}/create`, {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: `/admin/${route}-update`,
      page_name: `Create ${module_name}`,
      post: {},
    });
  } catch (error) {
    handleError(res, error, "Create");
  }
};

const Edit = async (req, res) => {
  try {
    const postId = req.params.postId;
    const result = await runQuery(`SELECT * FROM ${table_name} WHERE id = ?`, [postId]);

    if (result.length === 0) {
      req.flash("error", `${module_name} not found`);
      return res.redirect(`/admin/${folder_path}-list`);
    }

    const post = result[0];

    res.render(`admin/${folder_path}/create`, {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: `/admin/${route}-update/${postId}`,
      page_name: `Edit ${module_name}`,
      post,
    });
  } catch (error) {
    handleError(res, error, "Edit");
  }
};

const Update = async (req, res) => {
  const postId = req.params.postId;
  const isInsert = !postId || postId === "null" || postId === "0";

  // Extract form data
  const {
    title,
    description,
    status,
    training_code,
    apply_date,
    no_of_positions,
  } = req.body;

  // Generate slug from title
  const slug = slugify(title?.trim() || "", { lower: true, strict: true });

  // Validate inputs
  const errors = {};
  if (!title?.trim()) errors.title = ["Title is required"];
  if (!description?.trim()) errors.description = ["Description is required"];
  if (!training_code?.trim()) errors.training_code = ["Training code is required"];
  if (!apply_date) errors.apply_date = ["Apply date is required"];
  if (!no_of_positions) errors.no_of_positions = ["No. of positions is required"];

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  // Prepare data for insert/update
  const data = {
    title: title.trim(),
    slug,
    description: description.trim(),
    status: status || 0,
    training_code: training_code.trim(),
    apply_date,
    no_of_positions: parseInt(no_of_positions),
  };

  try {
    const fields = Object.keys(data);
    const values = Object.values(data);

    if (isInsert) {
      const insertQuery = `INSERT INTO ${table_name} (${fields.join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`;
      pool.query(insertQuery, values, (err, result) => {
        if (err) return handleError(res, err, "Insert");
        return res.json({
          success: true,
          redirect_url: `/admin/${route}-list`,
          message: `${module_name} created successfully`,
        });
      });
    } else {
      const updateQuery = `UPDATE ${table_name} SET ${fields.map(f => `${f} = ?`).join(", ")} WHERE id = ?`;
      values.push(postId);
      pool.query(updateQuery, values, (err, result) => {
        if (err) return handleError(res, err, "Update");
        return res.json({
          success: true,
          redirect_url: `/admin/${route}-list`,
          message: `${module_name} updated successfully`,
        });
      });
    }
  } catch (error) {
    handleError(res, error, "Update Catch");
  }
};
const Show = async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await runQuery(`SELECT * FROM ${table_name} WHERE id = ?`, [postId]);
    
    if (post.length === 0) {
      req.flash("error", `${module_name} not found`);
      return res.redirect(`/admin/${folder_path}-list`);
    }
     const requestQuery = `
      SELECT * FROM faculty_training_requests 
      WHERE training_id = ? AND deleted_at IS NULL 
      ORDER BY id DESC
    `;
    const requestList = await runQuery(requestQuery, [postId]);
    res.render(`admin/${folder_path}/show`, {
      success: req.flash("success"),
      error: req.flash("error"),
      post: post[0],
      requestList,
      list_url: `/admin/${folder_path}-list`,
      page_name: `${module_name} Details`,
    });
  } catch (error) {
    handleError(res, error, "Show");
  }
};

const Delete = async (req, res) => {
  try {
    await Helper.handleTableAction({
      req,
      res,
      action: "soft-delete",
      table_name,
      redirectUrl: `${actions_url}-list`,
      title: module_name,
    });
  } catch (error) {
    handleError(res, error, "Delete");
  }
};

const Restore = async (req, res) => {
  try {
    await Helper.handleTableAction({
      req,
      res,
      action: "restore",
      table_name,
      redirectUrl: `${actions_url}-list`,
      title: module_name,
    });
  } catch (error) {
    handleError(res, error, "Restore");
  }
};

const PermanentDelete = async (req, res) => {
  try {
    await Helper.handleTableAction({
      req,
      res,
      action: "delete",
      table_name,
      redirectUrl: `${actions_url}-list`,
      title: module_name,
    });
  } catch (error) {
    handleError(res, error, "Permanent Delete");
  }
};

module.exports = {
  List,
  Create,
  Edit,
  Update,
  Delete,
  Restore,
  PermanentDelete,
  Show,
};
