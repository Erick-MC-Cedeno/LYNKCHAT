import User from "../../models/user-model/user.model.js";

export const getUsersForSidebar = async (req, res) => {
	try {
		const loggedInUserId = req.user._id;

		const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

		res.status(200).json(filteredUsers);
	} catch (error) {
		console.error("Error in getUsersForSidebar: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const updatePublicKey = async (req, res) => {
	try {
		const { publicKey } = req.body;
		const userId = req.user._id;

		if (!publicKey) {
			return res.status(400).json({ error: "Public key is required" });
		}

		const user = await User.findById(userId);

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		user.publicKey = publicKey;
		await user.save();

		res.status(200).json({ message: "Public key updated successfully" });
	} catch (error) {
		console.error("Error in updatePublicKey: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};
