const asyncHandler = require("express-async-handler");
const { Item } = require("../models/Item");
const { Review } = require("../models/Review");
const {
  cloudinaryDeleteImages,
  cloudinaryUploadImages,
  cloudinaryUploadImage,
} = require("../utils/cloudinary");
const { createItemValidation } = require("../utils/itemSchemaFunctions");

/**
 * @description Create new item
 * @route /api/items
 * @method POST
 * @access private (user who role is owner)
 */
module.exports.createItem = asyncHandler(async (req, res) => {
  const { error } = createItemValidation(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  if (req.user.role !== "owner") {
    return res.status(403).json({ message: "Subscription to access" });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "يرجى رفع صورة واحدة على الأقل" });
  }

  const user = req.user;
  const location = {
    type: "Point",
    coordinates: [
      parseFloat(req.body.longitude) || 0,
      parseFloat(req.body.latitude) || 0,
    ],
    street: req.body.street || "",
    city: req.body.city || "",
    country: req.body.country || "",
  };

  try {
    // رفع الصور بالتوازي باستخدام Promise.all
    const uploadPromises = req.files.map(async (file) => {
      try {
        const result = await cloudinaryUploadImage(file.buffer);
        if (result && result.secure_url && result.public_id) {
          return { url: result.secure_url, public_id: result.public_id };
        }
      } catch (uploadError) {
        console.error("فشل رفع الصورة:", uploadError.message);
        return null; // إرجاع null في حالة الفشل
      }
    });

    let uploadedImages = await Promise.all(uploadPromises);

    // تصفية الصور الفارغة أو الفاشلة
    uploadedImages = uploadedImages.filter((img) => img !== null);

    // إذا لم يتم رفع أي صورة بنجاح، أعد رسالة خطأ
    if (uploadedImages.length === 0) {
      return res.status(500).json({ message: "فشل رفع الصور إلى Cloudinary" });
    }

    // إنشاء العنصر بعد نجاح رفع الصور
    const item = new Item({
      ...req.body,
      images: uploadedImages, // الآن الصور مضمونة أن تكون صحيحة
      location,
      owner: user._id,
    });

    await item.save();

    return res.status(201).json({ message: "Item added successfully", item });
  } catch (error) {
    console.error("خطأ أثناء رفع الصور أو حفظ العنصر:", error);
    return res.status(500).json({
      message: "خطأ أثناء رفع الصور أو حفظ العنصر",
      error: error.message,
    });
  }
});

/**
 * @description Get all items
 * @route /api/items
 * @method GET
 * @access public
 */
module.exports.getItems = asyncHandler(async (req, res) => {
  const { category, page = "1", limit = "10" } = req.query;
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const filter = category ? { category } : {};
  const { items, totalItems } = await Item.getItemsWithDetails(
    filter,
    pageNumber,
    limitNumber
  );
  console.log(items);
  res.status(200).json({
    totalItems,
    currentPage: pageNumber,
    totalPages: Math.ceil(totalItems / limitNumber),
    items,
  });
});

/**
 * @description Get item by ID
 * @route /api/items/:id
 * @method GET
 * @access public
 */
module.exports.getItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id).populate("reviews");
  if (!item) return res.status(404).json({ message: "Item not found" });
  res.status(200).json({ item });
});

/**
 * @description Update item
 * @route /api/items/:id
 * @method PUT
 * @access private (user who role is owner)
 */
module.exports.updateItem = asyncHandler(async (req, res) => {
  const isMultipart = req.is("multipart/form-data");
  const hasFiles = req.files?.length > 0;

  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Item not found" });

  if (!item.owner.equals(req.user.id)) {
    return res
      .status(401)
      .json({ message: "You are not the owner of this item" });
  }

  let updateData = { ...req.body };
  let uploadedImages = [];

  if (isMultipart && hasFiles) {
    try {
      // رفع الصور الجديدة مباشرةً إلى Cloudinary
      uploadedImages = await cloudinaryUploadImages(
        req.files.map((file) => file.buffer)
      );

      // حذف الصور القديمة من Cloudinary
      await cloudinaryDeleteImages(item.images);

      updateData.images = uploadedImages;
    } catch (error) {
      console.error("خطأ أثناء تحديث الصور:", error);
      return res
        .status(500)
        .json({ message: "فشل تحديث الصور", error: error.message });
    }
  }

  if (req.body.longitude && req.body.latitude) {
    updateData.location = {
      type: "Point",
      coordinates: [
        parseFloat(req.body.longitude),
        parseFloat(req.body.latitude),
      ],
      street: req.body.street || item.location.street,
      city: req.body.city || item.location.city,
      country: req.body.country || item.location.country,
    };
  }

  const updatedItem = await Item.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ message: "Item updated successfully", updatedItem });
});

/**
 * @description Delete item
 * @route /api/items/:id
 * @method DELETE
 * @access private (owner or admin)
 */
module.exports.deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id).populate("reviews");
  if (!item) return res.status(404).json({ message: "Item not found" });

  try {
    // تشغيل عمليات الحذف بالتوازي
    await Promise.all([
      cloudinaryDeleteImages(item.images), // حذف الصور من Cloudinary
      Review.deleteMany({ item: item._id }), // حذف جميع التقييمات
      Item.deleteOne({ _id: req.params.id }), // حذف العنصر
    ]);

    return res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("خطأ أثناء حذف العنصر:", error);
    return res
      .status(500)
      .json({ message: "فشل حذف العنصر", error: error.message });
  }
});

/**
 * @description Get items that belong to logged-in user
 * @route /api/items/my-items
 * @method GET
 * @access private (only for owner of this item)
 */
module.exports.getUserItems = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    category,
    name,
    minPrice,
    maxPrice,
  } = req.query;

  let price; // ❌ لا يتم تعيين كائن فارغ تلقائيًا

  if (minPrice !== undefined || maxPrice !== undefined) {
    price = {};
    if (minPrice !== undefined) price.min = Number(minPrice);
    if (maxPrice !== undefined) price.max = Number(maxPrice);

    // ✅ التحقق من صحة المدى السعري فقط إذا كان كلا القيمتين موجودتين
    if (
      price.min !== undefined &&
      price.max !== undefined &&
      price.max < price.min
    ) {
      return res.status(400).json({ message: "Invalid price range" });
    }
  }

  const { items, totalItems } = await Item.getItemsByOwner(
    req.user.id,
    Number(page),
    Number(limit),
    category?.trim(),
    name?.trim(),
    price
  );

  res.status(200).json({
    totalItems,
    currentPage: Number(page),
    totalPages: Math.ceil(totalItems / Number(limit)),
    items,
  });
});
