const { OpenAI } = require("openai");
const { Item } = require("../models/Item"); // لاستخدام بيانات التطبيق
const { Rental } = require("../models/Rental");
const { User } = require("../models/User");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const callOpenAI = async (message, context = "") => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an assistant for a rental service application.",
        },
        { role: "user", content: `${context}\nUser Question: ${message}` },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return "Sorry, there was an error processing your request.";
  }
};

// 🔹 وظيفة إنشاء السياق بناءً على قاعدة البيانات
const getRentalContext = async () => {
  const itemCount = await Item.countDocuments();
  const rentalCount = await Rental.countDocuments();
  const userCount = await User.countDocuments();

  return `The application contains ${itemCount} items available for rental and ${rentalCount} completed rental transactions and ${userCount} Users subscribed in app`;
};

module.exports = { callOpenAI, getRentalContext };
