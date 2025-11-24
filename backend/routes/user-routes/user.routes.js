import express from "express";
import protectRoute from "../../middleware/protectRoute.js";
import { getUsersForSidebar } from "../../controllers/user-controller/user.controller.js";

const router = express.Router();

router.get("/", protectRoute, getUsersForSidebar);

// Public key endpoints removed (E2E disabled)

export default router;