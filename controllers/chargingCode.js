const ChargingCode = require("../models/ChargingCode");
const asyncHandler = require("express-async-handler");

/**------------------------------------------
 * @desc    Get all charging codes
 * @route   /api/charging-codes
 * @access  private (admin)
 * @methode GET
 * ------------------------------------------*/
module.exports.getAllChargingCodes = asyncHandler(async (req, res) => {
  const chargingCodes = await ChargingCode.find();
  res.status(200).json(chargingCodes);
});

/**------------------------------------------
 * @desc    Generate multiple charging codes
 * @route   /api/charging-codes
 * @access  private (admin)
 * @methode POST
 ------------------------------------------*/
module.exports.generateMultipleChargingCodes = asyncHandler(
  async (req, res) => {
    const { balance, quantity } = req.body;
    console.log(typeof balance);
    if (
      !balance ||
      !quantity ||
      typeof balance !== "number" ||
      typeof quantity !== "number"
    )
      return res
        .status(400)
        .json({ message: "Please set value for balance and quantity" });
    const codes = Array.from({ length: quantity }, () => {
      return {
        code: Math.random().toString(36).substring(3),
        balance,
      };
    });
    await ChargingCode.insertMany(codes);
    res
      .status(201)
      .json({ message: "Charging codes generated successfully", codes: codes });
  }
);
