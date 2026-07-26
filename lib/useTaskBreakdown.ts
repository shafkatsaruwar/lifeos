import { useState } from "react";

export function useTaskBreakdown() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBreakdown = async (task: { title: string; notes?: string; focusMinutes: number; energy: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "breakdown", task }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not make a checklist.");
      return data.steps as string[];
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not make a checklist.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createBreakdown, loading, error };
}
