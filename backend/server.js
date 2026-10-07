import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "./src/generated/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { error } from "node:console";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

app.get("/api/products", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    console.error(error);
    // res.status(500).json({ error: "Failed to fetch products" });
    next(error);
  }
});

app.post("/api/products", async (req, res, next) => {
  try {
    const { name, price } = req.body;

    // Validation
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

    // Create product
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        price: numericPrice,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    // console.error(error);

    // res.status(500).json({
    //   error: "Failed to create product",
    // });
    next(error);
  }
});

app.put("/api/products/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body;

    // Validation
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

    // res.status(500).json({
    //   error: "Failed to update product",
    // });
    next(error);
  }
});

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
    // res.status(500).json({
    //   error: "Failed to delete product",
    // });
    next(error);
  }
});

// Error handler — हमेशा routes के बाद
app.use(errorHandler);

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
