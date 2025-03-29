const asyncHandler = require("express-async-handler");
const Price = require("../models/Price");

/**---------------------------------------------
 * @description ✅ Get Prices
 * @route /api/price
 * @method  GET
 * @access  public
 +++++++++++++++++++++++++++++++++++++++++++++++*/
module.exports.getPricing = asyncHandler(async (req, res) => {
  const pricing = await Price.getPricing();
  res.status(200).json(pricing);
});

/**---------------------------------------------
 * @description ✅ Updating Price
 * @route   /api/price
 * @method POST
 * @access private (admin only)
 ---------------------------------------------*/
module.exports.updatePricing = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denide" });
  }
  const pricing = await Price.setPricing(req.body);
  res.status(200).json({ message: "A new price has been updated", pricing });
});
