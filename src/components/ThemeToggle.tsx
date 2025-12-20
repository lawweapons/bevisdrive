"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("bevisdrive-theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle("light-mode", saved === "light");
    }
  }, []);

  function toggle() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("bevisdrive-theme", newTheme);
    document.documentElement.classList.toggle("light-mode", newTheme === "light");
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
