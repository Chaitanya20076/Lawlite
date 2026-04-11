const express = require("express");
const cors = require("cors");
require("dotenv").config();
const axios = require("axios");
const path = require("path"); // ✅ FIXED (moved up)

const chatRoute = require("./routes/chat");

console.log("ELEVEN KEY:", process.env.ELEVEN_API_KEY);

const app = express();

app.use(cors());
app.use(express.json());

// ✅ now safe to use path
app.use(express.static(path.join(__dirname, 'public')));

app.use("/chat", chatRoute);

// ==============================

app.get("/", (req, res) => {
  res.send("LAWLite Backend Running ⚖️");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port 5000");
});