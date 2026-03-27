const express = require("express");
const { listBooks, deleteBook } = require("../services/vectorStore");

const router = express.Router();

/**
 * GET /api/books
 * List all uploaded books
 */
router.get("/", async (req, res) => {
  try {
    const books = await listBooks();
    res.json({ success: true, books });
  } catch (err) {
    console.error("List books error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/books/:bookId
 * Delete a book from the vector database
 */
router.delete("/:bookId", async (req, res) => {
  try {
    await deleteBook(req.params.bookId);
    res.json({ success: true, message: "Book deleted successfully" });
  } catch (err) {
    console.error("Delete book error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
console.log(__dirname,'-----------')