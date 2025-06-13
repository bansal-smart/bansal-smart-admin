const pool = require("../../db/database");
const randomstring = require("randomstring");
const Helper = require("../../helpers/Helper");
const mammoth = require("mammoth");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { parseDocument, DomUtils } = require('htmlparser2');
const sanitizeHtml = require('sanitize-html');
const { validateRequiredFields } = require("../../helpers/validationsHelper");
const List = async (req, res) => {
  try {
    const where =
      req.query.status === "trashed"
        ? "WHERE `live_test`.deleted_at IS NOT NULL"
        : "WHERE `live_test`.deleted_at IS NULL";

    const query = `${withCategory()} ${where} ORDER BY \`live_test\`.id DESC`;

    const page_name =
      req.query.status === "trashed"
        ? "Trashed Live Test  List"
        : "Live Test List";

    const customers = await new Promise((resolve, reject) => {
      pool.query(query, (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });

    res.render("admin/live-test/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      customers,
      req,
      page_name,
      list_url: "/admin/live-test-list",
      trashed_list_url: "/admin/live-test-list/?status=trashed",
      create_url: "/admin/live-test-create",
    });
  } catch (error) {
    console.error("live-test List Error:", error);
    req.flash("error", error.message);
    // res.redirect("back");
  }
};

const withCategory = () => `
  SELECT \`live_test\`.*, categories.category_name
  FROM \`live_test\`
  LEFT JOIN categories ON \`live_test\`.category_id = categories.id
`;

const Create = async (req, res) => {
  try {
    const categories = await getCategoriesFromTable(); // Fetch data from services_table

    const courses = await Helper.getActiveCourses(); // Fetch data from services_table

    res.render("admin/live-test/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/live-test-update",
      page_name: "Create Test Series",

      post: {}, // ✅ Pass an empty object if not editing
      categories: categories,
      courses: courses,
      action: "Create",
    });
  } catch (error) {
    console.log(error.message);
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



const checkImagePath = (relativePath) => {
  const normalizedPath = path.normalize(relativePath);
  const fullPath = path.join(__dirname, "..", "public", normalizedPath);
  return fs.existsSync(fullPath);
};

// Helper to run SQL queries
const runQuery = (query, params = []) =>
  new Promise((resolve, reject) => {
    pool.query(query, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

const Edit = async (req, res) => {
  try {
    const courseId = req.params.postId;

    // Fetch course
    const courseResult = await runQuery(
      "SELECT * FROM `live_test` WHERE id = ?",
      [courseId]
    );

    const course = courseResult[0];
    console.log(course);
    // Fetch categories and course classes
    const categories = await Helper.getActiveCategoriesByType();

    // Check image existence
    // const imageExists = checkImagePath(course.banner);
    const courses = await Helper.getActiveCourses(); // Fetch data from services_table
    res.render("admin/live-test/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      post: course,
      categories,
      courses,
      form_url: "/admin/live-test-update/" + courseId,
      page_name: "Edit",
      // image: imageExists
      //   ? course.banner
      //   : "admin/images/default-featured-image.png",
      action: "Update",
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect(req.get("referer") || "/admin/live-test-list");
  }
};
const Update = async (req, res) => {
  const courseId = req.params.postId;

  console.log(courseId);
  const isInsert = !courseId || courseId === "null" || courseId === "0";

  const {
    category_id = "",
    course_id = "",
    test_name = "",
    test_type = "free",
    price,
    discount_type,
    discount,
    duration,
    test_location = "live",
    test_pattern = "mcq",
    start_time = "",
    end_time = "",
    no_of_question = "0",
    maximum_marks,
    instruction,
  } = req.body;

  const imageFile = req?.files?.banner?.[0];

  const errors = {};

  if (!category_id.trim()) errors.category_id = ["Category ID is required"];
  if (!course_id.trim()) errors.course_id = ["Course ID is required"];
  if (!test_name.trim()) errors.test_name = ["Test name is required"];
  if (!["free", "paid"].includes(test_type))
    errors.test_type = ["Test type must be 'free' or 'paid'"];
  if (!start_time.trim()) errors.start_time = ["Start time is required"];
  if (!end_time.trim()) errors.end_time = ["End time is required"];
  // if (!maximum_marks || isNaN(maximum_marks)) errors.maximum_marks = ["Maximum marks must be a number"];
  // if (!duration || isNaN(duration)) errors.duration = ["Duration must be a number"];

  if (test_type === "paid") {
    if (!price || isNaN(price))
      errors.price = ["Price is required and must be a number"];
    if (!discount_type?.trim())
      errors.discount_type = ["Discount type is required"];
    if (discount && isNaN(discount))
      errors.discount = ["Discount must be numeric"];
  }

  if (isInsert) {
    if (!imageFile) errors.banner = ["Course image is required"];
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
  const parsedPrice = parseFloat(price || 0);
  const parsedDiscount = parseFloat(discount || 0);

  if (test_type === "paid" && !isNaN(parsedPrice)) {
    if (discount_type === "percentage" && !isNaN(parsedDiscount)) {
      offer_price = parsedPrice - (parsedPrice * parsedDiscount) / 100;
    } else if (discount_type === "price" && !isNaN(parsedDiscount)) {
      offer_price = parsedPrice - parsedDiscount;
    } else {
      offer_price = parsedPrice;
    }
    if (offer_price < 0) offer_price = 0;
  }

  const data = {
    category_id: category_id.trim(),
    course_id: course_id.trim(),
    test_name: test_name.trim(),
    test_type,
    price: test_type === "free" ? 0 : parsedPrice,
    discount_type: test_type === "free" ? "" : discount_type,
    discount: test_type === "free" ? 0 : parsedDiscount,
    duration,
    test_location,
    test_pattern,
    start_time,
    end_time,
    no_of_question,
    maximum_marks,
    instruction,
    offer_price,
  };

  if (imageFile) {
    data.banner = path.join("/uploads/live-test", imageFile.filename);
  }

  try {
    const fields = Object.keys(data);
    const values = Object.values(data);

    if (isInsert) {
      const insertQuery = `INSERT INTO \`live_test\` (${fields.join(
        ", "
      )}) VALUES (${fields.map(() => "?").join(", ")})`;
      pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error("Insert error:", err);
          return res
            .status(500)
            .json({ success: false, message: "Insert failed" });
        }
        return res.json({
          success: true,
          redirect_url: "/admin/live-test-list",
          message: "Live test created successfully",
        });
      });
    } else {
      const updateQuery = `UPDATE \`live_test\` SET ${fields
        .map((field) => `${field} = ?`)
        .join(", ")} WHERE id = ?`;
      values.push(courseId);
      pool.query(updateQuery, values, (err, result) => {
        if (err) {
          console.error("Update error:", err);
          return res
            .status(500)
            .json({ success: false, message: "Update failed" });
        }
        return res.json({
          success: true,
          redirect_url: "/admin/live-test-list",
          message: "Live test updated successfully",
        });
      });
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const Delete = async (req, res) => {
  try {
    const testSeriesId = req.params.postId;

    const softDeleteQuery =
      "UPDATE `live_test` SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [testSeriesId], (error, result) => {
      if (error) {
        console.error("Soft delete error:", error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/live-test-list");
      }

      req.flash("success", "Test Series soft deleted successfully");
      return res.redirect("/admin/live-test-list");
    });
  } catch (error) {
    console.error("Delete route error:", error.message);
    req.flash("error", "Unexpected error occurred");
    return res.redirect("/admin/live-test-list");
  }
};

const Restore = async (req, res) => {
  try {
    const categorieId = req.params.postId;

    const RestoreQuery = "UPDATE live_test SET deleted_at = null WHERE id = ?";

    pool.query(RestoreQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Test Series Restored successfully");
    return res.redirect("/admin/live-test-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/live-test-list`);
  }
};

const PermanentDelete = async (req, res) => {
  try {
    const categorieId = req.params.categorieId;

    const DeleteQuery = "DELETE FROM live_test WHERE id = ?";

    pool.query(DeleteQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Customer deleted successfully");
    return res.redirect("/admin/live-test-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/live-test-list`);
  }
};

const Show = async (req, res) => {
  try {
    const postId = req.params.postId;

    const query = `
  SELECT 
    ts.*, 
    c.category_name, 
    co.course_name
  FROM 
    \`live_test\` ts
  LEFT JOIN 
    categories c ON ts.category_id = c.id
  LEFT JOIN 
    courses co ON ts.course_id = co.id
  WHERE 
    ts.id = ?
`;
    const post = await new Promise((resolve, reject) => {
      pool.query(query, [postId], (error, result) => {
        if (error) {
          console.error("Database Error:", error);
          req.flash("error", "Failed to fetch test series");
          return reject(error);
        }
        if (result.length === 0) {
          req.flash("error", "Test series not found");
          return reject(new Error("Not found"));
        }
        resolve(result[0]);
      });
    });
    post.start_time = await Helper.formatDate(post.start_time);
    post.end_time = await Helper.formatDate(post.end_time);

    console.log(post);
    res.render("admin/live-test/show", {
      success: req.flash("success"),
      error: req.flash("error"),
      post: post, // still using `customer` for compatibility with view
      form_url: `/admin/live-test-update/${postId}`,
      page_name: "Test Series Detials",
    });
  } catch (error) {
    console.error("Show Error:", error.message);
    req.flash("error", "An unexpected error occurred");
    res.redirect("back");
  }
};

const mammothOptions = {
  convertImage: mammoth.images.inline(async image => {
    const buffer = await image.read('base64');
    return { src: `data:${image.contentType};base64,${buffer}` };
  })
};

const cleanHTML = html => sanitizeHtml(html, {
  allowedTags: [ 'p', 'b', 'i', 'u', 'em', 'strong', 'span', 'img', 'br' ],
  allowedAttributes: { '*': ['style'], img: ['src'] },
  allowedSchemes: ['data']
});

function extractKeyValuePairs(html) {
  const doc = parseDocument(html);
  const questions = [];

  function walk(nodes) {
    for (const node of nodes) {
      if (node.name === 'table') {
        const rows = DomUtils.findAll(el => el.name === 'tr', node);
        const q = {};
        for (const row of rows) {
          const cells = DomUtils.findAll(el => el.name === 'td', row);
          if (cells.length >= 2) {
            const key = DomUtils.getText(cells[0]).trim();
            const val = cleanHTML(DomUtils.getInnerHTML(cells[1]));
            q[key] = val;
          }
        }
        if (Object.keys(q).length > 0) questions.push(q);
      }
      if (node.children) walk(node.children);
    }
  }

  walk([doc]);
  return questions;
}

async function ensureTable(keys) {
  const columns = keys.map(key => `\`${key}\` TEXT`).join(',');
  await pool.execute(`CREATE TABLE IF NOT EXISTS questions (id INT AUTO_INCREMENT PRIMARY KEY, ${columns})`);
}

async function insertQuestion(data) {
  const keys = Object.keys(data);
  const fields = keys.map(k => `\`${k}\``).join(',');
  const placeholders = keys.map(() => '?').join(',');
  const values = keys.map(k => data[k]);
  await pool.execute(`INSERT INTO live_test_questions (${fields}) VALUES (${placeholders})`, values);
}
const QuestionUpload = async (req, res) => {
  try {
    const result = await mammoth.convertToHtml({ path: req.file.path }, mammothOptions);
    const questions = extractKeyValuePairs(result.value);
    if (questions.length === 0) return res.status(400).send('No valid data found');
    await ensureTable(Object.keys(questions[0]));
    for (const q of questions) await insertQuestion(q);
    fs.unlinkSync(req.file.path);
    res.redirect('/questions');
  } catch (err) {
    console.error("Error during QuestionUpload:", err.message);
  console.error(err.stack);
  res.status(500).send('Error processing file.');
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
  QuestionUpload,
};
