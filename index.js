import { config } from "dotenv";
import connectDB from "./db/index.js";
// import { app } from "./app.js"
// Load environment variables from the .env file
config();


app.get("/", (req, res) => {
    res.json("Hellow")
})
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