import User from "../../models/user-model/user.model.js";
import Message from "../../models/message-model/message.model.js";

export const getUsersForSidebar = async (req, res) => {
	try {
		const loggedInUserId = req.user._id;

		const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

		// For each user compute unread messages count (messages sent by that user to logged in user)
		const results = await Promise.all(users.map(async (u) => {
			const count = await Message.countDocuments({ senderId: u._id, receiverId: loggedInUserId, read: false });
			return { ...u.toObject(), unreadCount: count };
		}));

		res.status(200).json(results);
	} catch (error) {
		console.error("Error in getUsersForSidebar: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};
