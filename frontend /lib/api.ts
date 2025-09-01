const API_BASE_URL = "http://localhost:5000/api"

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
  read: boolean // Added read field to match backend message model
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  _id: string
  fullName: string
  username: string
  image?: string
}

class ApiClient {
  private requestCache = new Map<string, { data: any; timestamp: number }>()
  private requestQueue = new Map<string, Promise<any>>()
  private readonly CACHE_DURATION = 30000 // 30 seconds
  private readonly REQUEST_DELAY = 1000 // 1 second between requests

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const cacheKey = `${options.method || "GET"}_${url}`

    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey)
    }

    if (!options.method || options.method === "GET") {
      const cached = this.requestCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data
      }
    }

    const requestPromise = this.makeRequest<T>(url, options, cacheKey)
    this.requestQueue.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      return result
    } finally {
      setTimeout(() => {
        this.requestQueue.delete(cacheKey)
      }, this.REQUEST_DELAY)
    }
  }

  private async makeRequest<T>(url: string, options: RequestInit, cacheKey: string): Promise<T> {
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include",
      ...options,
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!options.method || options.method === "GET") {
      this.requestCache.set(cacheKey, { data, timestamp: Date.now() })
    }

    return data
  }

  // Auth endpoints
  async signup(data: {
    fullName: string
    username: string
    password: string
    gender: string
    image?: string
  }): Promise<AuthResponse> {
    if (data.image) {
      const formData = new FormData()
      formData.append("fullName", data.fullName)
      formData.append("username", data.username)
      formData.append("password", data.password)
      formData.append("gender", data.gender)

      // Convert base64 to blob if needed
      if (data.image.startsWith("data:")) {
        const response = await fetch(data.image)
        const blob = await response.blob()
        formData.append("image", blob, "profile.jpg")
      }

      return this.request<AuthResponse>("/auth/signup", {
        method: "POST",
        headers: {}, // Remove Content-Type to let browser set it for FormData
        body: formData,
      })
    }

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
