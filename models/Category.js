const mongoose = require("mongoose");
const Joi = require("joi");

// إنشاء مخطط الفئات
const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // يجب أن يشير إلى نفس النموذج
      default: null, // الفئات الرئيسية يكون هذا الحقل null
    },
    subcategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category", // التعديل هنا لجعل المرجع إلى نفس النموذج
      },
    ],
    icon: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// إنشاء النموذج
const Category = mongoose.model("Category", categorySchema);

// التحقق من صحة إدخال الفئة الجديدة باستخدام Joi
const newCatValidator = (obj) => {
  const schema = Joi.object({
    categoryName: Joi.string().trim().required(),
    parentCategory: Joi.string().allow(null),
    icon: Joi.string().allow(null),
  });
  return schema.validate(obj);
};

// تصدير النموذج ودالة التحقق
module.exports = { Category, newCatValidator };
