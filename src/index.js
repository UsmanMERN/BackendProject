import { config } from "dotenv ";
import express from "express";
import connectDB from "./db/index.js";

// Load environment variables from the .env file
config();

// Create an instance of the express application
const app = express();



// PORT
const PORT = process.env.PORT || 8080
// dataBase is connected
connectDB().then(() => {
    // Start the express app after successful database connection
    app.listen(PORT, () => {
        console.log(`App is listening on port ${PORT}`);
    })
}
)