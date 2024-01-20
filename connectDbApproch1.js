import mongoose from "mongoose";
import { config } from "dotenv";
import express from "express";

// import { DB_NAME } from "./constants";
// Load environment variables from the .env file
config();

// Access the MongoDB connection URL from the environment variables
const MONGODB_URL = process.env.MONGODB_URL

// Create an instance of the express application
const app = express();
(async () => {
    try {
        // Connect to MongoDB using Mongoose
        await mongoose.connect(`${MONGODB_URL}`);

        // Log a successful connection to the database
        console.log("MongoDB is connected to the database");

        // Set up error handling for the express app
        app.on("error", (error) => {
            console.log("Express App Error:", error);
            throw error;
        });

        // Start the express app after successful database connection
        app.listen(process.env.PORT || 8080, () => {
            console.log(`App is listening on port ${process.env.PORT || 8080}`);
        });
    } catch (error) {
        // Log and throw any errors that occur during the setup
        console.error("Setup Error:", error.message);
        throw error;
    }
})();
