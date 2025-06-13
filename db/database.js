// const mysql = require("mysql");

// const pool = mysql.createPool({
//   connectionLimit: 10,
//   host: "localhost",
//   user: "root", // corrected from "customer"
//   password: "55AIViZznakaDjIS",
//   database: "bansal",
//   port: 3306,
// });

// pool.getConnection((err, connection) => {
//   if (err) {
//     console.error("Database connection failed:", err);
//     return;
//   }
//   console.log("Connected to MySQL database");
//   connection.release(); // release connection back to pool
// });

// module.exports = pool;

// just comment return 

const mysql = require('mysql2');

const pool = mysql.createPool({
  host: '193.203.162.34',
  user: 'bansal_user', // Replace with your MySQL username
  password: 'Bansal@@2000', // Replace with your MySQL password
  database: 'bansal_db', // Replace with your database name
  connectionLimit: 10, // Max number of simultaneous connection
  port:3306,
});

// Export the pool for use in your controllers
module.exports = pool;
