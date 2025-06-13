const CourseExamModel = require("../../models/CourseExamModel");
const Helper = require("../../helpers/Helper");
const path = require("path");
const fs = require("fs");
const pool = require("../../db/database");
const randomstring = require("randomstring");
const cheerio = require("cheerio");
const mammoth = require("mammoth");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { parseDocument, DomUtils } = require("htmlparser2");
const sanitizeHtml = require("sanitize-html");
const { validateRequiredFields } = require("../../helpers/validationsHelper");
const express = require("express");
const cors = require("cors");

const mysql = require("mysql2/promise");
const app = express();

// Helper functions
const checkImagePath = (relativePath) => {
  if (!relativePath) return false;
  const fullPath = path.join(
    __dirname,
    "..",
    "public",
    path.normalize(relativePath)
  );
  return fs.existsSync(fullPath);
};

const renderForm = async (res, options) => {
  const { postId, course, action, formUrl, pageName, error, success, post } =
    options;
  const categories = await Helper.getActiveCategoriesByType();
  const testSeries = await Helper.getActiveTestSeries();

  res.render("admin/course-exam/create", {
    success,
    error,
    categories,
    testSeries,
    course,
    post,
    form_url: formUrl,
    page_name: pageName,
    action,
    image:
      course && checkImagePath(course.image)
        ? course.image
        : "admin/images/default-featured-image.png",
  });
};

const handleError = (res, req, message, redirectUrl = "back") => {
  req.flash("error", message);
  return res.redirect(redirectUrl);
};

const mammothOptions = {
  convertImage: mammoth.images.inline(async (image) => {
    const buffer = await image.read("base64");
    return { src: `data:${image.contentType};base64,${buffer}` };
  }),
};

const cleanHTML = (html) =>
  sanitizeHtml(html, {
    allowedTags: ["p", "b", "i", "u", "em", "strong", "span", "img", "br"],
    allowedAttributes: { "*": ["style"], img: ["src"] },
    allowedSchemes: ["data"],
  });

function extractKeyValuePairs(html) {
  const doc = parseDocument(html);
  const questions = [];

  function walk(nodes) {
    for (const node of nodes) {
      if (node.name === "table") {
        const rows = DomUtils.findAll((el) => el.name === "tr", node);
        const q = {};
        for (const row of rows) {
          const cells = DomUtils.findAll((el) => el.name === "td", row);
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
  const [tables] = await pool
    .promise()
    .query(`SHOW TABLES LIKE 'live_test_questions'`);

  if (tables.length === 0) {
    const columns = keys.map((k) => `\`${k}\` LONGTEXT`).join(",");
    await pool
      .promise()
      .execute(
        `CREATE TABLE live_test_questions (id INT AUTO_INCREMENT PRIMARY KEY, ${columns})`
      );
    return;
  }

  const [existingCols] = await pool
    .promise()
    .query(`SHOW COLUMNS FROM live_test_questions`);
  const existingColNames = existingCols.map((col) => col.Field);

  for (const key of keys) {
    if (!existingColNames.includes(key)) {
      await pool
        .promise()
        .execute(`ALTER TABLE live_test_questions ADD COLUMN \`${key}\` TEXT`);
    }
  }
}

async function insertQuestion(data) {
  const keys = Object.keys(data);
  const fields = keys.map((k) => `\`${k}\``).join(",");
  const placeholders = keys.map(() => "?").join(",");
  const values = keys.map((k) => data[k]);
  await pool
    .promise()
    .execute(
      `INSERT INTO live_test_questions (${fields}) VALUES (${placeholders})`,
      values
    );
}

const multer = require("multer");

// Set storage options
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Specify the upload directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Set the filename format
  },
});

// Create multer upload middleware with specific field name
const uploaded = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max file size: 5MB
}).single("image"); // This means the input field name should be 'image'

// app.use(session({
//   secret: 'secret',
//   cookie: {maxAge:6000},
//   resave: false,
//   saveUninitialized: false
// }));

// Make helper functions available in all EJS templates via res.locals
app.use((req, res, next) => {
  res.locals.getLogoutUrl = getLogoutUrl;
  res.locals.getDashboardUrl = getDashboardUrl;
  userRole = req.session.userRole;
  next();
});

const db = mysql.createPool({
  host: "193.203.162.34",
  user: "bansal_user", // Replace with your MySQL username
  password: "Bansal@@2000", // Replace with your MySQL password
  database: "bansal_db", // Replace with your database name
  connectionLimit: 10, // Max number of simultaneous connection
  port: 3306,
});

const upload = multer({ storage });

function extractKeyValuePairs(html) {
  const doc = parseDocument(html);
  const questions = [];

  function walk(nodes) {
    for (const node of nodes) {
      if (node.name === "table") {
        const rows = DomUtils.findAll((el) => el.name === "tr", node);
        const q = {};
        for (const row of rows) {
          const cells = DomUtils.findAll((el) => el.name === "td", row);
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
  const [tables] = await db.query(`SHOW TABLES LIKE 'live_test_questions'`);

  if (tables.length === 0) {
    const columns = keys.map((k) => `\`${k}\` LONGTEXT`).join(",");
    await db.execute(
      `CREATE TABLE live_test_questions (id INT AUTO_INCREMENT PRIMARY KEY, ${columns})`
    );
    return;
  }

  const [existingCols] = await db.query(
    `SHOW COLUMNS FROM live_test_questions`
  );
  const existingColNames = existingCols.map((col) => col.Field);

  for (const key of keys) {
    if (!existingColNames.includes(key)) {
      await db.execute(
        `ALTER TABLE live_test_questions ADD COLUMN \`${key}\` TEXT`
      );
    }
  }
}

async function insertQuestion(data) {
  const keys = Object.keys(data);
  const fields = keys.map((k) => `\`${k}\``).join(",");
  const placeholders = keys.map(() => "?").join(",");
  const values = keys.map((k) => data[k]);
  await db.execute(
    `INSERT INTO live_test_questions (${fields}) VALUES (${placeholders})`,
    values
  );
}

app.get("/", (_, res) => {
  res.send(`
    <html>
      <head>
        <title>Upload DOCX</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="bg-light">
        <div class="container mt-5">
          <h2 class="text-primary">Upload Question DOCX</h2>
          <form method="POST" action="/upload" enctype="multipart/form-data">
            <div class="mb-3">
              <input type="file" class="form-control" name="docFile" accept=".docx" required>
            </div>
            <button type="submit" class="btn btn-success">Upload</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

module.exports = {
  QuestionUpload: async (req, res) => {
    try {
      const testId = req.body.test_id;
      const result = await mammoth.convertToHtml({ path: req.file.path });
      const html = result.value;

      const $ = cheerio.load(html);
      const questions = [];

      $("table").each((index, table) => {
        const questionData = {};
        const rows = $(table).find("tr");
        const rowData = [];

        rows.each((i, row) => {
          const val = $(row).find("td").eq(1).text().trim();
          rowData.push(val);
        });

        // Fixed mapping like your PHP example
        questionData.subject = rowData[0] || "";
        questionData.question = rowData[1] || "";
        questionData.question_hindi = rowData[2] || "";
        questionData.question_image = rowData[3] || "";
        questionData.question_type = rowData[4] || "";
        questionData.optionA = rowData[5] || "";
        questionData.option1_hindi = rowData[6] || "";
        questionData.optionB = rowData[7] || "";
        questionData.option2_hindi = rowData[8] || "";
        questionData.optionC = rowData[9] || "";
        questionData.option3_hindi = rowData[10] || "";
        questionData.optionD = rowData[11] || "";
        questionData.option4_hindi = rowData[12] || "";
        questionData.solution_english = rowData[13] || "";
        questionData.solution_hindi = rowData[14] || "";
        questionData.correct_marks = rowData[15] || "";
        questionData.marks = rowData[15] || "";
        questionData.incorrect_marks = rowData[16] || "";
        questionData.answer = rowData[17] || "";

        questionData.test_id = testId;

        questions.push(questionData);
      });

      if (questions.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No valid questions found" });
      }

      await pool
        .promise()
        .query("DELETE FROM live_test_questions WHERE test_id = ?", [testId]);

      for (const q of questions) {
        const keys = Object.keys(q);
        const fields = keys.map((k) => `\`${k}\``).join(",");
        const placeholders = keys.map(() => "?").join(",");
        const values = keys.map((k) => q[k]);

        await pool
          .promise()
          .query(
            `INSERT INTO live_test_questions (${fields}) VALUES (${placeholders})`,
            values
          );
      }

      fs.unlinkSync(req.file.path);

      return res.status(200).json({
        success: true,
        message: "Questions uploaded successfully",
        redirect_url: `/admin/course-exam-question-list/${testId}`,
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: "Error processing file." });
    }
  },

  QuestionUploadss: async (req, res) => {
    try {
      const testId = req.body.test_id;
      //const result = await mammoth.convertToHtml({ path: req.file.path });
      const html = result.value;
      const result = await mammoth.convertToHtml(
        { path: req.file.path },
        mammothOptions
      );
      const questions = extractKeyValuePairs(result.value);
      const $ = cheerio.load(html);

      $("table").each((index, table) => {
        const questionData = {};

        $(table)
          .find("tr")
          .each((i, row) => {
            const key = $(row)
              .find("td")
              .eq(0)
              .text()
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "_");
            const value = $(row).find("td").eq(1).text().trim();

            if (key) {
              questionData[key] = value;
            }
          });

        questionData.test_id = testId;
        questions.push(questionData);
      });

      if (questions.length === 0)
        return res
          .status(400)
          .json({ success: false, message: "No valid questions found" });

      for (const q of questions) {
        await insertQuestion(q, testId);
      }

      fs.unlinkSync(req.file.path);

      return res.status(200).json({
        success: true,
        message: "Questions uploaded successfully",
        redirect_url: `/admin/course-exam-question-list/${testId}`,
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: "Error processing file." });
    }
  },

  QuestionList: async (req, res) => {
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
      res.render("admin/course-exam/question-list", {
        success: req.flash("success"),
        error: req.flash("error"),
        headers,
        rows,
        req,
        exam,
        page_name: "Question List",
        list_url: "/admin/course-exam-list/${courseId}",
        trashed_list_url: "/admin/course-exam-list/${courseId}/?status=trashed",
        create_url: "/admin/course-exam-create",
      });
    } catch (err) {
      console.error("List Error:", err);
      handleError(res, req, "Server error in listing data");
    }
  },

  List: async (req, res) => {
    try {
      const courseId = req.params.postId;
      const status = req.query.status === "trashed" ? "trashed" : "active";
      const tests = await CourseExamModel.list(status, courseId);

      const subjectCount = await Helper.getSubjectCountByCourseId(courseId);
      const chapterCount = await Helper.getChapterCountByCourseId(courseId);
      const pdfCount = await Helper.getPdfCountByCourseId(courseId);
      const videoCount = await Helper.getVideoCountByCourseId(courseId);
      const bookingCount = await Helper.getBookingCountByCourseId(courseId);
      const testCount = await Helper.getTestCountByCourseId(courseId);
      const course = await Helper.getCourseDetails(courseId);
      res.render("admin/course-exam/list", {
        success: req.flash("success"),
        error: req.flash("error"),
        customers: tests,
        req,
        subjectCount,
        chapterCount,
        pdfCount,
        videoCount,
        bookingCount,
        testCount,
        page_name:
          status === "trashed"
            ? `Trashed Exam List in course :${course.course_name}`
            : `Exam List in course : ${course.course_name}`,
        list_url: "/admin/course-exam-list/${courseId}",
        trashed_list_url: "/admin/course-exam-list/${courseId}/?status=trashed",
        create_url: `/admin/course-exam-create/${courseId}`,
      });
    } catch (err) {
      console.error("List Error:", err);
      handleError(res, req, "Server error in listing data");
    }
  },

  Show: async (req, res) => {
    try {
      const testSeries = await CourseExamModel.findById(req.params.postId);
      if (!testSeries)
        return handleError(
          res,
          req,
          "Test series not found",
          "/admin/course-exam-list/${courseId}"
        );

      res.render("admin/course-exam/show", {
        success: req.flash("success"),
        error: req.flash("error"),
        post: testSeries,
        list_url: "/admin/course-exam-list/${courseId}",
        page_name: "Test Series Details",
      });
    } catch (error) {
      console.error("Show Error:", error);
      handleError(
        res,
        req,
        "An unexpected error occurred",
        "/admin/course-exam-list/${courseId}"
      );
    }
  },

  Edit: async (req, res) => {
    try {
      let post = await CourseExamModel.findById(req.params.postId); // ✅ works now

      const course = await Helper.getCourseDetails(post.course_id);

      await renderForm(res, {
        postId: req.params.postId,
        course,
        post,
        action: "Update",
        formUrl: `/admin/course-exam-update/${req.params.postId}`,
        pageName: "Edit Exam",
        error: req.flash("error"),
        success: req.flash("success"),
      });
    } catch (error) {
      console.error("Edit Error:", error);
      handleError(
        res,
        req,
        error.message,
        `/admin/course-exam-list/${req.params.postId}`
      );
    }
  },

  Create: async (req, res) => {
    try {
      const courseId = req.params.postId;
      const course = await Helper.getCourseDetails(courseId);
      await renderForm(res, {
        course,
        post: null,
        action: "Create",
        formUrl: `/admin/course-exam-store/${courseId}`,
        pageName: "Create Exam",
        error: req.flash("error"),
        success: req.flash("success"),
      });
    } catch (error) {
      console.error("Create Error:", error);
      handleError(
        res,
        req,
        error.message,
        "/admin/course-exam-list/${courseId}"
      );
    }
  },

  Update: async (req, res) => {
    try {
      const postId = req.params.postId;

      const data = {
        category_id: req.body.category_id,
        test_series_id: req.body.test_series_id,
        test_name: req.body.test_name,
        instruction: req.body.instruction,
        marks: req.body.marks,
        start_date_time: req.body.start_date_time,
        end_date_time: req.body.end_date_time,
        duration_test: req.body.duration_test,
        result_date: req.body.result_date,
        test_type: req.body.test_type, // <-- Add this line
        updated_at: new Date(),
      };

      // Handle image upload
      if (req.files?.image?.length > 0) {
        data.image = `/uploads/test-series-test/${req.files.image[0].filename}`;
      }

      // Check for duplicate
      const isDuplicate = await CourseExamModel.checkDuplicate(
        data.category_id,
        data.test_series_id,
        data.test_name,
        postId || null
      );

      if (isDuplicate) {
        return res.json({
          success: false,
          message: "Duplicate Exam found",
        });
      }

      if (postId) {
        // Update existing test
        await CourseExamModel.update(postId, data);
        return res.json({
          success: true,
          redirect_url: "/admin/course-exam-list/${courseId}",
          message: "Exam updated successfully",
        });
      } else {
        // Create new test
        data.created_at = new Date();
        await CourseExamModel.create(data);
        return res.json({
          success: true,
          redirect_url: "/admin/course-exam-list/${courseId}",
          message: "Exam created successfully",
        });
      }
    } catch (error) {
      console.error("Update Error:", error);
      return res.json({
        success: false,
        message: "Error saving Exam",
        error: error.message || error.toString(),
      });
    }
  },

  Store: async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const {
        test_name,
        instruction,
        marks,
        start_date_time,
        end_date_time,
        duration_test,
        result_date,
        test_type,
      } = req.body;

      const data = {
        test_name,
        instruction,
        marks,
        course_id: courseId,
        start_date_time,
        end_date_time,
        duration_test,
        result_date,
        test_type,
        test_location: "course", // ✅ Added here
        updated_at: new Date(),
      };

      // Handle image upload
      if (req.files?.image?.length > 0) {
        data.image = `/uploads/course-test/${req.files.image[0].filename}`;
      }

      // ✅ VALIDATION
      const errors = {};

      if (!test_name?.trim()) errors.test_name = ["Test name is required"];
      if (!test_type?.trim()) errors.test_type = ["Test type is required"];
      if (!marks?.trim()) errors.marks = ["Marks is required"];
      if (!start_date_time?.trim())
        errors.start_date_time = ["Start date is required"];
      if (!end_date_time?.trim())
        errors.end_date_time = ["End date is required"];
      if (!duration_test?.trim())
        errors.duration_test = ["Duration is required"];
       if (!data.image) errors.image = ["Image is required"];
      // if (!result_date?.trim()) errors.result_date = ["Result date is required"];

      if (Object.keys(errors).length > 0) {
        return res.status(422).json({
          success: false,
          errors,
          message: Object.values(errors)[0][0],
        });
      }

      // ✅ CHECK DUPLICATE
      const isDuplicate = await CourseExamModel.checkDuplicate(
        courseId,
        test_name
      );

      if (isDuplicate) {
        return res.json({
          success: false,
          message: "Duplicate Exam found",
        });
      }

      // ✅ STORE
      data.created_at = new Date();
      await CourseExamModel.create(data);

      return res.json({
        success: true,
        redirect_url: `/admin/course-exam-list/${courseId}`,
        message: "Exam created successfully",
      });
    } catch (error) {
      console.error("Store Error:", error);
      return res.json({
        success: false,
        message: "Error saving Exam",
        error: error.message || error.toString(),
      });
    }
  },

  Update: async (req, res) => {
    try {
      const postId = req.params.postId;

      const data = {
        category_id: req.body.category_id,
        test_series_id: req.body.test_series_id,
        test_name: req.body.test_name,
        instruction: req.body.instruction,
        marks: req.body.marks,
        start_date_time: req.body.start_date_time,
        end_date_time: req.body.end_date_time,
        duration_test: req.body.duration_test,
        result_date: req.body.result_date,
        test_type: req.body.test_type, // <-- Add this line
        updated_at: new Date(),
      };

      // Handle image upload
      if (req.files?.image?.length > 0) {
        data.image = `/uploads/test-series-test/${req.files.image[0].filename}`;
      }

      // Check for duplicate
      const isDuplicate = await CourseExamModel.checkDuplicate(
        data.category_id,
        data.test_series_id,
        data.test_name,
        postId || null
      );

      if (isDuplicate) {
        return res.json({
          success: false,
          message: "Duplicate Exam found",
        });
      }

      if (postId) {
        // Update existing test
        await CourseExamModel.update(postId, data);
        return res.json({
          success: true,
          redirect_url: "/admin/course-exam-list/${courseId}",
          message: "Exam updated successfully",
        });
      } else {
        // Create new test
        data.created_at = new Date();
        await CourseExamModel.create(data);
        return res.json({
          success: true,
          redirect_url: "/admin/course-exam-list/${courseId}",
          message: "Exam created successfully",
        });
      }
    } catch (error) {
      console.error("Update Error:", error);
      return res.json({
        success: false,
        message: "Error saving Exam",
        error: error.message || error.toString(),
      });
    }
  },

  Delete: async (req, res) => {
    try {
      await CourseExamModel.softDelete(req.params.postId);
      req.flash("success", "Exam deleted successfully");
      res.redirect("/admin/course-exam-list/${courseId}");
    } catch (error) {
      console.error("Delete Error:", error);
      handleError(res, req, "Error deleting Exam");
    }
  },

  Restore: async (req, res) => {
    try {
      await CourseExamModel.restore(req.params.postId);
      req.flash("success", "Exam restored successfully");
      res.redirect("/admin/course-exam-list/${courseId}?status=trashed");
    } catch (error) {
      console.error("Restore Error:", error);
      handleError(res, req, "Error restoring Exam");
    }
  },

  PermanentDelete: async (req, res) => {
    try {
      await CourseExamModel.permanentDelete(req.params.postId);
      req.flash("success", "Exam permanently deleted");
      res.redirect("/admin/course-exam-list/${courseId}?status=trashed");
    } catch (error) {
      console.error("PermanentDelete Error:", error);
      handleError(res, req, "Error permanently deleting Exam");
    }
  },
};
