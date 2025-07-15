const dbPool = require('../db/database');

const Customer = {
    findByMobile: (mobileNumber, callback) => {
        dbPool.query(
            'SELECT * FROM front_users WHERE mobile = ?',
            [mobileNumber],
            (error, results) => {
                if (error) return callback(error, null);
                callback(null, results[0]);
            }
        );
    },

    saveOtp: (mobileNumber, otp, callback) => {
        const expiresIn = Date.now() + 5 * 60 * 1000; // 5 minutes
        dbPool.query(
            'UPDATE front_users SET register_otp = ?, otp_expires = ? WHERE mobile = ?',
            [otp, expiresIn, mobileNumber],
            (error, results) => {
                if (error) return callback(error, null);
                if (results.affectedRows === 0) {
                    return callback(new Error('Mobile number not found to update OTP'), null);
                }
                callback(null, results);
            }
        );
    },

 verifyOtp: (mobileNumber, otp, callback) => {
    const currentTime = Date.now();
    dbPool.query(
        'SELECT * FROM front_users WHERE mobile = ? AND register_otp = ?',
        [mobileNumber, otp, currentTime],
        (error, results) => {
            if (error) return callback(error, null);
            callback(null, results[0] || null);
        }
    );
},

  create: (mobileNumber, callback) => {
    const query = `
        INSERT INTO front_users (mobile, role, verify_otp_status) 
        VALUES (?, ?, ?)
    `;
    const values = [mobileNumber, 'student', 1];

    dbPool.query(query, values, (error, results) => {
        if (error) return callback(error, null);
        callback(null, {
            id: results.insertId,
            mobile: mobileNumber,
            role: 'student',
            verify_otp_status: 1
        });
    });
},
    updateByMobile: (mobileNumber, updateData, callback) => {
  const fields = [];
  const values = [];

  for (const key in updateData) {
    fields.push(`${key} = ?`);
    values.push(updateData[key]);
  }

  values.push(mobileNumber); // for WHERE clause

  const sql = `UPDATE front_users SET ${fields.join(', ')} WHERE mobile = ?`;

  dbPool.query(sql, values, (error, results) => {
    if (error) return callback(error, null);
    callback(null, results);
  });
},
};



module.exports = Customer;
