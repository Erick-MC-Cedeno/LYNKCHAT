import Conversation from "../../models/conversation-model/conversation.model.js";
import Message from "../../models/message-model/message.model.js";
import { getReceiverSocketId, io } from "../../socket/socket.js";

export const sendMessage = async (req, res) => {
	try {
		const { message } = req.body;
		const { id: receiverId } = req.params;
		const senderId = req.user._id;

		if (!message || message.trim().length === 0) {
			return res.status(400).json({ error: "Message cannot be empty" });
		}

		let conversation = await Conversation.findOne({
			participants: { $all: [senderId, receiverId] },
		});

		if (!conversation) {
			conversation = await Conversation.create({
				participants: [senderId, receiverId],
			});
		}

		const newMessage = new Message({
			senderId,
			receiverId,
			message,
			read: false,
		});

		conversation.messages.push(newMessage._id);
		await Promise.all([conversation.save(), newMessage.save()]);

		const receiverSocketId = getReceiverSocketId(receiverId);
		if (receiverSocketId) {
			io.to(receiverSocketId).emit("newMessage", newMessage);
		}

		res.status(201).json(newMessage);
	} catch (error) {
		console.error("Error in sendMessage controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getMessages = async (req, res) => {
	try {
		const { id: userToChatId } = req.params;
		const senderId = req.user._id;

		const conversation = await Conversation.findOne({
			participants: { $all: [senderId, userToChatId] },
		}).populate("messages");

		if (!conversation) {
			return res.status(200).json([]);
		}

		const messages = conversation.messages;
		const unreadMessages = messages.filter(msg => !msg.read && msg.receiverId.equals(senderId));
		for (let msg of unreadMessages) {
			msg.read = true;
			await msg.save(); 
			// Notify the original sender that their message was read
			const senderSocketId = getReceiverSocketId(msg.senderId);
			if (senderSocketId) {
				io.to(senderSocketId).emit("messageRead", msg._id.toString());
			}
		}

		// After marking messages as read, compute updated unread counts per sender and emit to the current user so sidebar updates in real-time
		try {
			const loggedInUserId = senderId;
			const users = await Message.aggregate([
				{ $match: { receiverId: loggedInUserId, read: false } },
				{ $group: { _id: "$senderId", count: { $sum: 1 } } }
			]);

			const counts = users.reduce((acc, cur) => {
				acc[cur._id.toString()] = cur.count;
				return acc;
			}, {});

			const mySocketId = getReceiverSocketId(loggedInUserId);
			if (mySocketId) {
				io.to(mySocketId).emit("unreadCounts", counts);
			}
		} catch (err) {
			console.error("Error computing unread counts:", err.message);
		}

		res.status(200).json(messages);
	} catch (error) {
		console.error("Error in getMessages controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

	export const deleteMessage = async (req, res) => {
		try {
			const { id: messageId } = req.params;
			const userId = req.user._id;

			const message = await Message.findById(messageId);
			if (!message) return res.status(404).json({ error: "Message not found" });

			if (!message.senderId.equals(userId)) {
				return res.status(403).json({ error: "Forbidden - only sender can delete a message" });
			}

			await Message.findByIdAndDelete(messageId);

			await Conversation.updateMany({ messages: messageId }, { $pull: { messages: messageId } });

			res.status(200).json({ message: "Message deleted" });
		} catch (error) {
			console.error("Error in deleteMessage controller: ", error.message);
			res.status(500).json({ error: "Internal server error" });
		}
	};

	export const deleteConversation = async (req, res) => {
		try {
			const { id: otherUserId } = req.params;
			const userId = req.user._id;

			const conversation = await Conversation.findOne({ participants: { $all: [userId, otherUserId] } });
			if (!conversation) return res.status(404).json({ error: "Conversation not found" });

			if (conversation.messages && conversation.messages.length > 0) {
				await Message.deleteMany({ _id: { $in: conversation.messages } });
			}
			await Conversation.findByIdAndDelete(conversation._id);

			res.status(200).json({ message: "Conversation and messages deleted" });
		} catch (error) {
			console.error("Error in deleteConversation controller: ", error.message);
			res.status(500).json({ error: "Internal server error" });
		}
	};

export const updateMessage = async (req, res) => {
	try {
		const { id: messageId } = req.params;
		const { message: newText } = req.body;
		const userId = req.user._id;

		if (!newText || newText.trim().length === 0) {
			return res.status(400).json({ error: "Message cannot be empty" });
		}

		const message = await Message.findById(messageId);
		if (!message) return res.status(404).json({ error: "Message not found" });

		if (!message.senderId.equals(userId)) {
			return res.status(403).json({ error: "Forbidden - only sender can edit a message" });
		}

		message.message = newText;
		message.updatedAt = Date.now();
		await message.save();

		const receiverSocketId = getReceiverSocketId(message.receiverId);
		if (receiverSocketId) {
			io.to(receiverSocketId).emit("messageUpdated", message);
		}
		const senderSocketId = getReceiverSocketId(message.senderId);
		if (senderSocketId) {
			io.to(senderSocketId).emit("messageUpdated", message);
		}

		res.status(200).json(message);
	} catch (error) {
		console.error("Error in updateMessage controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};