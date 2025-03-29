const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const userFunction = (userSchema) => {
  // إنشاء وتوقيع JSON Web Token
  userSchema.methods.generateToken = function () {
    return jwt.sign(
      {
        id: this._id,
        email: this.email,
        role: this.role,
        isActivated: this.isActivated,
        isBlocked: this.isBlocked,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
  };

  // حساب التقييم المتوسط وتحديث `serviceQuality`
  userSchema.statics.calculateAverageRating = async function (userId) {
    const result = await mongoose
      .model("Review")
      .aggregate([
        { $match: { user: userId } },
        { $group: { _id: "$user", avgRating: { $avg: "$rating" } } },
      ]);

    const avgRating = result.length > 0 ? result[0].avgRating : 0;

    await this.findByIdAndUpdate(userId, {
      averageRating: avgRating,
      serviceQuality:
        avgRating >= 4 ? "excellent" : avgRating >= 2.5 ? "good" : "bad",
    });
  };

  // تحديث التقييم المتوسط عند حفظ مستخدم جديد إذا كانت لديه مراجعات
  userSchema.post("save", async function (doc, next) {
    if (doc.reviews?.length > 0) {
      await doc.constructor.calculateAverageRating(doc._id);
    }
    next();
  });

  // قبل تحديث المستخدم، نتحقق مما إذا كانت التقييمات قد تغيرت
  userSchema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate();

    // إذا لم تتغير التقييمات، لا داعي لإعادة حساب التقييم
    if (!update.reviews) return next();

    try {
      const user = await this.model.findOne(this.getQuery());
      if (user) {
        await user.constructor.calculateAverageRating(user._id);
      }
    } catch (err) {
      return next(err);
    }

    next();
  });
};

module.exports = { userFunction };
