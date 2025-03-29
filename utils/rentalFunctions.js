const { Rental } = require("../models/Rental");
const asyncHandler = require("express-async-handler");

module.exports.getNextAvailableDate = async (itemId) => {
  const nextRental = await Rental.findOne({ item: itemId, status: "active" })
    .sort({ endDate: 1 }) // أقرب حجز سينتهي
    .select("endDate");

  return nextRental ? nextRental.endDate : new Date(); // إذا لم يكن هناك حجز، فالعنصر متاح الآن
};

module.exports.checkAndUpdateAvailability = asyncHandler(async () => {
  const now = new Date();

  // البحث عن جميع العناصر التي انتهت فترة تأجيرها
  const expiredRentals = await Rental.find({
    endDate: { $lte: now },
    status: "active",
  });

  for (const rental of expiredRentals) {
    // تحديث حالة الحجز إلى "مكتمل"
    rental.status = "completed";
    await rental.save();

    // التأكد من عدم وجود حجوزات قادمة قبل إتاحة العنصر
    const nextRental = await Rental.findOne({
      item: rental.item,
      status: "active",
      startDate: { $gte: now },
    });

    if (!nextRental) {
      await Item.findByIdAndUpdate(rental.item, { isAvailable: true });
    }
  }
});

module.exports.maxBookingSet = (rentalType) => {
  let today = new Date();
  let maxBookingDate = new Date(today);
  switch (rentalType) {
    case "hourly":
      maxBookingDate.setDate(maxBookingDate.getDate() + 7);
      break;
    case "daily":
      maxBookingDate.setMonth(maxBookingDate.getMonth() + 3);
      break;
    case "weekly":
      maxBookingDate.setMonth(maxBookingDate.getMonth() + 6);
      break;
    case "monthly":
      maxBookingDate.setFullYear(maxBookingDate.getFullYear() + 1);
      break;
    case "half-year":
      maxBookingDate.setFullYear(maxBookingDate.getFullYear() + 1);
      break;
    case "yearly":
      maxBookingDate.setFullYear(maxBookingDate.getFullYear() + 2);
      break;
  }
  return maxBookingDate;
};

module.exports.generateDefaultAvailability = (
  rentalType,
  startDate,
  maxBookingDate
) => {
  let availability = [];
  let endDate = new Date(startDate);

  while (endDate <= maxBookingDate) {
    switch (rentalType) {
      case "hourly":
        availability.push({
          startDate: new Date(endDate),
          endDate: new Date(endDate.setHours(endDate.getHours() + 1)),
        });
        break;
      case "daily":
        availability.push({
          startDate: new Date(endDate),
          endDate: new Date(endDate.setDate(endDate.getDate() + 1)),
        });
        break;
      case "weekly":
        availability.push({
          startDate: new Date(endDate),
          endDate: new Date(endDate.setDate(endDate.getDate() + 7)),
        });
        break;
      case "monthly":
        availability.push({
          startDate: new Date(endDate),
          endDate: new Date(endDate.setMonth(endDate.getMonth() + 1)),
        });
        break;
    }

    // 🔹 الخروج إذا تجاوزنا الحد الأقصى للحجز
    if (endDate > maxBookingDate) break;
  }

  return availability;
};

module.exports.endDateGeter = (rentalType, rentalDuration, startDate) => {
  let endDate = new Date(startDate);
  switch (rentalType) {
    case "hourly":
      endDate.setHours(endDate.getHours() + rentalDuration);
      break;
    case "daily":
      endDate.setDate(endDate.getDate() + rentalDuration);
      break;
    case "weekly":
      endDate.setDate(endDate.getDate() + rentalDuration * 7);
      break;
    case "monthly":
      endDate.setMonth(endDate.getMonth() + rentalDuration);
      break;
    case "half-year":
      endDate.setMonth(endDate.getMonth() + rentalDuration * 6);
      break;
    case "yearly":
      endDate.setFullYear(endDate.getFullYear() + rentalDuration);
      break;
  }
  return endDate;
};
