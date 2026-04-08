const express = require("express");
const cors = require("cors");
require("dotenv").config();
const axios = require("axios"); // 🔥 ADD THIS

const chatRoute = require("./routes/chat");
console.log("ELEVEN KEY:", process.env.ELEVEN_API_KEY);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // put analyzer files in /public
const path = require('path'); // add at top with other requires

app.use("/chat", chatRoute);

// ==============================
// 🔊 TEXT TO SPEECH ROUTE
// ==============================


// ==============================

app.get("/", (req, res) => {
  res.send("LAWLite Backend Running ⚖️");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port 5000");
});