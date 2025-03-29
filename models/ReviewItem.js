const mongoose = require("mongoose");

const reviewItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// 🛠 تحديث متوسط التقييم بعد الحفظ
reviewItemSchema.post("save", async function () {
  try {
    const Item = mongoose.model("Item"); // استدعاء المودل
    await Item.calculateAverageRating(this.item);
  } catch (error) {
    console.error("Error updating average rating:", error);
  }
});

// 🛠 تحديث متوسط التقييم بعد الحذف
reviewItemSchema.post("remove", async function () {
  try {
    const Item = mongoose.model("Item");
    await Item.calculateAverageRating(this.item);
  } catch (error) {
    console.error("Error updating average rating after deletion:", error);
  }
});

const ReviewItem = mongoose.model("ReviewItem", reviewItemSchema);

module.exports = { ReviewItem };
