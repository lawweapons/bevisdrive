"use client";

import { useState } from "react";

interface FolderSettingsModalProps {
  folderName: string;
  currentIcon?: string;
  currentColor?: string;
  onSave: (icon: string, color: string) => void;
  onClose: () => void;
}

const FOLDER_ICONS = [
  "📂", "📁", "📦", "🗂", "💼", "🎨", "📸", "🎵", "🎬", "📝",
  "📚", "💰", "🏠", "✈️", "🎮", "🔒", "⭐", "❤️", "🔧", "📊"
];

const FOLDER_COLORS = [
  "#64748b", // slate
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

export default function FolderSettingsModal({
  folderName,
  currentIcon = "📂",
  currentColor = "#64748b",
  onSave,
  onClose,
}: FolderSettingsModalProps) {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);
  const [selectedColor, setSelectedColor] = useState(currentColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-slate-800 border border-slate-700 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Folder Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 rounded-lg bg-slate-700">
          <p className="text-white font-medium truncate">{folderName}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Icon</label>
          <div className="grid grid-cols-10 gap-1">
            {FOLDER_ICONS.map((icon) => (
              <button
                key={icon}
                onClick={() => setSelectedIcon(icon)}
                className={`p-2 text-lg rounded hover:bg-slate-600 ${
                  selectedIcon === icon ? "bg-slate-600 ring-2 ring-blue-500" : ""
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
          <div className="grid grid-cols-10 gap-1">
            {FOLDER_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-7 h-7 rounded-full ${
                  selectedColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-slate-800" : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{selectedIcon}</span>
          <span className="text-white" style={{ color: selectedColor }}>
            {folderName}
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(selectedIcon, selectedColor)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
