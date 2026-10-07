"use client";

import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "@/services/productService";
import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const limit = 4;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");
        const product = await getProducts(currentPage, limit, debouncedSearch);
        console.log("==", product);
        setProducts(product.data);
        setTotalPages(product.pagination.totalPages);
      } catch (error) {
        setError("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, debouncedSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const newProduct = await createProduct(name, price);
      setProducts((prev) => [...prev, newProduct]);

      setName("");
      setPrice("");
    } catch (error) {
      setError("Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteProduct(id);
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const handleUpdate = async (id: number) => {
    const updatedProduct = await updateProduct(id, name, price);

    setProducts((prev) =>
      prev.map((product) => (product.id === id ? updatedProduct : product)),
    );
    setEditingId(null);
    setName("");
    setPrice("");
  };

  return (
    <main className="pt-10">
      <input
        type="text"
        placeholder="Search product..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
        className="m-2 border p-2"
      />
      <h1 className="font-medium ml-5 flex-1 justify-center align">
        Product Page
      </h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();

          if (editingId !== null) {
            handleUpdate(editingId);
          } else {
            handleSubmit(e);
          }
        }}
        className="m-2"
      >
        <input
          type="text"
          placeholder="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border mr-10"
        />

        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border mr-10"
        />

        <button
          disabled={submitting}
          type="submit"
          className="border-2 p-2 rounded-2xl bg-amber-500"
        >
          {editingId !== null ? (
            "Update Product"
          ) : submitting ? (
            <p>creating...</p>
          ) : (
            "Add Product"
          )}
        </button>
      </form>

      <hr />

      {loading && <p>Loading products...</p>}
      {error && <p className="font-stretch-50 text-red-600">{error}</p>}

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
            className="mr-10 border-2 rounded-2xl p-2 bg-amber-950"
          >
            Update
          </button>

          <button
            className="mr-10 border-2 rounded-2xl p-2 bg-amber-950"
            onClick={() => handleDelete(product.id)}
          >
            Delete
          </button>
        </div>
      ))}
      <hr />
      <div className="flex gap-4 mt-4">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
        >
          Previous
        </button>

        <span>
          Page {currentPage} of {totalPages}
        </span>

        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => prev + 1)}
        >
          Next
        </button>
      </div>
    </main>
  );
}
