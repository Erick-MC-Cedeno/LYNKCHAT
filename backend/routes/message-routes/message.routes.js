import express from "express";
import { getMessages, sendMessage, deleteMessage, deleteConversation } from "../../controllers/message-controller/message.controller.js";
import { updateMessage } from "../../controllers/message-controller/message.controller.js";
import protectRoute from "../../middleware/protectRoute.js";

const router = express.Router();

router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);

router.delete("/message/:id", protectRoute, deleteMessage);

router.patch("/message/:id", protectRoute, updateMessage);

router.delete("/conversation/:id", protectRoute, deleteConversation);

export default router;