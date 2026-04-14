const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const axios = require("axios");

const chatRoute = require("./routes/chat");
console.log("ELEVEN KEY:", process.env.ELEVEN_API_KEY);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use("/chat", chatRoute);

app.get("/", (req, res) => {
  res.send("LAWLite Backend Running ⚖️");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port 5000");
});