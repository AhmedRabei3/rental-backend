const { User, updateProfileValidation } = require("../models/User");
const {
  cloudinaryUploadImage,
  cloudinaryDeleteImage,
  cloudinaryDeleteImages,
} = require("../utils/cloudinary");
const asyncHandler = require("express-async-handler");
const Price = require("../models/Price");
const { Item } = require("../models/Item");
const ChargingCode = require("../models/ChargingCode");
const { Review } = require("../models/Review");
const { ReviewItem } = require("../models/ReviewItem");
const { preDeleteUser } = require("../utils/preDelelteUser");

/**----------------------------------------------------------
 * @desc    Update user profile
 * @route   /api/users/profile
 * @access  private
 * @method  PUT
 ----------------------------------------------------------*/
module.exports.updateProfile = asyncHandler(async (req, res) => {
  const { error } = updateProfileValidation(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  await user.save();
  res.status(200).json({ message: "Profile updated successfully", user });
});

/**------------------------------------------------------
 * @desc    Get user profile
 * @route   /api/users/profile
 * @access  private (user)
 * @method  GET
 -------------------------------------------------------*/
module.exports.getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});

/**-------------------------------------------------------
 * @desc    Get user by ID
 * @route   /api/users/:id
 * @access  public
 * @method  GET
 --------------------------------------------------------*/
module.exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("-password")
    .populate("items");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.status(200).json({ user });
});
/**--------------------------------------------------------
 * @description Uploade profile image
 * @route /api/users/profile-photo
 * @access private (loggedin user)
 * @method POST
 --------------------------------------------------------*/
module.exports.uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Please upload an image" });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  try {
    // تنفيذ رفع الصورة الجديدة وحذف القديمة بالتوازي
    const [{ secure_url, public_id }] = await Promise.all([
      cloudinaryUploadImage(req.file.buffer),
      user.profileImage?.public_id
        ? cloudinaryDeleteImage(user.profileImage.public_id)
        : Promise.resolve(),
    ]);

    user.profileImage = { url: secure_url, public_id };
    await user.save();

    return res
      .status(200)
      .json({ message: "Image uploaded successfully", image: secure_url });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/**-------------------------------------------------------------------
 * @description Delete user profile image
 * @route /api/users/profile-photo
 * @access private (loggedin user)
 * @method DELETE
 ------------------------------------------------------------------*/
module.exports.deleteProfileImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  // delete image from cloudinary
  if (user.profileImage.public_id) {
    await cloudinaryDeleteImage(user.profileImage.public_id);
  }
  // delete image from database
  user.profileImage = {
    url: "https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_640.png",
    public_id: "profileImage",
  };
  await user.save();
  return res.status(200).json({ message: "Image deleted successfully" });
});

/**----------------------------------------------------------*
 * @description Delete user by ID
 * @route /api/users/:id
 * @access private (admin)
 * @method DELETE
 -----------------------------------------------------------*/
module.exports.deleteUserByAdmin = asyncHandler(async (req, res) => {
  const userToDelete = await User.findById(req.params.id).populate("items");
  if (!userToDelete) {
    return res.status(404).json({ message: "User not found" });
  }
  // 🔹 التحقق من إمكانية الحذف
  const checkDelete = await preDeleteUser(userToDelete);
  if (!checkDelete.canDelete) {
    return res.status(400).json(checkDelete);
  }
  // 🔹 حذف جميع المراجعات المرتبطة بالمستخدم
  await Promise.all([
    Review.deleteMany({
      $or: [{ user: userToDelete._id }, { client: userToDelete._id }],
    }),
    ReviewItem.deleteMany({ user: userToDelete._id }),
  ]);
  // 🔹 حذف صورة الحساب إن وجدت
  if (userToDelete.profileImage.public_id) {
    await cloudinaryDeleteImage(userToDelete.profileImage.public_id);
  }
  // 🔹 حذف جميع صور العناصر
  const images = userToDelete.items.flatMap((item) => item.images);
  if (images.length > 0) {
    await cloudinaryDeleteImages(images);
  }
  // 🔹 حذف العناصر الخاصة بالمستخدم
  const itemsToDelete = userToDelete.items.map((item) => item._id);
  await Promise.all([
    Item.deleteMany({ owner: userToDelete._id }),
    ReviewItem.deleteMany({ item: { $in: itemsToDelete } }),
  ]);
  // 🔹 حذف المستخدم
  await userToDelete.deleteOne();
  return res.status(200).json({ message: "User deleted successfully" });
});
/**----------------------------------------------------------*
 * @description Delete user by himself
 * @route /api/users
 * @access private (user)
 * @method DELETE
 -----------------------------------------------------------*/
module.exports.deleteUser = asyncHandler(async (req, res) => {
  const user = req.user;
  // 🔍 البحث عن العناصر المؤجرة أو المحجوزة
  const checkDelete = await preDeleteUser(user);
  if (!checkDelete.canDelete) {
    return res.status(400).json(checkDelete);
  }
  await Promise.all([
    Review.deleteMany({
      $or: [{ user: user._id }, { client: user._id }],
    }),
    ReviewItem.deleteMany({ user: user._id }),
  ]);
  // 🗑️ حذف صورة الملف الشخصي من Cloudinary
  if (user.profileImage?.public_id) {
    await cloudinaryDeleteImage(user.profileImage.public_id);
  }
  // 🗑️ حذف جميع صور العناصر من Cloudinary
  const images = user.items?.map((item) => item?.image) || [];
  if (images.length > 0) {
    await cloudinaryDeleteImages(images);
  }
  // 🗑️ حذف جميع العناصر الخاصة بالمستخدم
  await Item.deleteMany({ owner: user._id });
  // 🗑️ حذف الحساب نهائيًا
  await user.deleteOne();
  return res.status(200).json({ message: "User deleted successfully" });
});

/**
 * @description set user as owner by mony
 * @route /api/users/:id
 * @access private (logged in user or admin)
 * @method PATCH
 */
module.exports.setOwner = asyncHandler(async (req, res) => {
  // check if user is already owner
  if (req.user.role === "owner") {
    return res.status(400).json({ message: "User is already owner" });
  }
  const user = req.user;
  // get prices
  const prices = await Price.find();
  const activationPrice = prices[0].activationPrice;
  // check if user has enough money
  if (user.balance < activationPrice) {
    return res.status(400).json({
      message:
        "You don't have enough money , please Charge you account first ^_^",
    });
  }
  // set user as owner
  user.role = "owner";
  user.balance -= activationPrice;
  user.isActivated = true;
  await user.save();
  return res.status(200).json({ message: "Activation done " });
});
/**
 * @description Charging account by code
 * @route /api/users
 * @method POST
 * @access private (logged in user or admin)
 */
module.exports.chargeAccount = asyncHandler(async (req, res) => {
  const user = req.user;
  // البحث عن كود الشحن
  const code = await ChargingCode.findOne({ code: req.body.code });
  if (!code) {
    return res.status(400).json({ message: "Invalid code" });
  }
  // التحقق من أن الكود يحتوي على رصيد
  if (!code.balance || code.balance <= 0) {
    return res.status(400).json({ message: "Invalid or expired code" });
  }
  // إضافة الرصيد إلى المستخدم
  user.balance += code.balance;
  // حذف الكود بعد استخدامه
  await code.deleteOne();
  // حفظ التحديثات
  await user.save();
  return res.status(200).json({
    message: "Account charged successfully",
    newBalance: user.balance,
  });
});
/**
 * @description Get all users
 * @route /api/users
 * @access private (admin)
 * @method GET
 */
module.exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("name email items");
  if (!users) return res.status(403).json({ message: " No users found" });
  return res.status(200).json({ count: users.length, users: users });
});
/**
 * @description send referral
 * @route /api/users/referrals
 * @method POST
 * @access private (logged in user)
 */
module.exports.sendReferral = asyncHandler(async (req, res) => {
  const user = req.user;
  // create referral link
  const link = `${process.env.DOMAIN_LINK}${user.referralCode}`;
  return res
    .status(200)
    .json({ message: "Referral code sent successfully", link });
});
