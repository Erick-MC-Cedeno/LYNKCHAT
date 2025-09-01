# LYNKCHAT

LYNKCHAT is a real-time chat application built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.io. It provides a platform for users to communicate with each other instantly.

## Features

*   User authentication (signup and login)
*   Real-time messaging with Socket.io
*   Online user status
*   Message read status
*   Typing indicators
*   Secure password hashing
*   JWT-based authentication
*   Mongoose for MongoDB object modeling

## Technologies Used

### Backend

*   **Node.js:** JavaScript runtime environment
*   **Express:** Web framework for Node.js
*   **MongoDB:** NoSQL database
*   **Mongoose:** Object Data Modeling (ODM) library for MongoDB
*   **Socket.io:** Library for real-time, bidirectional and event-based communication
*   **JSON Web Token (JWT):** For secure user authentication
*   **bcryptjs:** For password hashing
*   **cookie-parser:** For parsing cookies

## Backend Installation

To get the backend server running locally, follow these steps:

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Erick-MC-Cedeno/LYNKCHAT.git
    cd LYNKCHAT/backend
    ```

2.  **Install dependencies:**

    This project uses `pnpm` as the package manager. You can install it with `npm install -g pnpm`.

    ```bash
    pnpm install
    ```

    Alternatively, you can use `npm`:

    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env` file in the `backend` directory and add the following variables:

    ```
    PORT=5000
    MONGO_DB_URI=<YOUR_MONGODB_CONNECTION_STRING>
    JWT_SECRET=<YOUR_JWT_SECRET>
    ```

    *   `PORT`: The port on which the server will run.
    *   `MONGO_DB_URI`: Your MongoDB connection string.
    *   `JWT_SECRET`: A secret key for signing JWTs.

4.  **Run the server:**

    ```bash
    nodemon server.js
    ```

    The server will start on the port specified in your `.env` file (e.g., `http://localhost:5000`).

## API Endpoints

All endpoints are prefixed with `/api`.

### Auth

*   **`POST /auth/signup`**
    *   Registers a new user.
    *   **Request Body:** `fullName`, `username`, `password`, `gender`, `image` (optional).
    *   **Response:** `201 Created` with user object.

*   **`POST /auth/login`**
    *   Logs in a user.
    *   **Request Body:** `username`, `password`.
    *   **Response:** `200 OK` with user object.

*   **`POST /auth/logout`**
    *   Logs out a user.
    *   **Response:** `200 OK`.

### Users

*   **`GET /user`**
    *   Gets all users for the sidebar, excluding the logged-in user.
    *   **Response:** `200 OK` with an array of user objects. Each user object now includes a `publicKey` field for end-to-end encryption.

*   **`POST /user/publicKey`**
    *   Updates the public key for the authenticated user.
    *   **Request Body:** `publicKey` (string).
    *   **Response:** `200 OK` with a success message.

### Messages

*   **`GET /messages/:id`**
    *   Gets the messages for a specific chat.
    *   `:id` is the ID of the other user in the conversation.
    *   **Response:** `200 OK` with an array of message objects.

*   **`POST /messages/send/:id`**
    *   Sends a message to a specific user.
    *   `:id` is the ID of the recipient.
    *   **Request Body:** `message` (string). The message should be encrypted on the client-side before sending.
    *   **Response:** `201 Created` with the new message object.

## End-to-End Encryption

This application implements end-to-end encryption to ensure that messages are private and secure. Only the sender and the recipient can read the messages. The server only stores the encrypted messages and has no way to decrypt them.

### How it Works

The encryption is based on a public/private key pair system (asymmetric cryptography).

1.  **Key Pair Generation:** Each user generates a public and a private key.
    *   The **public key** is shared with other users via the server.
    *   The **private key** is kept secret and stored only on the user's device.

2.  **Encryption:** When a user (Alice) wants to send a message to another user (Bob), Alice encrypts the message using Bob's public key.

3.  **Decryption:** When Bob receives the message, he uses his own private key to decrypt it.

### Frontend Implementation Guide

Here is a step-by-step guide on how to implement the end-to-end encryption on the frontend using the `libsodium-wrappers` library.

**1. Install `libsodium-wrappers`:**

```bash
npm install libsodium-wrappers
```

**2. Initialize Sodium:**

It's important to initialize the library before using it. You can do this in the main entry point of your application.

```javascript
import sodium from 'libsodium-wrappers';

async function main() {
  await sodium.ready;
  // Your application logic here
}

main();
```

**3. Generate Key Pair:**

When a user registers or logs in for the first time, generate a key pair for them and store it securely on the device (e.g., in `localStorage`).

```javascript
import sodium from 'libsodium-wrappers';

// Generate a key pair for encryption
const { publicKey, privateKey } = sodium.crypto_box_keypair();

// Store the keys in localStorage
localStorage.setItem('publicKey', sodium.to_base64(publicKey));
localStorage.setItem('privateKey', sodium.to_base64(privateKey));
```

**4. Upload Public Key to Server:**

After generating the keys, upload the public key to the server using the `POST /api/user/publicKey` endpoint.

```javascript
const publicKey = localStorage.getItem('publicKey');

await fetch('/api/user/publicKey', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Include your authentication token
  },
  body: JSON.stringify({ publicKey }),
});
```

**5. Encrypt a Message:**

Before sending a message, get the recipient's public key and use it to encrypt the message.

```javascript
import sodium from 'libsodium-wrappers';

function encryptMessage(message, recipientPublicKeyBase64) {
  const recipientPublicKey = sodium.from_base64(recipientPublicKeyBase64);
  const privateKey = sodium.from_base64(localStorage.getItem('privateKey'));

  // It's recommended to use a nonce (number used once) for each message
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

  const encryptedMessage = sodium.crypto_box_easy(
    message,
    nonce,
    recipientPublicKey,
    privateKey
  );

  return {
    nonce: sodium.to_base64(nonce),
    message: sodium.to_base64(encryptedMessage),
  };
}

// Example usage:
const recipient = /* get recipient user object from your state */;
const encrypted = encryptMessage("Hello, world!", recipient.publicKey);

// Now you can send the `encrypted` object to the server.
// You might want to stringify it before sending.
const messageToSend = JSON.stringify(encrypted);
```

**6. Decrypt a Message:**

When you receive a message, use the user's private key to decrypt it.

```javascript
import sodium from 'libsodium-wrappers';

function decryptMessage(encryptedMessageObject, senderPublicKeyBase64) {
  const encryptedMessage = sodium.from_base64(encryptedMessageObject.message);
  const nonce = sodium.from_base64(encryptedMessageObject.nonce);
  const senderPublicKey = sodium.from_base64(senderPublicKeyBase64);
  const privateKey = sodium.from_base64(localStorage.getItem('privateKey'));

  const decryptedMessage = sodium.crypto_box_open_easy(
    encryptedMessage,
    nonce,
    senderPublicKey,
    privateKey
  );

  return sodium.to_string(decryptedMessage);
}

// Example usage:
const receivedMessage = /* get the message object from the server */;
const sender = /* get the sender user object from your state */;

// The message from the server should be parsed if it was stringified
const encryptedData = JSON.parse(receivedMessage.message);

const decrypted = decryptMessage(encryptedData, sender.publicKey);
console.log(decrypted); // "Hello, world!"
```

This guide provides a basic implementation. You should adapt it to your specific frontend architecture and state management.