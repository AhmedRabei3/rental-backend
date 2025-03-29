const express = require("express");
const { getPricing, updatePricing } = require("../controllers/priceCtrl");
const { verifyToken } = require("../middleware/verifyToken");
const { isAdmin } = require("../middleware/verification");

const router = express.Router();

router.get("/", getPricing); // 🔹 جلب الأسعار
router.post("/", [verifyToken, isAdmin], updatePricing); // 🔹 تحديث الأسعار (للأدمن فقط)

module.exports = router;
