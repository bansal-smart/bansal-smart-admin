const TestSeriesTest = require("../../models/TestSeriesTest");
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

const mysql = require('mysql2/promise');
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
  const poolPromise = pool.promise();
  const [tables] = await poolPromise.query(`SHOW TABLES LIKE 'questions'`);
  
  if (tables.length === 0) {
    const columns = keys.map(k => `\`${k}\` LONGTEXT`).join(',');
    await poolPromise.execute(`CREATE TABLE questions (id INT AUTO_INCREMENT PRIMARY KEY, ${columns})`);
    return;
  }

  const [existingCols] = await poolPromise.query(`SHOW COLUMNS FROM questions`);
  const existingColNames = existingCols.map(col => col.Field);

  for (const key of keys) {
    if (!existingColNames.includes(key)) {
      await poolPromise.execute(`ALTER TABLE questions ADD COLUMN \`${key}\` TEXT`);
    }
  }
}

const keyMapping = {
  "Question_English": "question",
  "Question English": "question",
  "Question_hindi": "question_hindi",
  "Question image": "question_image",
  "Question Type": "question_type",
  "Question patter": "level",
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
  "Is PYQs": "is_pyq",
  "PYQs Year": "pyq_year",
  "Correct Answer": "answer",
  // Add more mappings if needed
};
// async function insertQuestion(data, test_id) {
//   const keys = Object.keys(data);
  
//   // Add test_id field and value
//   keys.push('test_id');
  
//   const fields = keys.map(k => `\`${k}\``).join(',');
//   const placeholders = keys.map(() => '?').join(',');
  
//   // Add test_id value to values array
//   const values = keys.map(k => (k === 'test_id' ? test_id : data[k]));
  
//   const poolPromise = pool.promise();
//   await poolPromise.execute(`INSERT INTO live_test_questions (${fields}) VALUES (${placeholders})`, values);
// }

async function insertQuestion(data, test_id) {
  // Ensure test_id is added only if not already in data
  if (!data.hasOwnProperty('test_id')) {
    data.test_id = test_id;
  }

  const keys = Object.keys(data);
  const fields = keys.map(k => `\`${k}\``).join(',');
  const placeholders = keys.map(() => '?').join(',');
  const values = keys.map(k => data[k]);

  const poolPromise = pool.promise();
  await poolPromise.execute(
    `INSERT INTO live_test_questions (${fields}) VALUES (${placeholders})`,
    values
  );
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

module.exports = {
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
  QuestionUploads: async (req, res) => {
  try {
    const testId = req.body.test_id;
    //const result = await mammoth.convertToHtml({ path: req.file.path });
    const html = result.value;
    const result = await mammoth.convertToHtml({ path: req.file.path }, mammothOptions);
    const questions = extractKeyValuePairs(result.value);
    const $ = cheerio.load(html);

    $("table").each((index, table) => {
      const questionData = {};

      $(table)
        .find("tr")
        .each((i, row) => {
          const key = $(row).find("td").eq(0).text().trim().toLowerCase().replace(/\s+/g, '_');
          const value = $(row).find("td").eq(1).text().trim();

          if (key) {
            questionData[key] = value;
          }
        });

      questionData.test_id = testId;
      questions.push(questionData);
    });

    if (questions.length === 0) return res.status(400).json({ success: false, message: "No valid questions found" });

    for (const q of questions) {
      await insertQuestion(q, testId);
    }

    fs.unlinkSync(req.file.path);

    return res.status(200).json({
      success: true,
      message: "Questions uploaded successfully",
      redirect_url: `/admin/exam-question-list/${testId}`
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error processing file." });
  }
},

QuestionUpload: async (req, res) => {
  try {
    const testId = req.body.test_id;
    const result = await mammoth.convertToHtml({ path: req.file.path });
    const html = result.value;

    const $ = cheerio.load(html);
    const questions = [];

    $("table").each((index, table) => {
      const questionData = {};

      $(table)
        .find("tr")
        .each((i, row) => {
          const key = $(row).find("td").eq(0).text().trim().toLowerCase().replace(/\s+/g, '_');
          const value = $(row).find("td").eq(1).text().trim();

          if (key) {
            questionData[key] = value;
          }
        });

      questionData.test_id = testId;
      questions.push(questionData);
    });

    if (questions.length === 0) {
      return res.status(400).json({ success: false, message: "No valid questions found" });
    }

  await pool.promise().query('DELETE FROM live_test_questions WHERE test_id = ?', [testId]);

    // ✅ Insert new questions
    for (const q of questions) {
      await insertQuestion(q, testId);
    }

    fs.unlinkSync(req.file.path);

    return res.status(200).json({
      success: true,
      message: "Questions uploaded successfully",
      redirect_url: `/admin/exam-question-list/${testId}`
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error processing file." });
  }
},
  // QuestionUpload: async (req, res) => {
    
  //     try {

  //       const testId = req.body.test_id;
  //   const result = await mammoth.convertToHtml({ path: req.file.path }, mammothOptions);

  //   const questions = extractKeyValuePairs(result.value);

    
  //   if (questions.length === 0) return res.status(400).send('No valid data found');

  //   const allKeys = new Set();
  //   questions.forEach(q => Object.keys(q).forEach(k => allKeys.add(k)));

  //   //await ensureTable([...allKeys]);

  //   for (const q of questions) await insertQuestion(q,testId);

  //   fs.unlinkSync(req.file.path);
  //   res.redirect('/admin/exam-question-list');
  // } catch (err) {
  //   console.error(err);
  //   res.status(500).send('Error processing file.');
  // }
  // },
    //   const tableName = "live_test_questions";
    //   const result = await mammoth.convertToHtml(
    //     { path: req.file.path },
    //     mammothOptions
    //   );
    //   const questions = extractKeyValuePairs(result.value);
    //   console.log(questions); 
    //   if (questions.length === 0) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "No valid data found in uploaded document.",
    //     });
    //   }

    //   const keys = Object.keys(questions[0]);
    //   await ensureTable(tableName, keys);

    //   const insertResults = {
    //     success: true,
    //     total: questions.length,
    //     inserted: 0,
    //     failed: 0,
    //     errors: [],
    //   };

    //   for (const [index, q] of questions.entries()) {
    //     const result = await insertQuestion(tableName, q);
    //     if (result.success) {
    //       insertResults.inserted += 1;
    //     } else {
    //       insertResults.failed += 1;
    //       insertResults.errors.push({
    //         index,
    //         question: q,
    //         error: result.message,
    //       });
    //     }
    //   }

    //   res.status(200).json({
    //     success: insertResults.failed === 0,
    //     message:
    //       insertResults.failed === 0
    //         ? "All questions uploaded successfully."
    //         : `Some questions failed to upload.`,
    //     details: insertResults,
    //     redirect_url: "/admin/exam-list",
    //   });
    // } catch (error) {
    //   console.error("QuestionUpload Error:", error);
    //   res.status(500).json({
    //     success: false,
    //     message:
    //       "Error uploading questions: " + (error.message || error.toString()),
    //   });
    // }


  QuestionList: async (req, res) => {
  try {
    const testId = req.params.postId;
    const poolPromise = pool.promise();
    const [columns] = await poolPromise.query('SHOW COLUMNS FROM questions');
    const [rows] = await poolPromise.query('SELECT * FROM live_test_questions');
   // const headers = columns.map(col => col.Field);
    const headers = ['id', 'Question Details','Question Type','Option1', 'Option2', 'Option3','Option4','Correct Answer'];
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
  

const [exams] = await poolPromise.query('SELECT * FROM live_test WHERE id = ?', [testId]);

  const exam = exams.length > 0 ? exams[0] : null;
    res.render("admin/exam/question-list", {
      success: req.flash("success"),
      error: req.flash("error"),
      headers,
      rows,
      req,
      exam,
      page_name: "Question List",
      list_url: "/admin/exam-list",
      trashed_list_url: "/admin/exam-list/?status=trashed",
      create_url: "/admin/exam-create",
    });
  } catch (err) {
    console.error("List Error:", err);
    handleError(res, req, "Server error in listing data");
  }
},

  // QuestionList: async (req, res) => {
  //     try {

  //        const [columns] = await pool.promise().query('SHOW COLUMNS FROM questions');
  //   const [rows] = await pool.promise().query('SELECT * FROM questions');
  //   const headers = columns.map(col => col.Field);

  //   let html = `
  //   <html>
  //   <head>
  //     <title>Questions</title>
  //     <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  //   </head>
  //   <body class="bg-light">
  //     <div class="container mt-5">
  //       <h2 class="text-primary">Questions</h2>
  //       <a href="/" class="btn btn-success mb-3">Upload More</a>
  //       <div class="table-responsive">
  //         <table class="table table-bordered bg-white shadow">
  //           <thead class="table-secondary">
  //             <tr>${headers.map(h => `<th>${h}</th>`).join('')}<th>Actions</th></tr>
  //           </thead>
  //           <tbody>`;

  //   rows.forEach(row => {
  //     html += `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}
  //     <td>
  //       <a class="btn btn-sm btn-warning" href="/edit/${row.id}">Edit</a>
  //       <a class="btn btn-sm btn-danger ms-2" href="/delete/${row.id}">Delete</a>
  //     </td></tr>`;
  //   });

  //   html += `</tbody></table></div></div></body></html>`;
  //   res.send(html);
  // });
  // and all data display to wxam/question-lisy
  //     } catch (err) {
  //       console.error("List Error:", err);
  //       handleError(res, req, "Server error in listing data");
  //     }
  //   },

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
