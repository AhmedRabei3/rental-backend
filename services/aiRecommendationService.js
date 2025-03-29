const { callOpenAI } = require("./openAiService");
const { Item } = require("../models/Item");

const suggestRentalOptions = async (userPreferences) => {
  try {
    // 🔹 جلب العناصر المتاحة للإيجار
    const availableItems = await Item.find({ rentalPeriods: { $size: 0 } })
      .limit(5)
      .select("name rentalType price");

    const itemDetails = availableItems
      .map(
        (item) =>
          `Item: ${item.name}, Type: ${item.rentalType}, Price: ${item.price}`
      )
      .join("\n");

    const message = `Suggest rental options based on these available items: \n${itemDetails}`;

    return await callOpenAI(message);
  } catch (error) {
    console.error("Error suggesting rental options:", error);
    return "Unable to fetch rental suggestions at this time.";
  }
};

module.exports = { suggestRentalOptions };
