const { Rental } = require("../models/Rental");

module.exports.preDeleteUser = async (user) => {
  const activeRentals = await Rental.find({
    $or: [{ renter: user._id }, { owner: user._id }],
    status: { $in: ["active", "approved"] }, // إيجارات نشطة أو بانتظار الموافقة
  }).populate("item", "name");

  const prePaidReservations = await Rental.find({
    owner: user._id,
    preReservationDeposit: { $gt: 0 }, // لديه حجز بمبلغ مدفوع
    status: "approved",
  }).populate("item", "name");

  const hasPendingBalance = user.balance && user.balance.amount > 0;

  if (
    activeRentals.length > 0 ||
    prePaidReservations.length > 0 ||
    hasPendingBalance
  ) {
    return {
      canDelete: false,
      message: "Cannot delete account due to pending obligations.",
      reasons: {
        activeRentals: activeRentals.map((rental) => rental.item.name),
        prePaidReservations: prePaidReservations.map(
          (rental) => rental.item.name
        ),
        pendingBalance: hasPendingBalance ? user.balance.amount : 0,
      },
    };
  }
  return { canDelete: true };
};
