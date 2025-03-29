const router = require("express").Router();
const { isValidId, isUser } = require("../middleware/verification");
const {
  getAvailableBookingDates,
  requestRental,
  updateAvailability,
  approveRental,
} = require("../controllers/rentalCtrl");
const { verifyToken } = require("../middleware/verifyToken");

// route to get available book durations
router
  .route("/available-dates/:id")
  .get([isValidId], getAvailableBookingDates)
  .put([isValidId, verifyToken], updateAvailability);

module.exports = router;
// send requet to owner to confirm booking
router
  .route("/request/:id")
  .post([isValidId, verifyToken, isUser], requestRental)
  .patch([isValidId, verifyToken], approveRental);
//
