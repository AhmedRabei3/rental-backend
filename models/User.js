const mongoose = require("mongoose");
const Joi = require("joi");
const { userFunction } = require("../utils/userSchemaFunctions");

// تعريف الـ Schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true, minlength: 6 },
    profileImage: {
      type: Object,
      default: {
        url: "https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_640.png",
        public_id: "placeholder",
      },
    },
    role: { type: String, enum: ["user", "admin", "owner"], default: "user" },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    isActivated: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
    },
    serviceQuality: {
      type: String,
      enum: ["no rating", "bad", "good", "excellent", "superb"],
      default: "no rating",
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
userSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "user",
});
userSchema.virtual("items", {
  ref: "Item",
  localField: "_id",
  foreignField: "owner",
});

userFunction(userSchema);
// إنشاء الـ User Model
const User = mongoose.model("User", userSchema);

// التحقق من صحة بيانات التسجيل
const registerValidation = (user) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });
  return schema.validate(user);
};

// التحقق من صحة بيانات تسجيل الدخول
const loginValidation = (user) => {
  const schema = Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().trim().min(6).required(),
  });
  return schema.validate(user);
};

// التحقق من صحة تحديث الملف الشخصي
const updateProfileValidation = (user) => {
  const schema = Joi.object({
    name: Joi.string().trim(),
    email: Joi.string().trim().email(),
  });
  return schema.validate(user);
};

module.exports = {
  User,
  registerValidation,
  loginValidation,
  updateProfileValidation,
};
