import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "./src/generated/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const app = express();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

app.get("/api/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const { name, price } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        price: Number(price),
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body;

    const product = await prisma.product.update({
      where: {
        id: Number(id),
      },
      data: {
        name,
        price: Number(price),
      },
    });

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/products/:id", async (req, res) => {
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
    res.status(500).json({
      error: "Failed to delete product",
    });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
