"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "lifeos-todos";

export type TodoItem = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
};

export function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTodos(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load todos from localStorage", e);
    }
  }, []);

  // Save to localStorage whenever todos change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
      console.error("Failed to save todos to localStorage", e);
    }
  }, [todos]);

  const addTodo = () => {
    if (!input.trim()) return;
    setTodos([
      ...todos,
      {
        id: Date.now().toString(),
        text: input,
        done: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setInput("");
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((t) => t.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  const completedCount = todos.filter((t) => t.done).length;

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Todo List</h2>
        </div>
        {todos.length > 0 && (
          <span style={{ fontSize: "10px", color: "var(--muted)" }}>
            {completedCount}/{todos.length}
          </span>
        )}
      </div>

      <div style={{ padding: "15px" }}>
        {/* Input row */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a todo..."
            style={{
              flex: 1,
              height: "36px",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              background: "var(--canvas)",
              padding: "0 10px",
              fontSize: "11px",
              outline: "none",
              color: "var(--ink)",
            }}
          />
          <button
            onClick={addTodo}
            style={{
              width: "36px",
              height: "36px",
              border: "1px solid var(--line)",
              background: "var(--canvas)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--accent)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.background =
                "color-mix(in srgb, var(--accent) 8%, var(--canvas))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--line)";
              e.currentTarget.style.background = "var(--canvas)";
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Todo items */}
        <AnimatePresence mode="popLayout">
          {todos.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px 10px",
                color: "var(--muted)",
                fontSize: "10px",
              }}
            >
              No todos yet. Add one to get started.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "6px" }}>
              {todos.map((todo) => (
                <motion.div
                  key={todo.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    padding: "10px",
                    borderRadius: "8px",
                    background: todo.done
                      ? "color-mix(in srgb, var(--accent) 4%, var(--canvas))"
                      : "transparent",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!todo.done) {
                      (e.currentTarget as HTMLDivElement).style.background =
                        "color-mix(in srgb, var(--line) 50%, transparent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!todo.done) {
                      (e.currentTarget as HTMLDivElement).style.background =
                        "transparent";
                    }
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      background: todo.done ? "var(--accent)" : "var(--canvas)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: todo.done ? "white" : "transparent",
                      transition: "all 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} />
                  </button>

                  {/* Text */}
                  <span
                    style={{
                      flex: 1,
                      fontSize: "11px",
                      color: todo.done ? "var(--muted)" : "var(--ink)",
                      textDecoration: todo.done ? "line-through" : "none",
                      minWidth: 0,
                      wordBreak: "break-word",
                    }}
                  >
                    {todo.text}
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "none",
                      background: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "var(--muted)",
                      transition: "color 0.15s",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#cf625a";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--muted)";
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
