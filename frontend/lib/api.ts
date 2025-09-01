const API_BASE_URL = "http://localhost:3000/api"

export interface User {
  _id: string
  fullName: string
  username: string
  gender: string
  image?: string
  publicKey?: string
}

export interface Message {
  _id: string
  senderId: string
  receiverId: string
  message: string
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Include cookies for JWT
      ...options,
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Auth endpoints
  async signup(data: {
    fullName: string
    username: string
    password: string
    gender: string
    image?: string
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async login(data: {
    username: string
    password: string
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async logout(): Promise<void> {
    return this.request<void>("/auth/logout", {
      method: "POST",
    })
  }

  // User endpoints
  async getUsers(): Promise<User[]> {
    return this.request<User[]>("/user")
  }

  async updatePublicKey(publicKey: string): Promise<void> {
    return this.request<void>("/user/publicKey", {
      method: "POST",
      body: JSON.stringify({ publicKey }),
    })
  }

  // Message endpoints
  async getMessages(userId: string): Promise<Message[]> {
    return this.request<Message[]>(`/messages/${userId}`)
  }

  async sendMessage(userId: string, message: string): Promise<Message> {
    return this.request<Message>(`/messages/send/${userId}`, {
      method: "POST",
      body: JSON.stringify({ message }),
    })
  }
}

export const apiClient = new ApiClient()
