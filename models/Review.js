const mongoose = require("mongoose");
const { User } = require("./User"); // تأكد من أن ملف User.js يحتوي على المخطط الصحيح
const Joi = require("joi");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // المستخدم الذي يتم تقييمه
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // المستخدم الذي قام بالتقييم
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1, // أقل تقييم 1
      max: 5, // أعلى تقييم 5
    },
    comment: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// ✅ منع المستخدم من تقييم نفسه
reviewSchema.pre("save", function (next) {
  if (this.user.equals(this.client)) {
    return next(new Error("لا يمكنك تقييم نفسك!"));
  }
  next();
});

// ✅ تحديث `averageRating` و `serviceQuality` عند إضافة مراجعة
reviewSchema.post("save", async function () {
  const reviews = await mongoose.model("Review").find({ user: this.user });

  const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
  const avgRating = reviews.length ? totalRating / reviews.length : 0;

  let serviceQuality = "bad";
  if (avgRating >= 4.5) serviceQuality = "excellent";
  else if (avgRating >= 3) serviceQuality = "good";

  await User.findByIdAndUpdate(this.user, {
    averageRating: avgRating,
    serviceQuality,
  });
});

// ✅ تحديث `averageRating` و `serviceQuality` عند حذف مراجعة
reviewSchema.post("remove", async function () {
  const reviews = await mongoose.model("Review").find({ user: this.user });

  const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
  const avgRating = reviews.length ? totalRating / reviews.length : 0;

  let serviceQuality = "not rating";
  if (avgRating >= 4.5) serviceQuality = "excellent";
  else if (avgRating >= 3) serviceQuality = "good";

  await User.findByIdAndUpdate(
    this.user,
    {
      averageRating: avgRating,
      serviceQuality,
    },
    {
      new: true,
    }
  );
});

// إنشاء `Review` Model
const Review = mongoose.model("Review", reviewSchema);
const validateReview = (data) => {
  const schema = Joi.object({
    userId: Joi.string().required(), // المستخدم الذي يتم تقييمه
    rating: Joi.number().min(1).max(5).required(), // التقييم من 1 إلى 5
    comment: Joi.string().allow("").optional(), // تعليق اختياري
  });
  return schema.validate(data);
};

module.exports = { Review, validateReview };
