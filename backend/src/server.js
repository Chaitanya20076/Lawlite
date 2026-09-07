require("dotenv").config();

const express = require("express");
const cors = require("cors");

const chatRoutes = require("./routes/chatRoutes");
const authRoutes = require("./routes/authRoutes");
const connectorRoutes = require("./routes/connectorRoutes");
const dropboxRoutes = require("./routes/dropboxRoutes");

require("./config/firebase");

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

// ==========================================
// AUTH
// ==========================================

app.use("/api/auth", authRoutes);

// ==========================================
// CHAT
// ==========================================

app.use("/api/chat", chatRoutes);

// ==========================================
// GOOGLE DRIVE CONNECTOR
// ==========================================

app.use(
  "/api/connectors",
  connectorRoutes
);

// ==========================================
// DROPBOX CONNECTOR
// ==========================================

app.use(
  "/api/connectors/dropbox",
  dropboxRoutes
);

// ==========================================
// SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(
    `🚀 Lawlite backend running on http://localhost:${PORT}`
  );
});