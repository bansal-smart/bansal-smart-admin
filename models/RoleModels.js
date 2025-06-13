const pool = require("../db/database");

class TestSeriesTest {
  static withCategory() {
    return `
      SELECT 
        tst.*, 
        c.category_name,
        ts.name AS test_series_name
      FROM live_test tst
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
    category_id,
    test_series_id,
    test_name,
    excludeId = null
  ) {
    const query = `
      SELECT id FROM live_test 
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
      INSERT INTO live_test 
      (category_id, test_series_id, test_name, description, image, created_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.category_id,
      data.test_series_id,
      data.test_name,
      data.description || "",
      data.image || null,
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
    UPDATE live_test SET 
      category_id = ?,
      test_series_id = ?,
      test_name = ?,
      description = ?,
      image = COALESCE(?, image),
      updated_at = ?
    WHERE id = ?
  `;
  const params = [
    data.category_id,
    data.test_series_id,
    data.test_name,
    data.description || "",
    data.image || null,
    data.updated_at || new Date(),
    id,
  ];

  try {
    const [result] = await pool.query(query, params);
    return result.affectedRows; // number of rows updated
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
