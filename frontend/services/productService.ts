const API_URL = "http://localhost:5000/api";

export const getProducts = async (
  page: number = 1,
  limit: number = 10,
  search: string = "",
) => {
  const response = await fetch(
    `${API_URL}/products?page=${page}&limit=${limit}&search=${search}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  return response.json();
};

export const createProduct = async (name: string, price: string) => {
  const response = await fetch(`${API_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      price,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create product");
  }

  return response.json();
};

export const updateProduct = async (
  id: number,
  name: string,
  price: string,
) => {
  const response = await fetch(`${API_URL}/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, price }),
  });

  if (!response.ok) {
    throw new Error("Failed to update product");
  }

  return response.json();
};

export const deleteProduct = async (id: number) => {
  const response = await fetch(`${API_URL}/products/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete product");
  }

  return response.json();
};

export const sendTextMessage = async (text: string) => {
  const response = await fetch(`${API_URL}/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: text,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create product");
  }

  return response.json();
};

export const sendFile = async (formData: FormData) => {
  const response = await fetch(`${API_URL}/documents`, {
    method: "POST",
    body: formData,
  });

  console.log("response==>>", response);

  if (!response.ok) {
    throw new Error("Failed to send file");
  }

  return response.json();
};

export const askDocument = async (documentId: number, query: string) => {
  const response = await fetch(`${API_URL}/documents/${documentId}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: query,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to give answer from given file data");
  }

  return response.json();
};
