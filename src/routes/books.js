/**
 * books.js route
 * GET  /api/books       — list all uploaded books
 * GET  /api/books/:id   — get a specific book
 * DELETE /api/books/:id — delete a book
 */

const express = require('express');
const { getAllBooks, getBookById, deleteBookFromStore } = require('../services/bookStore');
const { deleteBook } = require('../services/vectorDB');

const router = express.Router();

// GET all books
router.get('/', (req, res) => {
  const books = getAllBooks();
  res.json({ success: true, count: books.length, books });
});

// GET single book
router.get('/:id', (req, res) => {
  const book = getBookById(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json({ success: true, book });
});

// DELETE a book
router.delete('/:id', async (req, res, next) => {
  try {
    const book = getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    // Delete from Pinecone
    await deleteBook(req.params.id);

    // Delete from local store
    deleteBookFromStore(req.params.id);

    res.json({ success: true, message: `Book "${book.title}" deleted successfully` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
