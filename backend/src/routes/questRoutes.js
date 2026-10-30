const express = require("express");
const controller = require("../controllers/questController");
const { authenticateToken } = require("../middleware/authMiddleware");
const router = express.Router();

router.use(authenticateToken);
router.get("/active-board", controller.getActiveBoard);
router.post("/generate", controller.generateBoard);
router.post("/claim", controller.claimLine);
router.post("/demo-complete", controller.demoComplete);
router.post("/accept", controller.acceptBoard);
router.post("/set-active", controller.setActiveBoard);
router.post("/progress", controller.progressCell);
router.post("/reset", controller.resetBoard);

module.exports = router;
