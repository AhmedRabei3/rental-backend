const { callOpenAI, getRentalContext } = require("../services/openAiService");
const { suggestRentalOptions } = require("../services/aiRecommendationService");

module.exports.askAI = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  // 🔹 الحصول على سياق التطبيق
  const context = await getRentalContext();

  // 🔹 استدعاء الذكاء الاصطناعي مع السياق
  const aiResponse = await callOpenAI(message, context);

  res.status(200).json({ response: aiResponse });
};
/**
 * @description generate suggestions by AI
 * @param {*} req
 * @param {*} res
 */
module.exports.getRentalSuggestions = async (req, res) => {
  const aiResponse = await suggestRentalOptions(req.body);
  res.status(200).json({ suggestions: aiResponse });
};
