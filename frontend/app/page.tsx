"use client";

import { useEffect, useState } from "react";

type Product = {
  id: number;
  name: string;
  price: number;
  createdAt: string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((error) => console.error(error));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch("http://localhost:5000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        price,
      }),
    });

    const newProduct = await response.json();

    setProducts((prev) => [...prev, newProduct]);

    setName("");
    setPrice("");
  };

  const handleDelete = async (id: number) => {
    const response = await fetch(`http://localhost:5000/api/products/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      console.error("Failed to delete product");
      return;
    }

    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const handleUpdate = async (id: number) => {
    const response = await fetch(`http://localhost:5000/api/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        price,
      }),
    });

    const updatedProduct = await response.json();

    setProducts((prev) =>
      prev.map((product) => (product.id === id ? updatedProduct : product)),
    );

    setEditingId(null);
    setName("");
    setPrice("");
  };

  return (
    <main>
      <h1>Products</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();

          if (editingId !== null) {
            handleUpdate(editingId);
          } else {
            handleSubmit(e);
          }
        }}
      >
        <input
          type="text"
          placeholder="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <button type="submit">
          {editingId !== null ? "Update Product" : "Add Product"}
        </button>
      </form>

      <hr />

      {products.map((product) => (
        <div key={product.id}>
          <h2>{product.name}</h2>
          <p>₹{product.price}</p>

          <button
            onClick={() => {
              setEditingId(product.id);
              setName(product.name);
              setPrice(String(product.price));
            }}
          >
            Update
          </button>

          <button onClick={() => handleDelete(product.id)}>Delete</button>
        </div>
      ))}
    </main>
  );
}
