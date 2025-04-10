const asyncHandler = require("express-async-handler");
const { Rental } = require("../models/Rental");
const { Item } = require("../models/Item");
const schedule = require("node-schedule");
const {
  maxBookingSet,
  generateDefaultAvailability,
  endDateGeter,
} = require("../utils/rentalFunctions");
const { addRemoveDate } = require("../utils/addRemoveBlockedDate");
const { Parser } = require("json2csv");
const fs = require("fs");
const path = require("path");

/**------------------------------------------
 * @description Get available booking dates
 * @route GET /api/rent/available-dates/:id
 * @access public 
 ------------------------------------------*/
module.exports.getAvailableBookingDates = asyncHandler(async (req, res) => {
  const itemId = req.params.id;

  // 🔹 جلب بيانات العنصر مع التأكد من استبعاد كلمة المرور
  const item = await Item.findById(itemId)
    .select("rentalPeriods blockedDates rentalType availablePeriods")
    .lean();

  if (!item) return res.status(404).json({ message: "العنصر غير موجود." });

  const today = new Date();
  const maxBookingDate = maxBookingSet(item.rentalType);

  // 🔹 تحديد الفترات المتاحة افتراضيًا إذا لم يتم تحديدها مسبقًا
  let availablePeriods = item.availablePeriods?.length
    ? item.availablePeriods
    : generateDefaultAvailability(item.rentalType, today, maxBookingDate);

  // 🔹 دمج الفترات المحجوزة والمحظورة في قائمة واحدة
  let unavailablePeriods = [
    ...(item.rentalPeriods || []),
    ...(item.blockedDates || []),
  ].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // 🔹 تصفية الفترات المتاحة بناءً على الفترات المحجوزة والمحظورة
  let finalAvailableDates = availablePeriods.filter(
    (period) =>
      !unavailablePeriods.some(
        (unavail) =>
          period.startDate < unavail.endDate &&
          period.endDate > unavail.startDate
      ) && period.startDate <= maxBookingDate
  );

  res.status(200).json({
    numberOfBookingDates: finalAvailableDates.length,
    availableDates: finalAvailableDates,
  });
});

/**------------------------------------------
 * @description Set availability (Owner)
 * @route   /api/rent/available-dates/:id
 * @method  put
 * @access private (Owner)
 ------------------------------------------*/
module.exports.updateAvailability = asyncHandler(async (req, res) => {
  const itemId = req.params.id;
  const item = await Item.findById(itemId).select("owner blockedDates");
  if (!item) return res.status(404).json({ message: "Item not found" });
  if (!item.owner.equals(req.user.id)) {
    return res
      .status(403)
      .json({ message: "You are not the owner of this item" });
  }
  const updatedBlockedDates = addRemoveDate(
    req.body.blockedDates,
    req.body.action,
    item
  );
  // ✅ حفظ التحديث فقط إذا كان هناك تغيير
  if (
    JSON.stringify(updatedBlockedDates) !== JSON.stringify(item.blockedDates)
  ) {
    item.blockedDates = updatedBlockedDates;
    await item.save();
  }
  res.status(200).json({
    message: "Blocked dates updated successfully",
    blockedDates: updatedBlockedDates,
  });
});

/**------------------------------------------
 * @description Send rental request
 * @route  /api/rent/request/:id
 * @access private (User)
 * @method post
 ------------------------------------------*/
module.exports.requestRental = asyncHandler(async (req, res) => {
  const { startDate, rentalDuration } = req.body;
  const itemId = req.params.id;
  const renterId = req.user._id;
  const io = req.io;

  if (!itemId || !startDate || !rentalDuration) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const item = await Item.findById(itemId)
    .populate({ path: "owner", select: "name _id" })
    .select("rentalPeriods blockedDates rentalType name owner");

  if (!item) return res.status(404).json({ message: "Item not found." });
  if (item.owner._id.equals(renterId)) {
    return res.status(400).json({ message: "this item for you" });
  }
  // ✅ التحقق مما إذا كان هناك طلب استئجار سابق قيد المعالجة
  const existingRental = await Rental.findOne({
    item: itemId,
    renter: renterId,
    status: "pending_approval",
  });

  if (existingRental) {
    // 🔹 إرسال إشعار للمالك لتذكيره بوجود طلب قيد المعالجة
    io.to(item.owner._id.toString()).emit("rentalRequestReminder", {
      rentalId: existingRental._id,
      message: `📌 Reminder: There is a pending rental request for ${item.name} by ${req.user.name}.`,
    });

    return res.status(200).json({
      message: "Your rental request is already being processed.",
      rental: existingRental,
    });
  }

  // 🛠 حساب تاريخ نهاية الإيجار
  const endDate = endDateGeter(item.rentalType, rentalDuration, startDate);

  // 🔍 التحقق من الفترات المحجوزة
  const isPeriodBooked = item.rentalPeriods.some(
    (period) =>
      new Date(startDate) < new Date(period.endDate) &&
      new Date(endDate) > new Date(period.startDate)
  );

  if (isPeriodBooked)
    return res.status(400).json({
      message: "This item is already booked for the selected period.",
    });

  // 🔍 التحقق من الفترات المحظورة
  const isBlocked = item.blockedDates.some(
    (blocked) =>
      new Date(startDate) < new Date(blocked.endDate) &&
      new Date(endDate) > new Date(blocked.startDate)
  );

  if (isBlocked)
    return res.status(400).json({
      message: "This item is not available during the selected period.",
    });
  const platformFee = 1;
  console.log(platformFee);
  // ✅ إنشاء طلب الإيجار
  const rentalRequest = await Rental.create({
    item: itemId,
    renter: renterId,
    startDate,
    endDate,
    status: "pending_approval",
    platformFee,
    owner: item.owner._id,
  });

  // 🔹 إرسال إشعار للمالك بالطلب الجديد
  io.to(item.owner._id.toString()).emit("rentalRequest", {
    rentalId: rentalRequest._id,
    message: `📢 New rental request for ${item.name} from ${req.user.name}.`,
  });

  res.status(201).json({
    message: `Your request has been sent to the owner of ${item.name}.`,
    rental: rentalRequest,
  });
}); // تم اختباره جاهز

/**------------------------------------------
 * @description Approve or reject rental request with reason
 * @route  /api/rent/request/:id
 * @access private (Owner)
 * @method PATCH
 ------------------------------------------*/
module.exports.approveRental = asyncHandler(async (req, res) => {
  const rentalId = req.params.id;
  const { action, rejectionReason, preReservationDeposit } = req.body;
  const io = req.io;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "Invalid action." });
  }

  const rental = await Rental.findById(rentalId)
    .populate({
      path: "item",
      select: "name rentalPeriods owner price",
    })
    .populate({ path: "renter", select: "name _id balance" });
  if (!rental)
    return res.status(404).json({ message: "Rental request not found." });

  const { item, renter } = rental;

  if (!item.owner.equals(req.user._id)) {
    return res.status(403).json({
      message: "You are not authorized to manage this rental request.",
    });
  }

  // منع الموافقة على الطلب بعد بدء تاريخ الإيجار
  if (new Date() >= new Date(rental.startDate)) {
    return res
      .status(400)
      .json({ message: "You cannot approve a rental after the start date." });
  }

  if (action === "reject") {
    rental.status = "rejected";
    rental.rejectionReason = rejectionReason || null;
    await rental.save();

    io.to(renter._id.toString()).emit("rentalUpdate", {
      rentalId,
      status: "rejected",
      message: `Your rental request for ${item.name} has been rejected.`,
      rejectionReason: rejectionReason || "",
    });

    return res.status(200).json({
      message: `Request to rent ${item.name} has been rejected by his owner.`,
      rental,
    });
  }

  // التحقق من توفر العنصر
  const isPeriodBooked = item.rentalPeriods.some(
    (period) =>
      new Date(rental.startDate) < new Date(period.endDate) &&
      new Date(rental.endDate) > new Date(period.startDate)
  );

  if (isPeriodBooked) {
    return res.status(400).json({
      message: "This item is already booked for the selected period.",
    });
  }
  preReservationDeposit ? preReservationDeposit : 0;
  // اقتطاع مبلغ الحجز إذا كان مطلوبًا
  if (preReservationDeposit > 0) {
    if (renter.balance < preReservationDeposit) {
      return res.status(400).json({
        message: "Insufficient balance to pay the pre-reservation deposit.",
      });
    }

    renter.balance -= item.preReservationDeposit;
    await renter.save();
  }

  rental.status = "approved";
  rental.expiryDate = new Date(rental.endDate);
  rental.expiryDate.setMonth(rental.expiryDate.getMonth() + 6); // إضافة 6 أشهر قبل الحذف
  await rental.save();

  await Item.findByIdAndUpdate(item._id, {
    $push: {
      rentalPeriods: { startDate: rental.startDate, endDate: rental.endDate },
    },
  });

  io.to(renter._id.toString()).emit("rentalUpdate", {
    rentalId,
    status: "approved",
    message: `Your rental request for ${item.name} has been approved.`,
  });

  // جدولة حذف الطلب بعد انتهاء صلاحية السجل
  schedule.scheduleJob(rental.expiryDate, async function () {
    await Rental.findByIdAndDelete(rentalId);
  });

  res.status(200).json({
    message: "Rental request approved successfully.",
    rental,
  });
});

/**------------------------------------------
 * @description Export rental records to CSV
 * @route  /api/rent/export/:id
 * @access private (Owner)
 * @method GET
 ------------------------------------------*/
module.exports.exportRentalRecords = asyncHandler(async (req, res) => {
  const itemId = req.params.id;
  const userId = req.user._id;

  const item = await Item.findById(itemId);
  if (!item) {
    return res.status(404).json({ message: "Item not found." });
  }

  // التأكد من أن المستخدم هو مالك العنصر
  if (!item.owner.equals(userId)) {
    return res.status(403).json({
      message: "You are not authorized to export rental records for this item.",
    });
  }

  const rentals = await Rental.find({ item: itemId })
    .populate("renter", "name email")
    .select("renter startDate endDate status platformFee expiryDate createdAt")
    .lean();

  if (!rentals.length) {
    return res
      .status(404)
      .json({ message: "No rental records found for this item." });
  }

  // تحويل البيانات إلى CSV
  const fields = [
    "renter.name",
    "renter.email",
    "startDate",
    "endDate",
    "status",
    "platformFee",
    "expiryDate",
    "createdAt",
  ];
  const opts = { fields };
  const parser = new Parser(opts);
  const csvData = parser.parse(rentals);

  // حفظ الملف مؤقتًا
  const fileName = `rental-records-${itemId}.csv`;
  const filePath = path.join(__dirname, `../exports/${fileName}`);

  fs.writeFileSync(filePath, csvData);

  // إرسال الملف للمالك
  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Error sending CSV file:", err);
      res.status(500).json({ message: "Error generating CSV file." });
    }

    // حذف الملف بعد الإرسال
    fs.unlinkSync(filePath);
  });
});

/**------------------------------------------
 * @description Delete rental record manually
 * @route  /api/rent/delete/:id
 * @access private (Owner)
 * @method DELETE
 ------------------------------------------*/
module.exports.deleteRentalRecord = asyncHandler(async (req, res) => {
  const rentalId = req.params.id;
  const userId = req.user._id;

  // البحث عن الإيجار
  const rental = await Rental.findById(rentalId).populate("item", "owner");

  if (!rental) {
    return res.status(404).json({ message: "Rental record not found." });
  }

  // التحقق من أن المستخدم هو مالك العنصر
  if (!rental.item.owner.equals(userId)) {
    return res.status(403).json({
      message: "You are not authorized to delete this rental record.",
    });
  }

  // حذف الإيجار من قاعدة البيانات
  await Rental.findByIdAndDelete(rentalId);

  res.status(200).json({ message: "Rental record deleted successfully." });
});
/**------------------------------------------
 * @description Terminate an active rental early
 * @route  PUT /api/rent/terminate/:id
 * @access private (Renter)
 ------------------------------------------*/
module.exports.terminateRental = asyncHandler(async (req, res) => {
  const rentalId = req.params.id;
  const renterId = req.user._id;
  const io = req.io;

  // ✅ جلب بيانات الإيجار
  const rental = await Rental.findById(rentalId)
    .populate({ path: "item", select: "name rentalPeriods owner" })
    .populate({ path: "renter", select: "name _id" });

  if (!rental) return res.status(404).json({ message: "Rental not found." });

  // ✅ التأكد أن المستأجر نفسه هو من يطلب الإنهاء
  if (!rental.renter.equals(renterId)) {
    return res
      .status(403)
      .json({ message: "You are not authorized to terminate this rental." });
  }

  // ✅ التأكد أن الإيجار لم ينتهِ بالفعل
  if (rental.status !== "active") {
    return res
      .status(400)
      .json({ message: "This rental cannot be terminated." });
  }

  // ✅ تحديث حالة الإيجار إلى "terminated"
  rental.status = "terminated";
  rental.endDate = new Date(); // تسجيل وقت الإنهاء الفعلي
  await rental.save();

  // ✅ إزالة الفترة المحجوزة من العنصر
  await Item.findByIdAndUpdate(rental.item._id, {
    $pull: {
      rentalPeriods: { startDate: rental.startDate, endDate: rental.endDate },
    },
  });

  // ✅ إرسال إشعارات WebSocket
  io.to(rental.renter._id.toString()).emit("rentalUpdate", {
    rentalId,
    status: "terminated",
    message: `Your rental for "${rental.item.name}" has been terminated early.`,
  });

  io.to(rental.item.owner._id.toString()).emit("rentalUpdate", {
    rentalId,
    status: "terminated",
    message: `The renter has ended the rental for "${rental.item.name}" early.`,
  });

  res.status(200).json({
    message: "Rental has been terminated successfully.",
    rental,
  });
});
