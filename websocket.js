const socketIo = require("socket.io");

const setupWebSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔗 مستخدم متصل بالويب سوكيت:", socket.id);

    // الاشتراك في إشعارات التأجير
    socket.on("subscribeToRentalUpdates", (userId) => {
      socket.join(userId); // إدخال المستخدم إلى الغرفة الخاصة به
      console.log(`📌 المستخدم ${userId} انضم إلى إشعارات الإيجار`);
    });

    // قطع الاتصال
    socket.on("disconnect", () => {
      console.log("❌ مستخدم قطع الاتصال");
    });
  });

  return io;
};

module.exports = { setupWebSocket };
