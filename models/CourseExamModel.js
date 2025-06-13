const pool = require("../db/database");
const sanitizeHtml = require('sanitize-html');
class TestSeriesTest {
  static withCategory() {
    return `
      SELECT 
        tst.*, 
        c.category_name,
        ts.course_name
      FROM live_test tst
      LEFT JOIN categories c ON tst.category_id = c.id
      LEFT JOIN courses ts ON tst.course_id = ts.id
    `;
  }

  static async list(status = "active", courseId) {
  try {
    // Define the WHERE condition based on the status
    let where =
      status === "trashed"
        ? "WHERE tst.deleted_at IS NOT NULL"
        : "WHERE tst.deleted_at IS NULL";

    // Add courseId condition
    const queryParams = [];
    if (courseId) {
      where += " AND tst.course_id = ?";
      queryParams.push(courseId);
    }
     where += " AND tst.test_location = ?";
      queryParams.push('course');
   

    // Final query
    const query = `${this.withCategory()} ${where} ORDER BY tst.id DESC`;

    // Fetch the test series data
    const [testSeriesRows] = await pool.promise().query(query, queryParams);

    // Fetch questions for each test series
    const testSeriesWithQuestions = await Promise.all(
      testSeriesRows.map(async (testSeries) => {
        const [questionRows] = await pool.promise().query(
          `SELECT * FROM live_test_questions WHERE test_id = ?`,
          [testSeries.id]
        );

        testSeries.no_of_question = questionRows.length;
        return testSeries;
      })
    );

    return testSeriesWithQuestions;
  } catch (err) {
    console.error("Error fetching test series or questions: ", err);
    throw err;
  }
}



  static async questionLists() {
  const query = `SELECT * FROM live_test_questions ORDER BY id DESC`;
  
  return new Promise((resolve, reject) => {
    pool.query(query, (err, results) => {
      if (err) return reject(err);

      const sanitizedResults = results.map(row => {
        const sanitizedRow = {};
        for (const key in row) {
          if (typeof row[key] === 'string') {
            sanitizedRow[key] = sanitizeHtml(row[key], {
              allowedTags: [], // No HTML tags allowed
              allowedAttributes: {}, // No attributes
            });
          } else {
            sanitizedRow[key] = row[key]; // Keep non-string fields as-is
          }
        }
        return sanitizedRow;
      });

      resolve(sanitizedResults);
    });
  });
}

  
  static async findById(id) {
    const query = `
      SELECT 
        ts.*, 
        c.category_name,
        s.name as test_series_name
      FROM live_test ts
      LEFT JOIN categories c ON ts.category_id = c.id
      LEFT JOIN test_series s ON ts.test_series_id = s.id
      WHERE ts.id = ?
    `;
    return new Promise((resolve, reject) => {
      pool.query(query, [id], (err, results) => {
        if (err) return reject(err);
        if (results.length === 0) return resolve(null);
        resolve(results[0]);
      });
    });
  }

  static async checkDuplicate(
    course_id,
    test_name,
    excludeId = null
  ) {
    const query = `
      SELECT id FROM live_test 
      WHERE course_id = ? AND test_name = ?
      ${excludeId ? "AND id != ?" : ""}
    `;
    const params = excludeId
      ? [course_id, test_name, excludeId]
      : [course_id, test_name];
    return new Promise((resolve, reject) => {
      pool.query(query, params, (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0);
      });
    });
  }

static async create(data) {

  // Insert logic
  const fields = Object.keys(data);
  const placeholders = fields.map(() => "?").join(", ");
  const values = fields.map((key) => data[key]);

  const query = `INSERT INTO live_test (${fields.join(", ")}) VALUES (${placeholders})`;

  return new Promise((resolve, reject) => {
    pool.query(query, values, (err, results) => {
      if (err) return reject(err);
      resolve(results.insertId);
    });
  });
}

 static async update(id, data) {
  const query = `
  UPDATE live_test SET 
    category_id = ?,
    test_series_id = ?,
    test_name = ?,
    instruction = ?,
    image = COALESCE(?, image),
    test_type = ?,
    marks = ?, 
    start_date_time = ?, 
    end_date_time = ?, 
    duration_test = ?, 
    result_date = ?, 
    updated_at = ?
  WHERE id = ?
`;

const params = [
  data.category_id,
  data.test_series_id,
  data.test_name,
  data.instruction || "",
  data.image || null,
  data.test_type || null,
  data.marks || null,
  data.start_date_time || null,
  data.end_date_time || null,
  data.duration_test || null,
  data.result_date || null,
  data.updated_at || new Date(),
  id,
];

  try {
    const [result] = await pool.promise().query(query, params); // use promise wrapper
    return result.affectedRows;
  } catch (err) {
    console.error('Error updating TestSeriesTest:', err);
    throw err;
  }
}

  static async softDelete(id) {
    const query = "UPDATE live_test SET deleted_at = ? WHERE id = ?";
    return new Promise((resolve, reject) => {
      pool.query(query, [new Date(), id], (err, results) => {
        if (err) return reject(err);
        resolve(results.affectedRows);
      });
    });
  }

  static async restore(id) {
    const query = "UPDATE live_test SET deleted_at = NULL WHERE id = ?";
    return new Promise((resolve, reject) => {
      pool.query(query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results.affectedRows);
      });
    });
  }

  static async permanentDelete(id) {
    const query = "DELETE FROM live_test WHERE id = ?";
    return new Promise((resolve, reject) => {
      pool.query(query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results.affectedRows);
      });
    });
  }
}

module.exports = TestSeriesTest;
