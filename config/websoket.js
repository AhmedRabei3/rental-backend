const { io } = require("../app"); // استيراد `io` من السيرفر

const sendSocketNotification = (userId, message) => {
  io.to(userId).emit("rentalNotification", message);
  console.log(`📢 notification has been sended to ${userId}: ${message}`);
};

module.exports = { sendSocketNotification };
