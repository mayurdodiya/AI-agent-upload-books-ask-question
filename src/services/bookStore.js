/**
 * bookStore.js
 * Simple JSON file-based storage to track uploaded books
 * (In production, use MongoDB or PostgreSQL)
 */

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../../books.json');

function loadStore() {
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ books: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
}

function saveStore(data) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

function getAllBooks() {
  return loadStore().books;
}

function addBook(book) {
  const store = loadStore();
  store.books.push(book);
  saveStore(store);
}

function getBookById(bookId) {
  return loadStore().books.find(b => b.id === bookId);
}

function deleteBookFromStore(bookId) {
  const store = loadStore();
  store.books = store.books.filter(b => b.id !== bookId);
  saveStore(store);
}

module.exports = { getAllBooks, addBook, getBookById, deleteBookFromStore };
