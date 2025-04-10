const http = require("http");
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { connectToMongoDB } = require("./config/connectToDB");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { setupWebSocket } = require("./websocket");

// connect to MongoDB
connectToMongoDB();

// create  Express app
const app = express();

// create HTTP server
const server = http.createServer(app);

// CORS setup
app.use(cors());
app.use(cors({ origin: "*" }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//  WebSockets configerations
const io = setupWebSocket(server);

//   io
app.use((req, res, next) => {
  req.io = io;
  next();
});

// استيراد المسارات
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/price", require("./routes/priceRoutes"));
app.use("/api/item", require("./routes/itemRoutes"));
app.use("/api/charging-code", require("./routes/chargeRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/category", require("./routes/categoryRoutes"));
app.use("/api/rent", require("./routes/rentRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/trips", require("./routes/tripRoutes"));

// eroor managment
app.use(notFound);
app.use(errorHandler);

//  running server
const port = process.env.PORT || 5000;
server.listen(port, () =>
  console.log(`🚀 server is running on port : ${port} ^_^`)
);

// تصدير `io` لاستخدامه في الملفات الأخرى
module.exports = { io };
