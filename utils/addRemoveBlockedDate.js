module.exports.addRemoveDate = (blockedDates, action, item) => {
  let updatedBlockedDates = [...(item.blockedDates || [])];
  if (action === "add") {
    blockedDates.forEach((date, index) => {
      if (!date || !date.startDate || !date.endDate) {
        console.error(`Invalid date at index ${index}:`, date);
        return res.status(400).json({
          message: "Each blocked date must have startDate and endDate",
        });
      }
    });
    const uniqueDates = new Set(
      updatedBlockedDates
        .concat(blockedDates)
        .filter((date) => date && date.startDate && date.endDate) // إزالة أي بيانات غير مكتملة
        .map((date) =>
          JSON.stringify({ startDate: date.startDate, endDate: date.endDate })
        )
    );
    updatedBlockedDates = Array.from(uniqueDates).map((date) =>
      JSON.parse(date)
    );
  } else if (action === "remove") {
    updatedBlockedDates = updatedBlockedDates.filter(
      (date) =>
        !blockedDates.some(
          (blocked) =>
            new Date(blocked.startDate).getTime() ===
              new Date(date.startDate).getTime() &&
            new Date(blocked.endDate).getTime() ===
              new Date(date.endDate).getTime()
        )
    );
  } else {
    return res.status(400).json({ message: "Invalid action" });
  }
  return updatedBlockedDates;
};
