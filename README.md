# EO App - Mobile Backend

## Overview

This is the **application layer for the mobile version of EO App**. It provides a robust RESTful API backend that handles business logic, data management, and communication with the database for the mobile client application.

## Technologies Used

### Core Framework
- **Node.js** - JavaScript runtime environment
- **Express.js** - Fast, unopinionated web framework for building RESTful APIs

### Database
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling library (ODM)

### Middleware & Utilities
- **Body-parser** - Middleware for parsing incoming request bodies
- **Express-async-handler** - Wrapper for handling async errors in Express
- **Express-handlebars** - Templating engine for rendering views
- **Dotenv** - Environment variable management
- **Nodemailer** - Email sending functionality

### Development Tools
- **Nodemon** - Automatic server restart during development

## Project Structure

```
Backend/
├── Server.js              # Main application entry point
├── Config/
│   └── db.js             # Database configuration
├── Controllers/
│   └── Controller.js     # Business logic for routes
├── Middleware/
│   └── errorMiddleware.js # Error handling middleware
├── Models/
│   ├── loanModel.js      # Loan data model
│   └── userModel.js      # User data model
└── Routes/
    ├── loanRoute.js      # Loan-related endpoints
    └── userRoute.js      # User-related endpoints
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with necessary environment variables

## Running the Application

### Development Mode
```bash
npm run server
```
Runs the application with Nodemon for hot reloading.

### Production Mode
```bash
npm start
```
Runs the application with Node.js.

## License

MIT License

## Author

Akila Ariyathilaka
