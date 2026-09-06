require("dotenv").config();

const express = require("express");
const cors = require("cors");
const chatRoutes = require("./routes/chatRoutes");
require("./config/firebase");

const authRoutes = require("./routes/authRoutes");

const app = express();

const PORT = process.env.PORT || 5000;


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());


// ==========================================
// ROUTES
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Lawlite backend is running 🚀",
  });
});


app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Lawlite API is healthy",
  });
});


app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);


// ==========================================
// SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(
    `🚀 Lawlite backend running on http://localhost:${PORT}`
  );
});