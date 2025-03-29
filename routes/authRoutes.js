const router = require("express").Router();

router.route("/register").post(require("../controllers/authCtrl").register);
router.route("/login").post(require("../controllers/authCtrl").login);

module.exports = router;
