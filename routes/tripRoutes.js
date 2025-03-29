const express = require("express");
const { recommendTrip } = require("../controllers/tripController");
const router = express.Router();

router.post("/recommend", recommendTrip);

module.exports = router;
