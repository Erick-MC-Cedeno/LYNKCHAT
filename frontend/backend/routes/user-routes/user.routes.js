import express from "express";
import protectRoute from "../../middleware/protectRoute.js";
import { getUsersForSidebar, updatePublicKey } from "../../controllers/user-controller/user.controller.js";

const router = express.Router();

router.get("/", protectRoute, getUsersForSidebar);

router.post("/publicKey", protectRoute, updatePublicKey);

export default router;
