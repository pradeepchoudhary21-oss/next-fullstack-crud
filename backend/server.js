import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "./src/generated/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import errorHandler from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";
import pg from "pg";
import { pipeline } from "@xenova/transformers";
import multer from "multer";
import { PDFParse } from "pdf-parse";

const app = express();

// ======================================================
// PRISMA
// ======================================================

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json());

// ======================================================
// AUTH
// ======================================================

app.use("/api/auth", authRoutes);

// ======================================================
// POSTGRES POOL
// ======================================================

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ======================================================
// OPENROUTER
// ======================================================

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ======================================================
// PRODUCTS API
// ======================================================

app.get("/api/products", async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const where = {
      name: {
        contains: search,
        mode: "insensitive",
      },
    };

    const products = await prisma.product.findMany({
      skip,
      where,
      take: limit,
      orderBy: {
        id: "desc",
      },
    });

    const total = await prisma.product.count({
      where,
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================================================
// CREATE PRODUCT
// ======================================================

app.post("/api/products", authMiddleware, async (req, res, next) => {
  try {
    const { name, price } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        error: "Product name is required",
      });
    }

    const numericPrice = Number(price);

    if (!price || isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        error: "Price must be a valid positive number",
      });
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        price: numericPrice,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// ======================================================
// UPDATE PRODUCT
// ======================================================

app.put("/api/products/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        error: "Product name is required",
      });
    }

    const numericPrice = Number(price);

    if (!price || isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        error: "Price must be a valid positive number",
      });
    }

    const product = await prisma.product.update({
      where: {
        id: Number(id),
      },
      data: {
        name: name.trim(),
        price: numericPrice,
      },
    });

    res.json(product);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// ======================================================
// DELETE PRODUCT
// ======================================================

app.delete("/api/products/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.delete({
      where: {
        id: Number(id),
      },
    });

    res.json(product);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// ======================================================
// RANDOM MESSAGE
// ======================================================

// ======================================================
// SIMPLE AI API
// ======================================================

app.post("/api/ai", async (req, res, next) => {
  try {
    const { question } = req.body;

    // Validate request
    if (!question || typeof question !== "string") {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    const trimmedQuestion = question.trim();

    if (trimmedQuestion.length > 2000) {
      return res.status(400).json({
        message: "Question is too long",
      });
    }

    // Call OpenRouter
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "My AI Learning App",
      },

      body: JSON.stringify({
        model: "nvidia/nemotron-3.5-lightning:free",
        messages: [
          {
            role: "system",
            content:
              "Answer clearly and briefly. Keep the answer under 3 sentences.",
          },
          {
            role: "user",
            content: question,
          },
        ],
        reasoning: {
          effort: "none",
        },
        max_tokens: 50,
        temperature: 0,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);

      return res.status(response.status).json({
        message: "AI request failed",
        error: data?.error?.message || "Unknown OpenRouter error",
      });
    }

    const answer = data?.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({
        message: "AI returned an empty response",
      });
    }

    return res.status(200).json({
      answer,
      model: data.model,
      usage: data.usage || null,
    });
  } catch (error) {
    next(error);
  }
});

// ======================================================
// PDF MEMORY STORAGE
// ======================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// ======================================================
// EMBEDDING MODEL
// ======================================================

let embedder;

async function getEmbedder() {
  if (!embedder) {
    console.log("Loading embedding model...");

    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

    console.log("Embedding model loaded");
  }

  return embedder;
}

// ======================================================
// CREATE EMBEDDING
// ======================================================

async function createEmbedding(text) {
  const model = await getEmbedder();

  const output = await model(text, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

// ======================================================
// CREATE TEXT CHUNKS
// 150 WORDS + 30 WORD OVERLAP
// ======================================================

function createChunks(text, chunkSize = 150, overlap = 30) {
  const words = text.split(/\s+/);

  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words
      .slice(i, i + chunkSize)
      .join(" ")
      .trim();

    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

// ======================================================
// UPLOAD PDF
// PDF → TEXT → CHUNKS → EMBEDDINGS → POSTGRESQL
// ======================================================

app.post("/api/documents", upload.single("pdf"), async (req, res, next) => {
  try {
    // -----------------------------------------------
    // Validate PDF
    // -----------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        message: "PDF file is required",
      });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({
        message: "Only PDF files are allowed",
      });
    }

    console.log("PDF received:", req.file.originalname);

    // -----------------------------------------------
    // Extract PDF text
    // -----------------------------------------------

    const parser = new PDFParse({
      data: req.file.buffer,
    });

    const pdfData = await parser.getText();

    const text = pdfData.text;

    await parser.destroy();

    console.log("Extracted characters:", text.length);

    if (!text.trim()) {
      return res.status(400).json({
        message: "No readable text found in PDF",
      });
    }

    // -----------------------------------------------
    // Create document
    // -----------------------------------------------

    const documentResult = await pool.query(
      `
          INSERT INTO documents(name)
          VALUES($1)
          RETURNING id, name
        `,
      [req.file.originalname],
    );

    const document = documentResult.rows[0];

    // -----------------------------------------------
    // Create chunks
    // -----------------------------------------------

    const chunks = createChunks(text);

    console.log("Total chunks:", chunks.length);

    // -----------------------------------------------
    // Generate embeddings
    // -----------------------------------------------

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      console.log(`Embedding ${i + 1}/${chunks.length}`);

      const embedding = await createEmbedding(chunk);

      // ---------------------------------------------
      // Save chunk + embedding
      // ---------------------------------------------

      await pool.query(
        `
            INSERT INTO document_chunks
            (
              document_id,
              content,
              embedding,
              chunk_index
            )
            VALUES($1, $2, $3::vector, $4)
          `,
        [document.id, chunk, JSON.stringify(embedding), i],
      );
    }

    // Original PDF is NOT saved.
    // req.file.buffer remains only in memory
    // and becomes eligible for garbage collection.

    res.status(201).json({
      message: "PDF processed successfully",
      documentId: document.id,
      fileName: document.name,
      chunks: chunks.length,
    });
  } catch (error) {
    console.error("PDF processing error:", error);

    next(error);
  }
});

// ======================================================
// ASK QUESTION
// QUESTION → EMBEDDING → VECTOR SEARCH → OPENROUTER
// ======================================================

app.post("/api/documents/:documentId/ask", async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { question } = req.body;

    // -----------------------------------------------
    // Validate question
    // -----------------------------------------------

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return res.status(400).json({
        message: "Question cannot be empty",
      });
    }

    // -----------------------------------------------
    // Validate document ID
    // -----------------------------------------------

    const numericDocumentId = Number(documentId);

    if (!Number.isInteger(numericDocumentId) || numericDocumentId <= 0) {
      return res.status(400).json({
        message: "Invalid document ID",
      });
    }

    // -----------------------------------------------
    // Create embedding for question
    // -----------------------------------------------

    console.log("Creating question embedding...");

    const questionEmbedding = await createEmbedding(trimmedQuestion);

    // -----------------------------------------------
    // Vector similarity search
    // -----------------------------------------------

    const result = await pool.query(
      `
          SELECT
            content,
            1 - (embedding <=> $1::vector)
              AS similarity
          FROM document_chunks
          WHERE document_id = $2
          ORDER BY embedding <=> $1::vector
          LIMIT 3
        `,
      [JSON.stringify(questionEmbedding), numericDocumentId],
    );

    // -----------------------------------------------
    // No matching document
    // -----------------------------------------------

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No document data found",
      });
    }

    console.log("Relevant chunks:", result.rows.length);

    // -----------------------------------------------
    // Build context
    // -----------------------------------------------

    const context = result.rows.map((row) => row.content).join("\n\n");

    // -----------------------------------------------
    // OpenRouter FREE MODEL
    // -----------------------------------------------

    const openRouterResponse = await fetch(OPENROUTER_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,

        "HTTP-Referer": "http://localhost:3000",

        "X-Title": "PDF RAG Learning App",
      },

      body: JSON.stringify({
        model: "nvidia/nemotron-3.5-lightning:free",

        messages: [
          {
            role: "system",
            content: `You are a strict document Q&A assistant.

Answer ONLY using the provided document context.
Do not use your own knowledge.
Do not guess.
Do not modify names.

If the answer is not clearly present, say:
"I couldn't find that information in the document."

Keep the answer to one short sentence.`,
          },
          {
            role: "user",
            content: `
Document Context:

${context}

Question:

${trimmedQuestion}
      `,
          },
        ],

        reasoning: {
          effort: "none",
        },
        max_tokens: 30,
        temperature: 0,
      }),
    });

    const data = await openRouterResponse.json();

    if (!openRouterResponse.ok) {
      console.error("OpenRouter error:", data);

      return res.status(502).json({
        message: "OpenRouter request failed",
        error: data?.error?.message || "Unknown OpenRouter error",
      });
    }

    // -----------------------------------------------
    // OpenRouter error
    // -----------------------------------------------

    // if (!openRouterResponse.ok) {
    //   console.error("OpenRouter error:", data);

    //   return res.status(502).json({
    //     message: "OpenRouter request failed",

    //     error: data?.error?.message || "Unknown OpenRouter error",
    //   });
    // }

    // -----------------------------------------------
    // Extract answer
    // -----------------------------------------------

    // const answer = data?.choices?.[0]?.message?.content;

    // if (!answer) {
    //   return res.status(502).json({
    //     message: "OpenRouter returned an empty response",
    //   });
    // }

    const message = data?.choices?.[0]?.message;

    const answer = message?.content;

    if (!answer) {
      console.error(
        "OpenRouter returned no content:",
        JSON.stringify(message, null, 2),
      );

      return res.status(502).json({
        message: "OpenRouter returned no text content",
        model: data?.model || null,
        finishReason: data?.choices?.[0]?.finish_reason || null,
        message: message || null,
      });
    }

    // -----------------------------------------------
    // Final response
    // -----------------------------------------------

    res.json({
      answer,

      model: data.model,

      usage: data.usage || null,

      sources: result.rows.map((row) => ({
        similarity: Number(row.similarity),

        content: row.content,
      })),
    });
  } catch (error) {
    console.error("Question answering error:", error);

    next(error);
  }
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use(errorHandler);

// ======================================================
// START SERVER
// ======================================================

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
