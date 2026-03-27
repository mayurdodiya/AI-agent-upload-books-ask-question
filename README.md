# 📚 Book Q&A — AI-Powered Book Assistant

Ask any question about any book. Upload a PDF, DOCX, TXT, or image — get instant answers powered by AI.

## 🧠 How It Works (RAG Architecture)

```
Upload → Extract Text → Chunk → Embed → Store in Pinecone with metadata(bookId, userId)
Question from user → Convert embed → Search Pinecone → Send context(pincone data+quesaction) to Gemini → Answer → Send to user
```

## 🛠️ Tech Stack (All FREE)

| Layer        | Tool                      |
| ------------ | ------------------------- |
| LLM          | Google Gemini 1.5 Flash   |
| Embeddings   | Google text-embedding-001 |
| Vector DB    | Pinecone (free tier)      |
| PDF parsing  | pdf-parse                 |
| DOCX parsing | mammoth                   |
| Image OCR    | tesseract.js              |
| Backend      | Node.js + Express         |

---

## 🚀 Setup Instructions

### Step 1: Get Free API Keys

**I. Google Gemini API (Free)**

1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

**II. Hugging Face API (Free)**

1. Go to https://huggingface.co
2. R&d for getting api key
3. Copy the key


**III. Pinecone Vector DB (Free)**

1. Sign up at https://www.pinecone.io/
2. Create a new Index with:
   - **Name:** `books-index`
   - **Dimensions:** `3072`
   - **Metric:** `cosine`
3. Go to API Keys → copy your key

---

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your keys:

```
GEMINI_API_KEY=your_gemini_key_here
PINECONE_API_KEY=your_pinecone_key_here
PINECONE_INDEX_NAME=books-index
PORT=3000
```

---

### Step 3: Install & Run

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser 🎉

For development with auto-reload:

```bash
npm run dev
```

---

## 📡 API Reference

### 1 Upload a Book API

```
POST /api/upload
Content-Type: multipart/form-data

Fields:
  book  (file)    — PDF, DOCX, TXT, PNG, JPG
  title (string)  — Optional book title
```

**Response:**

```json
{
  "success": true,
  "message": "Book uploaded successfully!",
  "book": {
    "id": "uuid",
    "title": "My Book",
    "chunkCount": 142,
    "uploadedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### 2 Ask a Question API

```
POST /api/query
Content-Type: application/json

{
  "question": "What is the main theme of the book?",
  "bookId": "optional-book-uuid"  // omit to search ALL books
}
```

**Response:**

```json
{
  "success": true,
  "question": "What is the main theme?",
  "answer": "The main theme is...",
  "sources": [{ "bookTitle": "My Book", "bookId": "uuid" }],
  "chunksUsed": 5
}
```

---

### 3 List All Books API

```
GET /api/books
```

### Delete a Book

```
DELETE /api/books/:id
```

---

## 📁 Project Structure

```
book-qa-app/
├── src/
│   ├── index.js              # Express server entry point
│   ├── routes/
│   │   ├── upload.js         # POST /api/upload
│   │   ├── query.js          # POST /api/query
│   │   └── books.js          # GET/DELETE /api/books
│   └── services/
│       ├── parser.js         # PDF/DOCX/Image text extraction
│       ├── chunker.js        # Split text into chunks
│       ├── embedder.js       # Gemini embeddings
│       ├── vectorDB.js       # Pinecone store/search
│       ├── llm.js            # Gemini answer generation
│       └── bookStore.js      # Local JSON book metadata
├── public/
│   └── index.html            # Frontend UI
├── uploads/                  # Temp upload folder (auto-cleaned)
├── books.json                # Book metadata (auto-created)
├── .env                      # Your API keys (create from .env.example)
├── .env.example              # Template
└── package.json
```

---

## 💡 Tips

- **Large books** (500+ pages) may take 2-3 minutes to process — this is normal
- **Image files** use OCR — quality depends on image clarity
- **Pinecone free tier** allows up to 100,000 vectors (~250 average-length books)
- The app searches **all books** by default; click a specific book in the sidebar to limit search

---

## 🔧 Troubleshooting

| Problem                    | Solution                                                      |
| -------------------------- | ------------------------------------------------------------- |
| `GEMINI_API_KEY invalid`   | Double-check key at aistudio.google.com                       |
| `Pinecone index not found` | Create index named exactly `books-index` with 3072 dimensions |
| `PDF text too short`       | PDF may be scanned — try a text-based PDF                     |
| `Rate limit error`         | Gemini free tier: wait 1 minute and retry                     |


---

## 📚 Book-wise Search Flow (Vector Database Design)

This application supports asking questions **from a specific book** or **across all uploaded books**.  
To achieve this efficiently, all book data is stored inside a single Pinecone index using metadata-based filtering.

---

## 🧩 How Books Are Stored in Pinecone

When a book is uploaded, it is **not stored as a single document**.

Instead, the system:

1. Extracts text from the file
2. Splits text into smaller chunks
3. Converts each chunk into an embedding
4. Stores every chunk as an individual vector in Pinecone with metadata(bookId, userId)

All books share the same index:

---

## 🗄️ Pinecone Vector Structure

Each chunk saved in Pinecone looks like this:

```json
{
  "id": "bookId_chunkNumber",
  "values": [0.0123, 0.9834, ...],
  "metadata": {
    "bookId": "uuid-of-book",
    "bookTitle": "Atomic Habits",
    "chunkIndex": 12,
    "text": "You do not rise to the level of your goals..."
  }
}

---

## 🔄 Complete Application Flow

### 📥 Book Upload & Indexing Flow

Upload Book
↓
Extract Text (PDF/DOCX/OCR)
↓
Split into Chunks
↓
Generate Embeddings
↓
Store in Pinecone (with bookId metadata)


---

### ❓ Question Answering Flow

User Question
↓
Convert to Embedding
↓
Pinecone Similarity Search
(+ optional bookId filter)
↓
Top Matching Chunks
↓
Send Context(pincone data) + Question to Gemini
↓
Generate Answer
↓
Send to user

---

## 📊 Architecture Flow Diagram

Upload Book
↓
Text Extract
↓
Chunk Text
↓
Create Embedding
↓
Store in Pinecone(with bookId metadata)
User Question
↓
Create Question Embedding
↓
Pinecone Search
(filter by bookId if provided)
↓
Top Matching Chunks
↓
Gemini 1.5 Flash
↓
Answer send to user

---

