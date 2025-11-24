# LYNKCHAT

LYNKCHAT is a real-time chat application built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.io. It provides a platform for users to communicate with each other instantly.

## Technologies

Below are the main technologies used in this project.


- **Javascript**
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

- **Typescript**
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

- **Next.js**
  [![Next.js](https://img.shields.io/badge/Next.js-Black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)

- **Node.js**
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

- **Express.js**
  [![Express.js](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

- **JSON Web Tokens (JWT)**
  [![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white)](https://jwt.io/)

- **Tailwind CSS**
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

- **MongoDB**
  [![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

- **Socket.IO**
  [![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

---

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
  *   **Response:** `200 OK` with an array of user objects.

### Messages

*   **`GET /messages/:id`**
    *   Gets the messages for a specific chat.
    *   `:id` is the ID of the other user in the conversation.
    *   **Response:** `200 OK` with an array of message objects.

*   **`POST /messages/send/:id`**
    *   Sends a message to a specific user.
    *   `:id` is the ID of the recipient.
    *   **Request Body:** `message` (string).
    *   **Response:** `201 Created` with the new message object.

## Screenshots

Here are some screenshots of the application UI. Click to view full size.

- Chat list / conversation

- Login screen

 ![Login](frontend/assets/screenshots/login.png)

- Registration screen

![Register](frontend/assets/screenshots/register.png)

- Chat list / conversation

![Chat UI](frontend/assets/screenshots/chatui.png)

![Chat overview](frontend/assets/screenshots/chat.png)
  