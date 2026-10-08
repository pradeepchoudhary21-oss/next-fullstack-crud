"use client";

import {
  askDocument,
  sendFile,
  sendTextMessage,
} from "@/services/productService";
import { useRef, useState } from "react";

type Mode = "text" | "file" | "image";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("text");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();

    const newMessage: Message = {
      role: "user",
      content: userMessage,
    };
    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
    setLoading(true);

    try {
      if (mode === "text") {
        const data = await sendTextMessage(userMessage);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer,
          },
        ]);
      } else if (mode === "file") {
        if (documentId === null) {
          throw new Error("Please upload a PDF first.");
        }

        const data = await askDocument(documentId, userMessage);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer,
          },
        ]);
      }
    } catch (error) {
      setError(JSON.stringify(error));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const data = await sendFile(formData);
      console.log("PDF upload response:", data);

      setDocumentId(data.documentId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (error) {
      console.error("PDF upload error:", error);
      alert("PDF upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[700px] bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b px-6 py-4">
          <h1 className="text-xl font-semibold">AI Assistant</h1>

          <p className="text-sm text-gray-500">
            Ask questions or upload a document
          </p>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-700">
                  How can I help you?
                </h2>

                <p className="text-gray-500 mt-2">
                  Ask a question or select a file mode.
                </p>
              </div>
            </div>
          ) : (
            messages.map((item, index) => (
              <div
                key={index}
                className={`flex ${
                  item.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    item.role === "user"
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {item.content}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex gap-3">
            {/* Left Input */}
            <div className="flex-1">
              {mode === "text" && (
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type your question..."
                  className="w-full h-24 resize-none rounded-xl border border-gray-300 p-4 outline-none focus:border-black placeholder:text-gray-300 text-mauve-950"
                />
              )}

              {mode === "file" && (
                <div className="space-y-3">
                  {/* PDF Upload */}
                  <div
                    onClick={() => {
                      if (!documentId) {
                        fileInputRef.current?.click();
                      }
                    }}
                    className="h-24 cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center transition hover:border-black hover:bg-gray-100"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0];

                        if (!selectedFile) return;

                        if (selectedFile.type !== "application/pdf") {
                          alert("Only PDF files are allowed");
                          return;
                        }

                        setFile(selectedFile);
                        setDocumentId(null);
                      }}
                    />

                    {!file ? (
                      <div className="text-center">
                        <div className="text-2xl mb-1">📄</div>

                        <p className="text-sm font-medium text-gray-700">
                          Drop your PDF here or{" "}
                          <span className="text-black underline">
                            choose a file
                          </span>
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          PDF files only
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4">
                        <div className="text-2xl">📄</div>

                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {file.name}
                          </p>

                          {documentId ? (
                            <p className="text-xs text-green-600">
                              Document ready ✓
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">
                              PDF selected
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Ready */}
                  {documentId && (
                    <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-2">
                      <span className="text-sm text-green-700">
                        ✓ Document ready
                      </span>

                      <span className="text-xs text-green-600">
                        ID: {documentId}
                      </span>
                    </div>
                  )}

                  {/* Question Input */}
                  {documentId && (
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Ask a question about your PDF..."
                      className="w-full h-20 resize-none rounded-xl border border-gray-300 p-4 outline-none focus:border-black placeholder:text-gray-300 text-gray-950"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Right Buttons */}
            <div className="w-24 flex flex-col gap-2">
              <button
                onClick={() => setMode("text")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === "text"
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Text
              </button>

              <button
                onClick={() => setMode("file")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === "file"
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                File
              </button>
            </div>
          </div>

          {/* Send Button */}

          <div className="flex justify-end mt-3">
            {mode === "text" ? (
              <button
                onClick={handleSend}
                disabled={!message.trim() || loading}
                className="px-6 py-2 rounded-lg bg-black text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? "Thinking..." : "Send"}
              </button>
            ) : documentId === null ? (
              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                className="px-6 py-2 rounded-lg bg-black text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {uploading ? "Processing..." : "Upload & Process"}
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!message.trim() || loading}
                className="px-6 py-2 rounded-lg bg-black text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? "Thinking..." : "Ask"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
