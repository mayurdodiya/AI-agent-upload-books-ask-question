require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const uploadRoutes = require("./routes/upload");
const queryRoutes = require("./routes/query");
const bookRoutes = require("./routes/books");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/upload", uploadRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/books", bookRoutes);

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Book Q&A App running at http://localhost:${PORT}`);
  console.log(`📚 Upload books and ask questions!\n`);
});
