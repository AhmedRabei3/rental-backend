const asyncHandler = require("express-async-handler");
const { Review, validateReview } = require("../models/Review");
const { ReviewItem, addReviewValidation } = require("../models/ReviewItem");
const { Item } = require("../models/Item");
const { User } = require("../models/User");

/**
 * @description إضافة مراجعة إلى عنصر
 * @route POST /api/items/review/:id
 * @access private (user)
 */
module.exports.addItemReview = asyncHandler(async (req, res) => {
  /*   const { error } = addReviewValidation(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
 */
  const { rating, comment } = req.body;
  const itemId = req.params.id;
  const userId = req.user.id;

  const item = await Item.findById(itemId).lean();
  if (!item) return res.status(404).json({ message: "العنصر غير موجود" });

  const review = await ReviewItem.findOneAndUpdate(
    { item: itemId, user: userId },
    { rating, comment },
    { new: true, upsert: true }
  );
  const avgRating = await Item.calculateAverageRating(itemId);
  console.log(avgRating);
  await Item.findByIdAndUpdate(
    itemId,
    { averageRating: avgRating },
    { new: true }
  );

  res.status(201).json({ message: "تمت إضافة التقييم بنجاح", review });
});

/**
 * @description إضافة مراجعة إلى مستخدم
 * @route POST /api/users/review/:id
 * @access private (user)
 */
module.exports.addUserReview = asyncHandler(async (req, res) => {
  const { error } = validateReview(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { rating, comment } = req.body;
  const userId = req.params.id;
  const clientId = req.user.id;

  if (userId === clientId) {
    return res.status(400).json({ message: "لا يمكنك تقييم نفسك!" });
  }

  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

  const review = await Review.findOneAndUpdate(
    { user: userId, client: clientId },
    { rating, comment },
    { new: true, upsert: true }
  );

  const avgResult = await Review.aggregate([
    { $match: { user: userId } },
    { $group: { _id: "$user", averageRating: { $avg: "$rating" } } },
  ]);

  const averageRating = avgResult.length ? avgResult[0].averageRating : 0;

  let serviceQuality = "not rating";
  if (averageRating >= 4) serviceQuality = "excellent";
  else if (averageRating >= 3) serviceQuality = "good";
  else if (averageRating >= 2) serviceQuality = "bad";

  await User.findByIdAndUpdate(userId, { averageRating, serviceQuality });

  res.status(201).json({ message: "تمت إضافة المراجعة بنجاح!", review });
});

/**
 * @description حذف مراجعة عنصر
 * @route DELETE /api/items/review/:id
 * @access private (user أو admin)
 */
module.exports.deleteItemReview = asyncHandler(async (req, res) => {
  const review = await ReviewItem.findById(req.params.id).lean();
  if (!review) return res.status(404).json({ message: "المراجعة غير موجودة" });

  if (!review.user.equals(req.user.id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "غير مصرح لك بحذف هذه المراجعة!" });
  }

  await Item.findByIdAndUpdate(review.item, { $pull: { reviews: review._id } });
  await ReviewItem.findByIdAndDelete(req.params.id);
  await Item.calculateAverageRating(review.item);

  res.status(200).json({ message: "تم حذف التقييم بنجاح" });
});

/**
 * @description حذف مراجعة مستخدم
 * @route DELETE /api/users/review/:id
 * @access Private (صاحب المراجعة أو المسؤول فقط)
 */
module.exports.deleteUserReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .select("user client")
    .lean();
  if (!review) {
    return res.status(404).json({ message: "المراجعة غير موجودة!" });
  }

  if (
    !review.client ||
    (!review.client.equals(req.user.id) && req.user.role !== "admin")
  ) {
    return res.status(403).json({ message: "غير مصرح لك بحذف هذه المراجعة!" });
  }

  await Review.findByIdAndDelete(req.params.id);

  const avgResult = await Review.aggregate([
    { $match: { user: review.user } },
    { $group: { _id: "$user", averageRating: { $avg: "$rating" } } },
  ]);

  const averageRating = avgResult.length ? avgResult[0].averageRating : 0;

  let serviceQuality = "not rating";
  if (averageRating >= 4) serviceQuality = "excellent";
  else if (averageRating >= 3) serviceQuality = "good";
  else if (averageRating >= 2) serviceQuality = "bad";

  await User.findByIdAndUpdate(review.user, { averageRating, serviceQuality });

  res.status(200).json({ message: "تم حذف المراجعة بنجاح!" });
});
/**
 * @description Toggle Like to item
 * @route /api/items/review/:id
 * @method POST
 * @access private (user)
 */
module.exports.toggleLikeItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const item = await Item.findById(req.params.id).select("likes");
  if (!item)
    return res.status(404).json({ message: "Item not found or deleted" });

  const hasLiked = item.likes.some((like) => like.toString() === userId);

  const updatedItem = await Item.findByIdAndUpdate(
    req.params.id,
    {
      [hasLiked ? "$pull" : "$addToSet"]: { likes: userId },
    },
    { new: true, select: "likes" }
  );

  res.status(200).json({
    message: hasLiked ? "Unliked" : "Liked",
    likesCount: updatedItem.likes.length,
  });
});
