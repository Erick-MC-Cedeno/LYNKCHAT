const API_BASE_URL = "http://localhost:5000/api"

// Types based on the backend models
export interface User {
  _id: string
  fullName: string
  username: string
  gender: "male" | "female"
  image?: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  _id: string
  senderId: string
  receiverId: string
  message: string
  read: boolean
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  _id: string
  participants: string[]
  messages: string[]
  createdAt: string
  updatedAt: string
}

// Auth API functions
export const authAPI = {
  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch current user");
    }

    return response.json();
  },

  async signup(data: {
    fullName: string
    username: string
    password: string
    gender: "male" | "female"
    image?: File
  }): Promise<{ user: User }> {
    const formData = new FormData()
    formData.append("fullName", data.fullName)
    formData.append("username", data.username)
    formData.append("password", data.password)
    formData.append("gender", data.gender)
    if (data.image) {
      formData.append("image", data.image)
    }

    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      body: formData,
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Signup failed")
    }

    return response.json()
  },

  async login(data: {
    username: string
    password: string
  }): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Login failed")
    }

    return response.json()
  },

  async logout(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("Logout failed")
    }
  },
}

// User API functions
export const userAPI = {
  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/user`, {
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("Failed to fetch users")
    }

    return response.json()
  },
}

// Message API functions
export const messageAPI = {
  async getMessages(userId: string): Promise<Message[]> {
    const response = await fetch(`${API_BASE_URL}/messages/${userId}`, {
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("Failed to fetch messages")
    }

    return response.json()
  },

  async sendMessage(userId: string, message: string): Promise<Message> {
    const response = await fetch(`${API_BASE_URL}/messages/send/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("Failed to send message")
    }

    return response.json()
  },

  async deleteMessage(messageId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/messages/message/${messageId}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to delete message")
    }

    return response.json()
  },

  async deleteConversation(otherUserId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/messages/conversation/${otherUserId}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to delete conversation")
    }

    return response.json()
  },
  async updateMessage(messageId: string, newText: string): Promise<Message> {
    const response = await fetch(`${API_BASE_URL}/messages/message/${messageId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: newText }),
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to update message")
    }

    return response.json()
  },
}
