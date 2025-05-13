const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");
const { validateRequiredFields } = require("../../helpers/validationsHelper");

const List = async (req, res) => {
  try {
    let getQuery =
      "SELECT * FROM front_users" +
      (req.query.status && req.query.status === "trashed"
        ? " WHERE deleted_at IS NOT NULL"
        : " WHERE deleted_at IS NULL") +
      "  order by id desc";

    console.log(getQuery);
    const page_name =
      req.query.status && req.query.status === "trashed"
        ? "Trashed Customer List"
        : "Customer List";

    const customers = await new Promise((resolve, reject) => {
      pool.query(getQuery, function (error, result) {
        if (error) {
          req.flash("error", error.message);
          reject(error);
        } else {
          resolve(result);
        }
      });
    });

    res.render("admin/customer/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      customers: customers,
      req: req,
      page_name: page_name,
    });
  } catch (error) {
    req.flash("error", error.message);
  }
};

const Create = async (req, res) => {
  try {
    const customer = undefined;
    const shipaddresses = undefined;
    const billaddresses = undefined;

    res.render("admin/customer/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      customer: customer,
      shipaddresses: shipaddresses,
      billaddresses: billaddresses,
      form_url: "/admin/customer-store",
      page_name: "Create Student",
    });
  } catch (error) {
    console.log(error.message);
  }
};


const Store = async (req, res) => {
  try {
    let { name, email, mobile, category_id, class_id, status } = req.body;

    name = name?.trim();
    email = email?.trim();
    mobile = mobile?.trim();

    const errors = {};

    // Validation checks
    if (!name) {
      errors.name = errors.name || [];
      errors.name.push("Name is required");
    }

    if (!email) {
      errors.email = errors.email || [];
      errors.email.push("Email is required");
    }

    if (!mobile) {
      errors.mobile = errors.mobile || [];
      errors.mobile.push("Mobile is required");
    } else if (!/^\d{10}$/.test(mobile)) {
      errors.mobile = errors.mobile || [];
      errors.mobile.push("Mobile number must be 10 digits");
    }

    if (!category_id) {
      errors.category_id = errors.category_id || [];
      errors.category_id.push("Category is required");
    }

    if (!class_id) {
      errors.class_id = errors.class_id || [];
      errors.class_id.push("Class is required");
    }

    if (status === undefined || status === null || status === "") {
      errors.status = errors.status || [];
      errors.status.push("Status is required");
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isValidMobile = /^\d{10}$/.test(mobile);

    if (email && !isValidEmail) {
      errors.email = errors.email || [];
      errors.email.push("Invalid email format");
    }

    // if (mobile && !isValidMobile) {
    //   errors.mobile = errors.mobile || [];
    //   errors.mobile.push("Mobile number must be 10 digits");
    // }

    

    // Check if the email already exists
    pool.query(
      "SELECT COUNT(*) AS email_count FROM front_users WHERE email = ?",
      [email],
      (err, results) => {
        if (err) {
          console.error('Error executing query:', err.stack);
          return res.status(500).json({
            success: false,
            errors: [{ message: 'Database error' }],
          });
        }

        if (results[0].email_count > 0) {
          return res.status(409).json({
            success: false,
            errors: [{ field: 'email', msg: 'Email already exists' }],
          });
        }

        if (Object.keys(errors).length > 0) {
            return res.status(422).json({
              status: false,
              errors,
              message: Object.values(errors)[0][0],  // This will return the first error message
            });
          }

        // If email doesn't exist, proceed with insertion
        const insertQuery = `
          INSERT INTO front_users (name, email, mobile, category_id, class_id, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        pool.query(insertQuery, [name, email, mobile, category_id, class_id, status], (err) => {
            if (err) {
              console.error('Error executing query:', err); // Log the full error
              return res.status(500).json({
                success: false,
                errors: [{ message: `Database error: ${err.message}` }], // Return the actual error message
              });
            }
          
            return res.status(200).json({
                success: true,
                redirect_url: 'admin/customers/customer-list',
                message: 'Customer saved successfully',
              });
          });
      }
    );
  } catch (error) {
    console.error(error); // Log actual error
    return res.status(500).json({
      success: false,
      errors: [{ message: error.message || 'Unexpected server error' }],
    });
  }
};

const Edit = async (req, res) => {
  try {
    const customerId = req.params.customerId;

    const getCustomerQuery = "SELECT * FROM front_users WHERE id = ?";
    const customer = await new Promise((resolve, reject) => {
      pool.query(getCustomerQuery, [customerId], function (error, result) {
        if (error) {
          console.error(error);
          req.flash("error", error.message);
          reject(error);
        } else {
          resolve(result[0]);
        }
      });
    });





    res.render("admin/customer/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      customer: customer,
      form_url: "/admin/customer-update/" + customerId,
      page_name: "Edit",
    });
  } catch (error) {
    console.log(error.message);
  }
};

const Update = async (req, res) => {
    try {
      const userId = req.params.customerId;
      let { name, email, mobile, category_id, class_id, status } = req.body;
  
      // Trim the input fields
      name = name?.trim();
      email = email?.trim();
      mobile = mobile?.trim();
  
      const errors = {};
  
      // Validation checks
      if (!name) {
        errors.name = errors.name || [];
        errors.name.push("Name is required");
      }
  
      if (!email) {
        errors.email = errors.email || [];
        errors.email.push("Email is required");
      }
  
      if (!mobile) {
        errors.mobile = errors.mobile || [];
        errors.mobile.push("Mobile is required");
      } else if (!/^\d{10}$/.test(mobile)) {
        errors.mobile = errors.mobile || [];
        errors.mobile.push("Mobile number must be 10 digits");
      }
  
      if (!category_id) {
        errors.category_id = errors.category_id || [];
        errors.category_id.push("Category is required");
      }
  
      if (!class_id) {
        errors.class_id = errors.class_id || [];
        errors.class_id.push("Class is required");
      }
  
      if (status === undefined || status === null || status === "") {
        errors.status = errors.status || [];
        errors.status.push("Status is required");
      }
  
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
      if (email && !isValidEmail) {
        errors.email = errors.email || [];
        errors.email.push("Invalid email format");
      }
  
      // If there are validation errors, return them
      if (Object.keys(errors).length > 0) {
        return res.status(422).json({
          success: false,
          errors,
          message: Object.values(errors)[0][0], // Return the first error message
        });
      }
  
      // Check if the email already exists (excluding the current user's email)
      pool.query(
        "SELECT COUNT(*) AS email_count FROM front_users WHERE email = ? AND id != ?",
        [email, userId],
        (err, results) => {
          if (err) {
            console.error('Error executing query:', err); // Log the full error
            return res.status(500).json({
              success: false,
              errors: [{ message: `Database error: ${err.message || err.sqlMessage}` }],
            });
          }
  
          // If email already exists, return error
          if (results[0].email_count > 0) {
            return res.status(409).json({
              success: false,
              errors: [{ field: 'email', msg: 'Email already exists' }],
            });
          }
  
          // Proceed with updating the customer
          const updateQuery = `
            UPDATE front_users
            SET name = ?, email = ?, mobile = ?, category_id = ?, class_id = ?, status = ?
            WHERE id = ?
          `;
  
          pool.query(updateQuery, [name, email, mobile, category_id, class_id, status, userId], (err) => {
            if (err) {
              console.error('Error executing query:', err); // Log the full error
              return res.status(500).json({
                success: false,
                errors: [{ message: `Database error: ${err.message || err.sqlMessage}` }],
              });
            }
  
            // Return success response
            return res.status(200).json({
              success: true,
              redirect_url: '/admin/customer-list', // Or you can return a success message
              message: 'Customer updated successfully',
            });
          });
        }
      );
    } catch (error) {
      console.error('Unexpected error:', error); // Log the actual error for debugging
      return res.status(500).json({
        success: false,
        errors: [{ message: error.message || 'Unexpected server error' }],
      });
    }
  };
  
  
  
const Delete = async (req, res) => {
  try {
    const customerId = req.params.customerId;

    const softDeleteQuery =
      "UPDATE front_users SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [customerId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Customer soft deleted successfully");
    return res.redirect("/admin/customer-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/customer-list`);
  }
};

const Restore = async (req, res) => {
  try {
    const customerId = req.params.customerId;

    const RestoreQuery = "UPDATE front_users SET deleted_at = null WHERE id = ?";

    pool.query(RestoreQuery, [customerId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Customer Restored successfully");
    return res.redirect("/admin/customer-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/customer-list`);
  }
};

const PermanentDelete = async (req, res) => {
  try {
    const customerId = req.params.customerId;

    const DeleteQuery = "DELETE FROM front_users WHERE id = ?";

    pool.query(DeleteQuery, [customerId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Customer deleted successfully");
    return res.redirect("/admin/customer-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/customer-list`);
  }
};

const Show = async (req, res) => {
  try {
    const customerId = req.params.customerId;

    const getCustomerQuery = "SELECT * FROM front_users WHERE id = ?";
    const customer = await new Promise((resolve, reject) => {
      pool.query(getCustomerQuery, [customerId], function (error, result) {
        if (error) {
          console.error(error);
          req.flash("error", error.message);
          reject(error);
        } else {
          resolve(result[0]);
        }
      });
    });

    res.render("admin/customer/show", {
      success: req.flash("success"),
      error: req.flash("error"),
      customer: customer,
      form_url: "/admin/customer-update/" + customerId,
      page_name: "Show",
    });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  Create,
  List,
  Store,
  Edit,
  Update,
  Delete,
  Restore,
  PermanentDelete,
  Show,
};
