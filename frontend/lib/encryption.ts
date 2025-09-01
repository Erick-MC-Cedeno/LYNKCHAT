import sodium from "libsodium-wrappers"

export interface EncryptedMessage {
  nonce: string
  message: string
}

class EncryptionManager {
  private initialized = false

  async initialize() {
    if (!this.initialized) {
      await sodium.ready
      this.initialized = true
    }
  }

  generateKeyPair() {
    if (!this.initialized) {
      throw new Error("Encryption manager not initialized")
    }

    const { publicKey, privateKey } = sodium.crypto_box_keypair()
    return {
      publicKey: sodium.to_base64(publicKey),
      privateKey: sodium.to_base64(privateKey),
    }
  }

  encryptMessage(message: string, recipientPublicKeyBase64: string): EncryptedMessage {
    if (!this.initialized) {
      throw new Error("Encryption manager not initialized")
    }

    const recipientPublicKey = sodium.from_base64(recipientPublicKeyBase64)
    const privateKey = sodium.from_base64(this.getPrivateKey())

    // Generate a unique nonce for this message
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)

    const encryptedMessage = sodium.crypto_box_easy(message, nonce, recipientPublicKey, privateKey)

    return {
      nonce: sodium.to_base64(nonce),
      message: sodium.to_base64(encryptedMessage),
    }
  }

  decryptMessage(encryptedData: EncryptedMessage, senderPublicKeyBase64: string): string {
    if (!this.initialized) {
      throw new Error("Encryption manager not initialized")
    }

    try {
      const encryptedMessage = sodium.from_base64(encryptedData.message)
      const nonce = sodium.from_base64(encryptedData.nonce)
      const senderPublicKey = sodium.from_base64(senderPublicKeyBase64)
      const privateKey = sodium.from_base64(this.getPrivateKey())

      const decryptedMessage = sodium.crypto_box_open_easy(encryptedMessage, nonce, senderPublicKey, privateKey)

      return sodium.to_string(decryptedMessage)
    } catch (error) {
      console.log("[v0] Decryption failed, returning original message:", error?.message || "Unknown error")
      return `[DECRYPTION FAILED: ${encryptedData.message.substring(0, 20)}...]`
    }
  }

  getPublicKey(): string {
    const publicKey = localStorage.getItem("lynkchat_public_key")
    if (!publicKey) {
      throw new Error("No public key found")
    }
    return publicKey
  }

  getPrivateKey(): string {
    const privateKey = localStorage.getItem("lynkchat_private_key")
    if (!privateKey) {
      throw new Error("No private key found")
    }
    return privateKey
  }

  storeKeyPair(publicKey: string, privateKey: string) {
    localStorage.setItem("lynkchat_public_key", publicKey)
    localStorage.setItem("lynkchat_private_key", privateKey)
  }

  hasKeyPair(): boolean {
    return !!(localStorage.getItem("lynkchat_public_key") && localStorage.getItem("lynkchat_private_key"))
  }

  clearKeys() {
    localStorage.removeItem("lynkchat_public_key")
    localStorage.removeItem("lynkchat_private_key")
  }
}

export const encryptionManager = new EncryptionManager()
