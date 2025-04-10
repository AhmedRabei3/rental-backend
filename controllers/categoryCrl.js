const asyncHandler = require("express-async-handler");
const { Category, newCatValidator } = require("../models/Category");

/**
 * @description إنشاء فئة رئيسية جديدة
 * @route   /api/category
 * @method  POST
 * @access  private (admin)
 * @param   {categoryName , icon}
 */
module.exports.createCategory = asyncHandler(async (req, res) => {
  const { error } = newCatValidator(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  const oldCat = await Category.findOne({
    categoryName: req.body.categoryName,
  });
  if (oldCat)
    return res.status(400).json({ message: "this category is exist" });
  const category = await Category.create(req.body);
  return res
    .status(201)
    .json({ message: "Category created successfully", category });
});

/**
 * @description جلب جميع الفئات الرئيسية مع الفئات الفرعية
 * @route /api/category
 * @method GET
 * @access  public
 */
module.exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ parentCategory: null }).populate(
    "subcategories"
  );
  return res.status(200).json({ categories });
});

/**
 * @description تحديث الفئة
 * @route   /api/category/:id
 * @method PUT
 * @access private (admin)
 */
module.exports.updateCategory = asyncHandler(async (req, res) => {
  const { error } = newCatValidator(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!category) return res.status(404).json({ message: "Category not found" });

  return res
    .status(200)
    .json({ message: "Category updated successfully", category });
});

/**
 * @description حذف الفئة الرئيسية وجميع الفئات الفرعية المرتبطة بها
 * @route /api/category/:id
 * @method  DELETE
 * @access private (admin)
 */
module.exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });

  // حذف جميع الفئات الفرعية المرتبطة بهذه الفئة
  await Category.deleteMany({ parentCategory: category._id });

  // حذف الفئة الرئيسية نفسها
  await Category.findByIdAndDelete(req.params.id);

  return res
    .status(200)
    .json({ message: "Category and subcategories deleted successfully" });
});

/**
 * @description إنشاء فئة فرعية جديدة
 * @route /api/category/subcategory/:id
 * @method POST
 * @access private (admin)
 */
module.exports.createSubcategory = asyncHandler(async (req, res) => {
  const { error } = newCatValidator(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const parentCategory = await Category.findById(req.params.id);
  if (!parentCategory)
    return res.status(404).json({ message: "Parent category not found" });

  const subcategory = await Category.create({
    categoryName: req.body.categoryName,
    parentCategory: parentCategory._id,
  });

  // إضافة الفئة الفرعية إلى الفئة الرئيسية
  parentCategory.subcategories.push(subcategory._id);
  await parentCategory.save();

  return res
    .status(201)
    .json({ message: "Subcategory created successfully", subcategory });
});

/**
 * @description تحديث الفئة الفرعية
 * @route /api/category/subcategory/:id
 * @method PUT
 * @access private (admin)
 */
module.exports.updateSubcategory = asyncHandler(async (req, res) => {
  const { error } = newCatValidator(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const subcategory = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  if (!subcategory)
    return res.status(404).json({ message: "Subcategory not found" });

  return res
    .status(200)
    .json({ message: "Subcategory updated successfully", subcategory });
});
