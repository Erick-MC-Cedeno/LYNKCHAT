import sodium from "libsodium-wrappers"

export interface EncryptedMessage {
  nonce: string
  message: string
}

export class EncryptionService {
  private static instance: EncryptionService
  private isReady = false

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService()
    }
    return EncryptionService.instance
  }

  async initialize(): Promise<void> {
    if (!this.isReady) {
      await sodium.ready
      this.isReady = true
    }
  }

  generateKeyPair(): { publicKey: string; privateKey: string } {
    if (!this.isReady) {
      throw new Error("Encryption service not initialized")
    }

    const { publicKey, privateKey } = sodium.crypto_box_keypair()

    return {
      publicKey: sodium.to_base64(publicKey),
      privateKey: sodium.to_base64(privateKey),
    }
  }

  encryptMessage(message: string, recipientPublicKeyBase64: string): EncryptedMessage {
    if (!this.isReady) {
      throw new Error("Encryption service not initialized")
    }

    const recipientPublicKey = sodium.from_base64(recipientPublicKeyBase64)
    const privateKey = sodium.from_base64(this.getPrivateKey())
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)

    const encryptedMessage = sodium.crypto_box_easy(message, nonce, recipientPublicKey, privateKey)

    return {
      nonce: sodium.to_base64(nonce),
      message: sodium.to_base64(encryptedMessage),
    }
  }

  decryptMessage(encryptedData: EncryptedMessage, senderPublicKeyBase64: string): string {
    if (!this.isReady) {
      throw new Error("Encryption service not initialized")
    }

    const encryptedMessage = sodium.from_base64(encryptedData.message)
    const nonce = sodium.from_base64(encryptedData.nonce)
    const senderPublicKey = sodium.from_base64(senderPublicKeyBase64)
    const privateKey = sodium.from_base64(this.getPrivateKey())

    const decryptedMessage = sodium.crypto_box_open_easy(encryptedMessage, nonce, senderPublicKey, privateKey)

    return sodium.to_string(decryptedMessage)
  }

  storeKeys(publicKey: string, privateKey: string): void {
    localStorage.setItem("lynkchat_publicKey", publicKey)
    localStorage.setItem("lynkchat_privateKey", privateKey)
  }

  getPublicKey(): string {
    const key = localStorage.getItem("lynkchat_publicKey")
    if (!key) {
      throw new Error("No public key found")
    }
    return key
  }

  getPrivateKey(): string {
    const key = localStorage.getItem("lynkchat_privateKey")
    if (!key) {
      throw new Error("No private key found")
    }
    return key
  }

  hasKeys(): boolean {
    return !!(localStorage.getItem("lynkchat_publicKey") && localStorage.getItem("lynkchat_privateKey"))
  }

  clearKeys(): void {
    localStorage.removeItem("lynkchat_publicKey")
    localStorage.removeItem("lynkchat_privateKey")
  }
}

export const encryptionService = EncryptionService.getInstance()
