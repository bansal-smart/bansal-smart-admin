const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");

const { validateRequiredFields } = require("../../helpers/validationsHelper");
const { fetchRestaurants } = require("../Admin/CommonController");
const fs = require("fs");

const List = async (req, res) => {
  try {
    let getQuery = "SELECT * FROM roles";
    //  (req.query.status && req.query.status === 'trashed' ? ' WHERE deleted_at IS NOT NULL' : ' WHERE deleted_at IS NULL');

    const page_name =
      req.query.status && req.query.status === "trashed"
        ? "Trashed Roles List"
        : "Roles List";

    const restaurantId = req.session.restaurantId;

    if (userRole === "restaurant" && restaurantId) {
      getQuery += ` AND restaurant = ${restaurantId}`;
    }

    const menus = await new Promise((resolve, reject) => {
      pool.query(getQuery, function (error, result) {
        if (error) {
          req.flash("error", error.message);
          reject(error);
        } else {
          resolve(result);
        }
      });
    });

    res.render("admin/roles/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      menus: menus,
      page_name: page_name,
      create_url: "/admin/roles-create",
      req: req,
    });
  } catch (error) {
    console.log(error.message);
    req.flash("error", error.message);
  }
};

const Create = async (req, res) => {
  try {
    const menuId = req.params.roleId;

    // Fetch permissions from the table
    const permissions = await getPermissionsFromTable();

    // Group permissions by parent_id
    const permissionGroups = permissions.reduce((acc, permission) => {
      if (!acc[permission.parent_id]) {
        acc[permission.parent_id] = [];
      }
      acc[permission.parent_id].push(permission);
      return acc;
    }, {});

    // Now we can filter the parent permissions and assign their children
    const parentPermissions = permissionGroups[0] || []; // Parent permissions have parent_id = 0
    const parentWithChildren = parentPermissions.map((parent) => {
      return {
        parent: parent,
        children: permissionGroups[parent.id] || [], // Get children for each parent
      };
    });

    // Query to get the menu (role) by ID
    const getMenuQuery = "SELECT * FROM roles WHERE id = ?";
    const menu = await new Promise((resolve, reject) => {
      pool.query(getMenuQuery, [menuId], function (error, result) {
        if (error) {
          console.error(error);
          req.flash("error", error.message);
          reject(error);
        } else {
          resolve(result[0]);
        }
      });
    });
    const getAssignedPermissionsQuery =
      "SELECT permission_id FROM role_permissions WHERE role_id = ?";
    const assignedPermissions = await new Promise((resolve, reject) => {
      pool.query(
        getAssignedPermissionsQuery,
        [menuId],
        function (error, result) {
          if (error) return reject(error);
          // Extract permission_id into flat array
          resolve(result.map((row) => row.permission_id));
        }
      );
    });

    // Render the view with the fetched data
    res.render("admin/roles/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      menu: menu,
      assignedPermissions: assignedPermissions, // 🔥 pass assigned permissions
      permissions: parentWithChildren, // Pass the grouped permissions with children to the view
      form_url: "/admin/roles-update/" + req.params.roleId,
      page_name: "Create Role / Permitions",
    });
  } catch (error) {
    console.error(error);
    req.flash("error", error.message);
    res.redirect("back");
  }
};

const Store = async (req, res) => {
  console.log(req.body);

  try {
    let menu_images = [];
    if (req.files && req.files.length > 0) {
      menu_images = req.files.map((file) => file.path.replace(/\\/g, "/"));
    }

    const { name, price, description, restaurant, slug, status } = req.body;

    let tags = "";
    if (typeof tag === "string" && tag.trim() !== "") {
      const tagsArray = tag.split(",").map((tag) => tag.trim());
      tags = tagsArray.join(",");
    }

    const requiredFields = ["name", "slug", "price", "restaurant", "status"];
    const missingFields = validateRequiredFields(req, res, requiredFields);

    if (missingFields.length > 0) {
      req.flash("error", missingFields[0].message);
      return res.redirect("/admin/menu-create");
    }

    const insertQuery =
      "INSERT INTO menus (name, price, description, restaurant, slug, status) VALUES (?, ?, ?, ?, ?, ?)";
    const values = [name, price, description, restaurant, slug, status];

    pool.query(insertQuery, values, async function (error, result) {
      if (error) {
        console.error(error);
        req.flash("error", error.message);
      } else {
        try {
          const menuId = result.insertId;

          const sharp = require("sharp");

          if (menu_images.length > 0) {
            const insertImageQuery =
              "INSERT INTO menu_images (menu_id, image_path) VALUES (?, ?)";
            for (let i = 0; i < menu_images.length; i++) {
              const image = await sharp(menu_images[i]);
              const metadata = await image.metadata();
              const webpPath = menu_images[i].replace(metadata.format, "webp");
              await image
                .resize()
                .webp({ quality: 80 })
                .toFormat("webp")
                .toFile(webpPath);
              await pool.query(insertImageQuery, [menuId, webpPath]);

              if (i === 0) {
                const updateQuery =
                  "UPDATE menus SET restro_image = ? WHERE id = ?";
                await pool.query(updateQuery, [webpPath, menuId]);
              }

              // fs.unlinkSync(menu_images[i]);

              fs.unlink(menu_images[i], (err) => {
                if (err) {
                  console.error(err);
                }
              });
            }
          }
        } catch (insertionError) {
          console.error(insertionError);
          req.flash("error", insertionError.message);
        }

        req.flash("success", "Saved Successfully");
      }
      res.redirect("/admin/menu-list");
    });
  } catch (error) {
    console.error(error);
    req.flash("error", error.message);
    res.redirect("/admin/menu-create");
  }
};
const Edit = async (req, res) => {
  try {
    const menuId = req.params.roleId;

    // Fetch permissions from the table
    const permissions = await getPermissionsFromTable();

    // Group permissions by parent_id
    const permissionGroups = permissions.reduce((acc, permission) => {
      if (!acc[permission.parent_id]) {
        acc[permission.parent_id] = [];
      }
      acc[permission.parent_id].push(permission);
      return acc;
    }, {});

    // Now we can filter the parent permissions and assign their children
    const parentPermissions = permissionGroups[0] || []; // Parent permissions have parent_id = 0
    const parentWithChildren = parentPermissions.map((parent) => {
      return {
        parent: parent,
        children: permissionGroups[parent.id] || [], // Get children for each parent
      };
    });

    // Query to get the menu (role) by ID
    const getMenuQuery = "SELECT * FROM roles WHERE id = ?";
    const menu = await new Promise((resolve, reject) => {
      pool.query(getMenuQuery, [menuId], function (error, result) {
        if (error) {
          console.error(error);
          req.flash("error", error.message);
          reject(error);
        } else {
          resolve(result[0]);
        }
      });
    });
    const getAssignedPermissionsQuery =
      "SELECT permission_id FROM role_permissions WHERE role_id = ?";
    const assignedPermissions = await new Promise((resolve, reject) => {
      pool.query(
        getAssignedPermissionsQuery,
        [menuId],
        function (error, result) {
          if (error) return reject(error);
          // Extract permission_id into flat array
          resolve(result.map((row) => row.permission_id));
        }
      );
    });

    // Render the view with the fetched data
    res.render("admin/roles/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      menu: menu,
      assignedPermissions: assignedPermissions, // 🔥 pass assigned permissions
      permissions: parentWithChildren, // Pass the grouped permissions with children to the view
      form_url: "/admin/roles-update/" + req.params.roleId,
      page_name: "Edit",
    });
  } catch (error) {
    console.error(error);
    req.flash("error", error.message);
    res.redirect("back");
  }
};
// Helper function to get permissions from the table
const getPermissionsFromTable = async () => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM permissions"; // Replace with your actual table name

    pool.query(query, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};
const Update = (req, res) => {
  const roleIdParam = req.params.roleId;
  const roleId = parseInt(roleIdParam, 10);
  const isInsert = !roleId || roleIdParam === "null" || roleIdParam === "0";

  const { name, status, permissions = [] } = req.body;

  // Validation
  const errors = {};
  if (!name?.trim()) errors.name = ["Role Name is required"];
  if (!["0", "1"].includes(status))
    errors.status = ["Status must be '0' or '1'"];

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  const permissionValues = permissions.map((id) => parseInt(id, 10));

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Connection error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database connection error" });
    }

    const handlePermissions = (finalRoleId, isNew = false) => {
      connection.query(
        "DELETE FROM role_permissions WHERE role_id = ?",
        [finalRoleId],
        (delErr) => {
          if (delErr) {
            connection.release();
            console.error("Error deleting old permissions:", delErr);
            return res.status(500).json({
              success: false,
              message: "Error resetting permissions",
            });
          }

          if (permissionValues.length === 0) {
            connection.release();
            return res.status(200).json({
              success: true,
              message: isNew
                ? "Role created successfully with no permissions"
                : "Role updated successfully with no permissions",
              redirect_url: "/admin/roles-list",
            });
          }

          const permissionPairs = permissionValues.map((permId) => [
            finalRoleId,
            permId,
          ]);

          const insertPermSql =
            "INSERT INTO role_permissions (role_id, permission_id) VALUES ?";
          connection.query(insertPermSql, [permissionPairs], (permErr) => {
            connection.release();
            if (permErr) {
              console.error("Error inserting permissions:", permErr);
              return res.status(500).json({
                success: false,
                message: "Error updating permissions",
              });
            }

            return res.status(200).json({
              success: true,
              message: isNew
                ? "Role and permissions created successfully"
                : "Role and permissions updated successfully",
              redirect_url: "/admin/roles-list",
            });
          });
        }
      );
    };

    if (isInsert) {
      const insertSql = "INSERT INTO roles (name, status) VALUES (?, ?)";
      connection.query(
        insertSql,
        [name.trim(), status],
        (insertErr, result) => {
          if (insertErr) {
            connection.release();
            console.error("Error inserting role:", insertErr);
            return res
              .status(500)
              .json({ success: false, message: "Error inserting role" });
          }
          const newRoleId = result.insertId;
          handlePermissions(newRoleId, true);
        }
      );
    } else {
      const updateSql = "UPDATE roles SET name = ?, status = ? WHERE id = ?";
      connection.query(
        updateSql,
        [name.trim(), status, roleId],
        (updateErr) => {
          if (updateErr) {
            connection.release();
            console.error("Error updating role:", updateErr);
            return res
              .status(500)
              .json({ success: false, message: "Error updating role" });
          }
          handlePermissions(roleId, false);
        }
      );
    }
  });
};

// const Update = async (req, res) => {
//   try {
//     const roleId = req.params.roleId;  // Get role ID from URL parameter
//     console.log('Role ID:', roleId);

//     const permissions = req.body.permissions || [];
//     console.log('Selected Permissions:', permissions);

//     if (permissions.length === 0) {
//       console.log('Assigning all permissions to the role...');

//       const [allPermissions] = await pool.query('SELECT id FROM permissions');
//       if (!allPermissions.length) {
//         console.log('No permissions found in the database.');
//         req.flash('error', 'No permissions available to assign.');
//         return res.redirect('back');
//       }

//       const permissionIds = allPermissions.map(permission => permission.id);  // Get all permission IDs
//       console.log('All Permissions:', permissionIds);

//       await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

//       // Prepare permission values for insertion
//       const permissionValues = permissionIds.map(permissionId => [roleId, permissionId]);

//       await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [permissionValues]);
//       console.log('All permissions successfully assigned to the role.');

//       req.flash('success', 'All permissions successfully assigned to role');
//     } else {
//       console.log('Updating selected permissions for the role...');

//       // await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

//       const permissionValues = permissions.map(permissionId => [roleId, permissionId]);
//       console.log('Selected Permissions:', permissionValues);

//       await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [permissionValues]);
//       console.log('Permissions successfully updated for role.');

//       // Flash success message
//       req.flash('success', 'Permissions successfully updated for role');
//     }

//     // Redirect back to the edit role page
//     res.redirect('/admin/roles-edit/' + roleId);
//   } catch (error) {
//     console.error(error);
//     // Flash error message if something goes wrong
//     req.flash('error', 'Error updating permissions for role');
//     res.redirect('back');
//   }
// };

const Delete = async (req, res) => {
  try {
    const menuId = req.params.menuId;

    const softDeleteQuery = "UPDATE menus SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [menuId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Menu soft deleted successfully");
    return res.redirect("/admin/menu-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/menu-list`);
  }
};

const Restore = async (req, res) => {
  try {
    const menuId = req.params.menuId;

    const RestoreQuery = "UPDATE menus SET deleted_at = null WHERE id = ?";

    pool.query(RestoreQuery, [menuId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Menu Restored successfully");
    return res.redirect("/admin/menu-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/menu-list`);
  }
};

const PermanentDelete = async (req, res) => {
  try {
    const menuId = req.params.menuId;

    const DeleteQuery = "DELETE FROM menus WHERE id = ?";

    pool.query(DeleteQuery, [menuId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Menu deleted successfully");
    return res.redirect("/admin/menu-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/menu-list`);
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
};
