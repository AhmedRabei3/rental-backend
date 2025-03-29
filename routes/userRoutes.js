const router = require("express").Router();
const {
  uploadProfileImage,
  getProfile,
  updateProfile,
  getUserById,
  setOwner,
  chargeAccount,
  deleteUserByAdmin,
  deleteUser,
  getUsers,
} = require("../controllers/userCtrl");
const { upload } = require("../middleware/imageUploader");
const { verifyToken } = require("../middleware/verifyToken");
const { isValidId, isAdmin, isUser } = require("../middleware/verification");

// route to upload profile image
router
  .route("/profile-photo")
  .post([verifyToken, upload.single("image")], uploadProfileImage);

// route to get user profile
router
  .route("/profile")
  .get(verifyToken, getProfile)
  // route to update user profile
  .put([verifyToken], updateProfile);
// rote to get user by id
router
  .route("/:id")
  .get([isValidId, verifyToken], getUserById)
  .delete([isValidId, verifyToken, isAdmin], deleteUserByAdmin)
  .put([isValidId, verifyToken]);
// Charging account
router
  .route("/")
  .post([verifyToken, isUser], chargeAccount)
  .delete([verifyToken, isUser], deleteUser)
  .get([verifyToken, isAdmin], getUsers)
  .patch([verifyToken, isUser], setOwner);

module.exports = router;
