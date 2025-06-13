const TestSeriesTest = require("../../models/TestSeriesTest");
const Helper = require("../../helpers/Helper");
const path = require("path");
const fs = require("fs");

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

module.exports = {
  List: async (req, res) => {
    try {
      const status = req.query.status === "trashed" ? "trashed" : "active";
      const tests = await TestSeriesTest.list(status);
      res.render("admin/exam/list", {
        success: req.flash("success"),
        error: req.flash("error"),
        customers: tests,
        req,
        page_name:
          status === "trashed"
            ? "Trashed Exam List"
            : "Exam List",
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
      handleError(
        res,
        req,
        "An unexpected error occurred",
        "/admin/exam-list"
      );
    }
  },

  Edit: async (req, res) => {
    try {
      const course = await TestSeriesTest.findById(req.params.postId);

      console.log(course);
      if (!course)
        return handleError(
          res,
          req,
          "Exam not found",
          "/admin/exam-list"
        );

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
