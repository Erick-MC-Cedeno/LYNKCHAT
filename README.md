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

### Auth

*   `POST /api/auth/signup`: Register a new user.
*   `POST /api/auth/login`: Log in a user.
*   `POST /api/auth/logout`: Log out a user.

### Users

*   `GET /api/user`: Get all users for the sidebar.

### Messages

*   `GET /api/messages/:id`: Get messages for a specific chat.
*   `POST /api/messages/send/:id`: Send a message to a specific user.