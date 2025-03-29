const router = require("express").Router();
const {
  createCategory,
  getCategories,
  deleteCategory,
  updateCategory,
  updateSubcategory,
  createSubcategory,
} = require("../controllers/categoryCrl");
const { verifyToken } = require("../middleware/verifyToken");
const { isAdmin, isValidId } = require("../middleware/verification");

// المسارات الخاصة بالفئات الرئيسية
router
  .route("/")
  .post([verifyToken, isAdmin], createCategory)
  .put([verifyToken, isAdmin], updateCategory)
  .get(getCategories);

// route to delete category and subcategory
router.delete("/:id", [isValidId, verifyToken, isAdmin], deleteCategory);

// المسارات الخاصة بالفئات الفرعية
router
  .route("/subcategory/:id")
  .post([isValidId, verifyToken, isAdmin], createSubcategory)
  .put([isValidId, verifyToken, isAdmin], updateSubcategory);

module.exports = router;
