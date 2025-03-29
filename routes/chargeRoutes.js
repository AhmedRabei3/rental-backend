const router = require("express").Router();
const {
  generateMultipleChargingCodes,
  getAllChargingCodes,
} = require("../controllers/chargingCode");
const { isAdmin } = require("../middleware/verification");
const { verifyToken } = require("../middleware/verifyToken");

//---------------------------------------------------
// GET /chargingCodes
//---------------------------------------------------
router
  .route("/")
  .get([verifyToken, isAdmin], getAllChargingCodes)
  .post([verifyToken, isAdmin], generateMultipleChargingCodes);

module.exports = router;
