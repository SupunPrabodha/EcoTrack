import React from "react";

export default function YearSelector({ years, selectedYear, onSelect }) {
  return (
    <div className="flex flex-col gap-2 items-start">
      {years.map((year) => (
        <button
          key={year}
          className={`px-4 py-2 rounded text-left font-medium transition-colors duration-150 ${
            year === selectedYear
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-200 hover:bg-gray-700"
          }`}
          onClick={() => onSelect(year)}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
