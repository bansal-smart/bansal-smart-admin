const pool = require("../../db/database");
const randomstring = require("randomstring");
const Helper = require("../../helpers/Helper");
const jwt = require("jsonwebtoken");
const { validateRequiredFields } = require("../../helpers/validationsHelper");
const List = async (req, res) => {
  try {
    let where =
      req.query.status === "trashed"
        ? "WHERE `live_test`.deleted_at IS NOT NULL"
        : "WHERE `live_test`.deleted_at IS NULL";

    const queryParams = [];

    // Add test_location filter
    where += " AND live_test.test_location = ?";
    queryParams.push("live-test");

    const query = `${withCategory()} ${where} ORDER BY \`live_test\`.id DESC`;

    const page_name =
      req.query.status === "trashed"
        ? "Trashed Live Test List"
        : "Live Test List";

    const customers = await new Promise((resolve, reject) => {
      pool.query(query, queryParams, (err, result) => {
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
    res.redirect("back");
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
      page_name: "Create Live Test ",

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

const fs = require("fs");
const path = require("path");

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
      page_name: "Edit Live Test",
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

  console.log(req.body);
  
  const isInsert = !courseId || courseId === "null" || courseId === "0";

  const {
    category_id = "",
    course_id = "",
    test_name = "",
    test_type,
    price,
    discount_type,
    discount,
    duration,
    test_location = "live-test",
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
    if (!price || isNaN(price) || price == 0)
      errors.price = ["Price is required and must be a number"];
   
  }
if (discount_type?.trim() && (!discount?.trim() || discount == 0)) {
  errors.discount = ["Discount value is required"];
} else if (discount?.trim() && isNaN(discount)) {
  errors.discount = ["Discount must be numeric"];
}
if (
  (discount?.trim() && !discount_type?.trim()) || 
  (discount_type?.trim() && (!discount?.trim() || discount == 0))
) {
  errors.discount = ["Both discount type and discount value are required"];
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

      req.flash("success", "Live Test  soft deleted successfully");
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

    req.flash("success", "Live Test  Restored successfully");
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
          req.flash("error", "Failed to fetch Live Test ");
          return reject(error);
        }
        if (result.length === 0) {
          req.flash("error", "Live Test  not found");
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
      page_name: "Live Test  Details",
    });
  } catch (error) {
    console.error("Show Error:", error.message);
    req.flash("error", "An unexpected error occurred");
    res.redirect("back");
  }
};

const QuestionList = async (req, res) => {

    try {
      const testId = req.params.postId;
      const poolPromise = pool.promise();
      const [columns] = await poolPromise.query("SHOW COLUMNS FROM questions");
      const [rows] = await poolPromise.query(
        "SELECT * FROM live_test_questions WHERE test_id = ?",
        [testId]
      );
      // const headers = columns.map(col => col.Field);
      const headers = [
        "id",
        "Question Details",
        "Question Type",
        "Option1",
        "Option2",
        "Option3",
        "Option4",
        "Correct Answer",
      ];
      //   let html = `
      // <html>
      // <head>
      //   <meta charset="UTF-8">
      //   <title>Questions</title>
      //   <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
      //   <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
      //   <style>
      //     td { vertical-align: top; }
      //   </style>
      // </head>
      // <body class="bg-light">
      //   <div class="container mt-5">
      //     <h2 class="text-primary">Questions</h2>
      //     <a href="/" class="btn btn-success mb-3">Upload More</a>
      //     <div class="table-responsive">
      //       <table class="table table-bordered bg-white shadow">
      //         <thead class="table-secondary">
      //           <tr>${headers.map(h => `<th>${h}</th>`).join('')}<th>Actions</th></tr>
      //         </thead>
      //         <tbody>`;

      // rows.forEach(row => {
      //   html += `<tr>${
      //     headers.map(h => `<td>${row[h] || ''}</td>`).join('')
      //   }<td>
      //     <a class="btn btn-sm btn-warning" href="/edit/${row.id}">Edit</a>
      //     <a class="btn btn-sm btn-danger ms-2" href="/delete/${row.id}">Delete</a>
      //   </td></tr>`;
      // });

      // html += `
      //         </tbody>
      //       </table>
      //     </div>
      //   </div>
      //   <script>
      //     // Re-render MathJax after DOM load
      //     window.addEventListener('DOMContentLoaded', () => {
      //       if (window.MathJax) MathJax.typeset();
      //     });
      //   </script>

      // </body>
      // </html>`;

      // res.send(html);

      const [exams] = await poolPromise.query(
        "SELECT * FROM live_test WHERE id = ?",
        [testId]
        
      );

      

      const exam = exams.length > 0 ? exams[0] : null;
      res.render("admin/live-test/question-list", {
        success: req.flash("success"),
        error: req.flash("error"),
        headers,
        rows,
        req,
        exam,
        page_name: "Question List",
        list_url: "/admin/live-test-list",
        trashed_list_url: "/admin/live-test-list/?status=trashed",
        create_url: "/admin/live-test-create",
      });
    } catch (err) {
      console.error("List Error:", err);
      handleError(res, req, "Server error in listing data");
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
  QuestionList,
};
