const router = require("express").Router();
const { askAI } = require("../controllers/aiController");

router.post("/chat", askAI);

module.exports = router;
