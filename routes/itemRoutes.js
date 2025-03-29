const router = require("express").Router();
const { verifyToken } = require("../middleware/verifyToken");
const {
  createItem,
  getItem,
  getItems,
  updateItem,
  deleteItem,
  getNearbyItems,
  getUserItems,
} = require("../controllers/itemCtrl");
const {
  isOwnerOrAdmin,
  isValidId,
  isUser,
} = require("../middleware/verification");
const { upload } = require("../middleware/imageUploader");

// add new item route
router
  .route("/")
  .post([verifyToken, isUser, upload.array("image", 5)], createItem)
  .get(getItems);

router.route("/my-items").get([verifyToken, isUser], getUserItems);
// update item by owner
router
  .route("/:id")
  .put(
    [isValidId, verifyToken, isOwnerOrAdmin, upload.array("image", 5)],
    updateItem
  )
  .get(isValidId, getItem)
  .delete([isValidId, verifyToken, isOwnerOrAdmin], deleteItem);
//router.route("/nearby").get(verifyToken, getNearbyItems);

module.exports = router;
