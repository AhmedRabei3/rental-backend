const { getAddressFromCoordinates } = require("./axios");
const Joi = require("joi");
const { ReviewItem } = require("../models/ReviewItem");
const mongoose = require("mongoose");

// تحويل التواريخ إلى UTC بشكل آمن
function toUTC(date) {
  return date instanceof Date ? new Date(date.toISOString()) : date;
}

// وظائف إدارة بيانات العناصر
const itemSchemaFunctions = (itemSchema) => {
  itemSchema.pre("save", async function (next) {
    if (this.expireAt) this.expireAt = toUTC(this.expireAt);
    if (!Array.isArray(this.rentalPeriods)) {
      this.rentalPeriods = []; // تأكد أنها دائماً مصفوفة
    } else {
      this.rentalPeriods = this.rentalPeriods.map((rental) => ({
        startDate: rental?.startDate ? toUTC(rental.startDate) : null,
        endDate: rental?.endDate ? toUTC(rental.endDate) : null,
      }));
    }
    // الاحتفاظ بالموقع الحالي في حال لم تُرسل إحداثيات جديدة
    if (
      !this.location ||
      !this.location.coordinates ||
      this.location.coordinates.length !== 2
    ) {
      this.location = this.isNew ? {} : this.location;
    } else {
      const [lon, lat] = this.location.coordinates;
      try {
        const addressData = await getAddressFromCoordinates(lat, lon);
        if (addressData && typeof addressData === "object") {
          this.location.street =
            addressData.street || this.location.street || "unknown";
          this.location.city =
            addressData.city || this.location.city || "unknown";
          this.location.country =
            addressData.country || this.location.country || "unknown";
        }
      } catch (error) {
        console.error("⚠️ Failed to fetch address, keeping existing data.");
      }
    }

    next();
  });

  /**
   * 🔄 إعداد العلاقات الظاهرية (Virtual Fields)
   */
  itemSchema.virtual("reviews", {
    ref: "ReviewItem",
    localField: "_id",
    foreignField: "item",
  });

  /**
   * 📊 جلب العناصر مع التفاصيل
   */
  itemSchema.statics.getItemsWithDetails = async function (
    filter,
    page,
    limit
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalItems = await this.countDocuments(filter);
    const items = await this.find(filter)
      .populate("category", "name")
      .populate("owner", "name email")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    return { items, totalItems };
  };

  /**
   * 🏷️ جلب العناصر المملوكة لمستخدم معين
   */
  itemSchema.statics.getItemsByOwner = async function (
    ownerId,
    page,
    limit,
    category,
    name,
    price
  ) {
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {
      owner: ownerId,
      ...(category && { category }),
      ...(name && { name: { $regex: name, $options: "i" } }),
      ...(price && {
        price: {
          ...(price.min && { $gte: Number(price.min) }),
          ...(price.max && { $lte: Number(price.max) }),
        },
      }),
    };

    const totalItems = await this.countDocuments(filter);

    const items = await this.find(filter)
      .populate("category", "name")
      .populate("owner", "name email")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .lean();

    return { items, totalItems };
  };

  /**
   * ⭐ حساب متوسط التقييم للعنصر
   */
  itemSchema.statics.calculateAverageRating = async function (itemId) {
    const objectId = new mongoose.Types.ObjectId(itemId);

    const result = await ReviewItem.aggregate([
      { $match: { item: objectId } },
      { $group: { _id: "$item", avgRating: { $avg: "$rating" } } },
    ]);

    console.log("🧮 Aggregation result:", result);
    const avgRating =
      result.length > 0 ? parseFloat(result[0].avgRating.toFixed(1)) : 0;

    await this.findByIdAndUpdate(itemId, { averageRating: avgRating });

    return avgRating;
  };

  /**
   * 📌 إضافة فهرس جغرافي لتحسين البحث حسب الموقع
   */
  itemSchema.index({ location: "2dsphere" });
};

// ✅ التحقق من صحة البيانات عند إنشاء عنصر جديد
const createItemSchema = Joi.object({
  name: Joi.string().required().trim(),
  description: Joi.string().required().trim().max(150),
  category: Joi.string().required(),
  condition: Joi.string().valid("new", "good", "used", "damaged").required(),
  rentalType: Joi.string()
    .valid("hourly", "daily", "weekly", "monthly")
    .required(),
  price: Joi.number().min(1).required(),
  owner: Joi.string(),
  longitude: Joi.number().required(),
  latitude: Joi.number().required(),
});

module.exports = {
  createItemValidation: (data) => createItemSchema.validate(data),
  itemSchemaFunctions,
};
