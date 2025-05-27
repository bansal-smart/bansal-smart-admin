const pool = require("../db/database");
const sanitizeHtml = require('sanitize-html');
class TestSeriesTest {
  static withCategory() {
    return `
      SELECT 
        tst.*, 
        c.category_name,
        ts.name AS test_series_name
      FROM test_series_test tst
      LEFT JOIN categories c ON tst.category_id = c.id
      LEFT JOIN test_series ts ON tst.test_series_id = ts.id
    `;
  }

  static async list(status = "active") {
    const where =
      status === "trashed"
        ? "WHERE tst.deleted_at IS NOT NULL"
        : "WHERE tst.deleted_at IS NULL";
    const query = `${this.withCategory()} ${where} ORDER BY tst.id DESC`;
    return new Promise((resolve, reject) => {
      pool.query(query, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

  // static async questionLists() {
   
  //   const query = `SELECT * FROM live_test_questions ORDER BY id DESC`;
  //   return new Promise((resolve, reject) => {
  //     pool.query(query, (err, results) => {
  //       if (err) return reject(err);
  //       resolve(results);
  //     });
  //   });
  // }

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
      FROM test_series_test ts
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
    category_id,
    test_series_id,
    test_name,
    excludeId = null
  ) {
    const query = `
      SELECT id FROM test_series_test 
      WHERE category_id = ? AND test_series_id = ? AND test_name = ?
      ${excludeId ? "AND id != ?" : ""}
    `;
    const params = excludeId
      ? [category_id, test_series_id, test_name, excludeId]
      : [category_id, test_series_id, test_name];
    return new Promise((resolve, reject) => {
      pool.query(query, params, (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0);
      });
    });
  }

  static async create(data) {
  const query = `
    INSERT INTO test_series_test 
    (category_id, test_series_id, test_name, description, image, test_type, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    data.category_id,
    data.test_series_id,
    data.test_name,
    data.description || "",
    data.image || null,
    data.test_type || null,
    data.created_at || new Date(),
  ];
  return new Promise((resolve, reject) => {
    pool.query(query, params, (err, results) => {
      if (err) return reject(err);
      resolve(results.insertId);
    });
  });
}

 static async update(id, data) {
  const query = `
    UPDATE test_series_test SET 
      category_id = ?,
      test_series_id = ?,
      test_name = ?,
      description = ?,
      image = COALESCE(?, image),
      test_type = ?,
      updated_at = ?
    WHERE id = ?
  `;
  const params = [
    data.category_id,
    data.test_series_id,
    data.test_name,
    data.description || "",
    data.image || null,
    data.test_type || null,
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
    const query = "UPDATE test_series_test SET deleted_at = ? WHERE id = ?";
    return new Promise((resolve, reject) => {
      pool.query(query, [new Date(), id], (err, results) => {
        if (err) return reject(err);
        resolve(results.affectedRows);
      });
    });
  }

  static async restore(id) {
    const query = "UPDATE test_series_test SET deleted_at = NULL WHERE id = ?";
    return new Promise((resolve, reject) => {
      pool.query(query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results.affectedRows);
      });
    });
  }

  static async permanentDelete(id) {
    const query = "DELETE FROM test_series_test WHERE id = ?";
    return new Promise((resolve, reject) => {
      pool.query(query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results.affectedRows);
      });
    });
  }
}

module.exports = TestSeriesTest;
