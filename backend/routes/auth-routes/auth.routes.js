import express from "express";
import multer from "multer";
import { getCurrentUser, login, logout, signup } from "../../controllers/auth-controller/auth.controller.js";
import protectRoute from "../../middleware/protectRoute.js";

const router = express.Router();
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

router.post("/signup", upload.single("image"), signup); 

router.post("/login", login);

router.post("/logout", logout);

router.get("/me", protectRoute, getCurrentUser);

export default router;