const mongoose = require("mongoose");

const priceSchema = new mongoose.Schema(
  {
    activationPrice: { type: Number, required: true, default: 0 },
    bookingPrice: { type: Number, required: true, default: 0 },
    monthlySubscription: { type: Number, required: true, default: 0 },
    platformFee: { type: Number, default: 0 },
    referralAchieve: { type: Number, default: 0 },
    discountPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ✅ إنشاء أو تحديث الأسعار مع ضمان سجل واحد فقط
priceSchema.statics.setPricing = async function (pricingData) {
  return await this.findOneAndUpdate({}, pricingData, {
    new: true,
    upsert: true,
  });
};

// ✅ جلب الأسعار، وإنشاء سجل جديد إذا لم يكن موجودًا
priceSchema.statics.getPricing = async function () {
  return (await this.findOne()) || (await this.create({}));
};

const Price = mongoose.model("Price", priceSchema);
module.exports = Price;
