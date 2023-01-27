import { config } from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js"
// Load environment variables from the .env file
config();

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
// thinking to start access and refresh token

// ya wo