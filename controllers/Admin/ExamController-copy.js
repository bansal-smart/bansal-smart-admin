const TestSeriesTest = require("../../models/TestSeriesTest");
const Helper = require("../../helpers/Helper");
const path = require("path");
const fs = require("fs");
const pool = require("../../db/database");
const randomstring = require("randomstring");
const mammoth = require("mammoth");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { parseDocument, DomUtils } = require("htmlparser2");
const sanitizeHtml = require("sanitize-html");
const { validateRequiredFields } = require("../../helpers/validationsHelper");

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
  const { postId, course, action, formUrl, pageName, error, success } = options;
  const categories = await Helper.getActiveCategoriesByType();
  const testSeries = await Helper.getActiveTestSeries();

  res.render("admin/exam/create", {
    success,
    error,
    categories,
    testSeries,
    course,
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

// Mammoth options
const mammothOptions = {
  convertImage: mammoth.images.inline(async (image) => {
    const buffer = await image.read("base64");
    return { src: `data:${image.contentType};base64,${buffer}` };
  }),
};

// Clean and sanitize HTML
const cleanHTML = (html) =>
  sanitizeHtml(html, {
    allowedTags: ["p", "b", "i", "u", "em", "strong", "span", "img", "br"],
    allowedAttributes: { "*": ["style"], img: ["src"] },
    allowedSchemes: ["data"],
  });

// Extract key-value pairs from HTML table
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

async function ensureTable(tableName, keys) {
  const columns = keys.map((key) => `\`${key}\` TEXT`).join(",");
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS \`${tableName}\` (id INT AUTO_INCREMENT PRIMARY KEY, ${columns})`
  );
}

const keyMapping = {
  Question_English: "question",
  "Question English": "question",
  Question_hindi: "question_hindi",
  "Question image": "question_image",
  "Question Type": "question_type",
  "Question patter": "test_pattern",
  "Option1 English": "option1_english",
  "Option1 hindi": "option1_hindi",
  "Option2 English": "option2_english",
  "Option 2 Hindi": "option2_hindi",
  "Option3 English": "option3_english",
  "Option 3 Hindi": "option3_hindi",
  "Option4 English": "option4_english",
  "Option4 Hindi": "option4_hindi",
  "Solution English": "solution_english",
  "Solution Hindi": "solution_hindi",
  "Assertion Hindi": "assertion_hindi",
  "Assertion English": "assertion_english",
  "Reason Hindi": "reason_hindi",
  "Reason English": "reason_english",
  "Is PYQ’s": "is_pyq",
  "PYQ’s Year": "pyq_year",
  "Correct Answer": "answer",
  // Add more mappings if needed
};

async function insertQuestion(tableName, data) {
  const mappedData = {};
  const unknownKeys = [];

  for (const [key, value] of Object.entries(data)) {
    if (keyMapping[key]) {
      mappedData[keyMapping[key]] = value;
    } else {
      unknownKeys.push(key);
    }
  }

  if (unknownKeys.length > 0) {
    return {
      success: false,
      message: `Invalid input keys: ${unknownKeys.join(", ")}`,
    };
  }

  const keys = Object.keys(mappedData);
  if (keys.length === 0) {
    return {
      success: false,
      message: "No valid fields to insert after key mapping.",
    };
  }

  const fields = keys.map((k) => `\`${k}\``).join(",");
  const placeholders = keys.map(() => "?").join(",");
  const values = keys.map((k) => mappedData[k]);

  try {
    await pool.execute(
      `INSERT INTO \`${tableName}\` (${fields}) VALUES (${placeholders})`,
      values
    );
    return {
      success: true,
      message: "Question inserted successfully.",
    };
  } catch (err) {
    return {
      success: false,
      message: "Database error: " + err.message,
    };
  }
}

// async function insertQuestion(tableName, data) {
//   const mappedData = {};

//   for (const [key, value] of Object.entries(data)) {
//     if (keyMapping[key]) {
//       mappedData[keyMapping[key]] = value;  // map input key to DB column name
//     } else {
//       console.warn(`Warning: Input key '${key}' not found in keyMapping.`);
//     }
//   }

//   const keys = Object.keys(mappedData);
//   if (keys.length === 0) {
//     throw new Error("No valid fields to insert after mapping keys.");
//   }

//   const fields = keys.map(k => `\`${k}\``).join(",");
//   const placeholders = keys.map(() => "?").join(",");
//   const values = keys.map(k => mappedData[k]);

//   // console.log("Fields to insert:", fields);
//   // console.log("Values:", values);

//   await pool.execute(
//     `INSERT INTO \`${tableName}\` (${fields}) VALUES (${placeholders})`,
//     values
//   );
// }
// async function insertQuestion(tableName, data) {
//   const keys = Object.keys(data);
//   const fields = keys.map(k => `\`${k}\``).join(",");

//   console.log(fields);
//   const placeholders = keys.map(() => "?").join(",");
//   const values = keys.map(k => data[k]);
//   await pool.execute(`INSERT INTO \`${tableName}\` (${fields}) VALUES (${placeholders})`, values);
// }
// const keyMapping = {
//   "Question English": "question",
//   "Question Hindi": "question_hindi",
//   "question_type": "question_type",
//   "question_image": "question_image",
//   "Option1 English": "option1_English",
//   "Option1 Hindi": "option1_hindi",
//   "Option2 English": "option2_English",
//   "Option2 Hindi": "option2_hindi",
//   "Option3 English": "option3_English",
//   "Option3 Hindi": "option3_hindi",
//   "Option4 English": "option4_English",
//   "Option4 Hindi": "option4_hindi",
//   "Correct Answer": "answer",
//   "level": "level",
//   "Question pattern": "test_pattern",
//   "Is PYQ’s": "is_pyq",
//   "PYQ’s Year": "pyq_year",
//   "subject": "subject",
//   "test_pattern": "test_pattern"
// };

// Function to map input keys to DB columns
// function mapInputToDbColumns(inputData) {
//   const mappedData = {};
//   for (const [key, value] of Object.entries(inputData)) {
//     if (keyMapping[key]) {
//       mappedData[keyMapping[key]] = value;
//     } else {
//       // Optional: ignore unmapped keys or add them as-is
//       // mappedData[key] = value;
//       console.warn(`Warning: Input key '${key}' not found in keyMapping.`);
//     }
//   }
//   return mappedData;
// }

// Insert function expecting DB column keys in data
// async function insertQuestion(tableName, data) {
//   const keys = Object.keys(data);
//   if (keys.length === 0) throw new Error("No valid fields to insert after mapping keys.");

//   const fields = keys.map(k => `\`${k}\``).join(",");
//   const placeholders = keys.map(() => "?").join(",");
//   const values = keys.map(k => data[k]);

//   await pool.execute(`INSERT INTO \`${tableName}\` (${fields}) VALUES (${placeholders})`, values);
// }

// Example usage:
// async function saveQuestion(rawInputData) {
//   const mappedData = mapInputToDbColumns(rawInputData);
//   await insertQuestion('live_test_questions', mappedData);
// }

const QuestionUpload = async (req, res) => {
  try {
    const tableName = "live_test_questions";

    // Check if file is provided
    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
    }

    // Convert uploaded document to HTML using mammoth
    const result = await mammoth.convertToHtml(
      { path: req.file.path },
      mammothOptions
    );

    // Extract question key-value pairs from HTML content
    const questions = extractKeyValuePairs(result.value);

    if (!questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid data found in uploaded document.",
      });
    }

    // Get keys from first question object to create/ensure DB table
    const keys = Object.keys(questions[0]);
    await ensureTable(tableName, keys);

    const insertResults = {
      success: true,
      total: questions.length,
      inserted: 0,
      failed: 0,
      errors: [],
    };

    // Insert each question individually
    for (const [index, q] of questions.entries()) {
      const insertResult = await insertQuestion(tableName, q);
      if (insertResult.success) {
        insertResults.inserted += 1;
      } else {
        insertResults.failed += 1;
        insertResults.errors.push({
          index,
          question: q,
          error: insertResult.message,
        });
      }
    }

    res.status(200).json({
      success: insertResults.failed === 0,
      message:
        insertResults.failed === 0
          ? "All questions uploaded successfully."
          : `Some questions failed to upload.`,
      details: insertResults,
      redirect_url: "/admin/exam-list",
    });
  } catch (error) {
    console.error("QuestionUpload Error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading questions: " + (error.message || error.toString()),
    });
  }
};

const List = async (req, res) => {
  try {
    const status = req.query.status === "trashed" ? "trashed" : "active";

    // Fetch list of tests based on status
    const tests = await TestSeriesTest.list(status);

    res.render("admin/exam/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      customers: tests,
      req,
      page_name: status === "trashed" ? "Trashed Exam List" : "Exam List",
      list_url: "/admin/exam-list",
      trashed_list_url: "/admin/exam-list/?status=trashed",
      create_url: "/admin/exam-create",
    });
  } catch (err) {
    console.error("List Error:", err);
    // Ensure handleError is defined elsewhere in your project
    handleError(res, req, "Server error in listing data");
  }
};



module.exports = {
  QuestionUpload,
  List,
  
  //  QuestionUpload: async (req, res) => {
  //   try {
  //     const tableName = "live_test_questions";
  //     const result = await mammoth.convertToHtml({ path: req.file.path }, mammothOptions);
  //     const questions = extractKeyValuePairs(result.value);

  //     if (questions.length === 0) {
  //       return res.status(400).send("No valid data found in uploaded document.");
  //     }

  //     const keys = Object.keys(questions[0]);
  //     await ensureTable(tableName, keys);

  //     for (const q of questions) {
  //       await insertQuestion(tableName, q);
  //     }

  //     res.status(200).send("Questions uploaded and inserted successfully.");
  //   } catch (error) {
  //     console.error("QuestionUpload Error:", error);
  //     res.status(500).send("Error uploading questions: " + (error.message || error.toString()));
  //   }
  // },

  QuestionUpload: async (req, res) => {
    try {
      const tableName = "live_test_questions";
      const result = await mammoth.convertToHtml(
        { path: req.file.path },
        mammothOptions
      );
      const questions = extractKeyValuePairs(result.value);

      if (questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid data found in uploaded document.",
        });
      }

      const keys = Object.keys(questions[0]);
      await ensureTable(tableName, keys);

      const insertResults = {
        success: true,
        total: questions.length,
        inserted: 0,
        failed: 0,
        errors: [],
      };

      for (const [index, q] of questions.entries()) {
        const result = await insertQuestion(tableName, q);
        if (result.success) {
          insertResults.inserted += 1;
        } else {
          insertResults.failed += 1;
          insertResults.errors.push({
            index,
            question: q,
            error: result.message,
          });
        }
      }

      res.status(200).json({
        success: insertResults.failed === 0,
        message:
          insertResults.failed === 0
            ? "All questions uploaded successfully."
            : `Some questions failed to upload.`,
        details: insertResults,
        redirect_url: "/admin/exam-list",
      });
    } catch (error) {
      console.error("QuestionUpload Error:", error);
      res.status(500).json({
        success: false,
        message:
          "Error uploading questions: " + (error.message || error.toString()),
      });
    }
  },




  List: async (req, res) => {
    try {
      const status = req.query.status === "trashed" ? "trashed" : "active";
      const tests = await TestSeriesTest.list(status);
      res.render("admin/exam/list", {
        success: req.flash("success"),
        error: req.flash("error"),
        customers: tests,
        req,
        page_name: status === "trashed" ? "Trashed Exam List" : "Exam List",
        list_url: "/admin/exam-list",
        trashed_list_url: "/admin/exam-list/?status=trashed",
        create_url: "/admin/exam-create",
      });
    } catch (err) {
      console.error("List Error:", err);
      handleError(res, req, "Server error in listing data");
    }
  },

  Show: async (req, res) => {
    try {
      const testSeries = await TestSeriesTest.findById(req.params.postId);
      if (!testSeries)
        return handleError(
          res,
          req,
          "Test series not found",
          "/admin/exam-list"
        );

      res.render("admin/exam/show", {
        success: req.flash("success"),
        error: req.flash("error"),
        post: testSeries,
        list_url: "/admin/exam-list",
        page_name: "Test Series Details",
      });
    } catch (error) {
      console.error("Show Error:", error);
      handleError(res, req, "An unexpected error occurred", "/admin/exam-list");
    }
  },

  Edit: async (req, res) => {
    try {
      const course = await TestSeriesTest.findById(req.params.postId);

      console.log(course);
      if (!course)
        return handleError(res, req, "Exam not found", "/admin/exam-list");

      await renderForm(res, {
        postId: req.params.postId,
        course,
        action: "Update",
        formUrl: `/admin/exam-update/${req.params.postId}`,
        pageName: "Edit Exam",
        error: req.flash("error"),
        success: req.flash("success"),
      });
    } catch (error) {
      console.error("Edit Error:", error);
      handleError(res, req, error.message, "/admin/exam-list");
    }
  },

  Create: async (req, res) => {
    try {
      await renderForm(res, {
        course: null,
        action: "Create",
        formUrl: "/admin/exam-update",
        pageName: "Create Exam",
        error: req.flash("error"),
        success: req.flash("success"),
      });
    } catch (error) {
      console.error("Create Error:", error);
      handleError(res, req, error.message, "/admin/exam-list");
    }
  },

  Update: async (req, res) => {
    try {
      const postId = req.params.postId;

      const data = {
        category_id: req.body.category_id,
        test_series_id: req.body.test_series_id,
        test_name: req.body.test_name,
        description: req.body.description,
        test_type: req.body.test_type, // <-- Add this line
        updated_at: new Date(),
      };

      // Handle image upload
      if (req.files?.image?.length > 0) {
        data.image = `/uploads/test-series-test/${req.files.image[0].filename}`;
      }

      // Check for duplicate
      const isDuplicate = await TestSeriesTest.checkDuplicate(
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
        await TestSeriesTest.update(postId, data);
        return res.json({
          success: true,
          redirect_url: "/admin/exam-list",
          message: "Exam updated successfully",
        });
      } else {
        // Create new test
        data.created_at = new Date();
        await TestSeriesTest.create(data);
        return res.json({
          success: true,
          redirect_url: "/admin/exam-list",
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
      await TestSeriesTest.softDelete(req.params.postId);
      req.flash("success", "Exam deleted successfully");
      res.redirect("/admin/exam-list");
    } catch (error) {
      console.error("Delete Error:", error);
      handleError(res, req, "Error deleting Exam");
    }
  },

  Restore: async (req, res) => {
    try {
      await TestSeriesTest.restore(req.params.postId);
      req.flash("success", "Exam restored successfully");
      res.redirect("/admin/exam-list?status=trashed");
    } catch (error) {
      console.error("Restore Error:", error);
      handleError(res, req, "Error restoring Exam");
    }
  },

  PermanentDelete: async (req, res) => {
    try {
      await TestSeriesTest.permanentDelete(req.params.postId);
      req.flash("success", "Exam permanently deleted");
      res.redirect("/admin/exam-list?status=trashed");
    } catch (error) {
      console.error("PermanentDelete Error:", error);
      handleError(res, req, "Error permanently deleting Exam");
    }
  },
};
