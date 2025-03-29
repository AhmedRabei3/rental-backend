const router = require("express").Router();
const {
  addItemReview,
  toggleLikeItem,
  deleteUserReview,
} = require("../controllers/reviewCtrl");
const { middleware } = require("../middleware/index");

// add review (Item)
router
  .route("/:id")
  .post([middleware.isValidId, middleware.verifyToken], addItemReview)
  .delete([middleware.isValidId, middleware.verifyToken], deleteUserReview);
// toggle Like (Item)
router
  .route("/like/:id")
  .post([middleware.isValidId, middleware.verifyToken], toggleLikeItem);
module.exports = router;
