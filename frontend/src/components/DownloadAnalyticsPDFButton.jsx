import React from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function DownloadAnalyticsPDFButton({ targetId }) {
  const handleDownload = async () => {
    const input = document.getElementById(targetId);
    if (!input) return;
    // Save original overflow style
    const originalOverflow = input.style.overflow;
    const originalMaxHeight = input.style.maxHeight;
    // Remove overflow and maxHeight to show all content
    input.style.overflow = 'visible';
    input.style.maxHeight = 'none';
    // Optionally, scroll into view
    input.scrollIntoView();
    // Wait a tick to allow reflow
    await new Promise((res) => setTimeout(res, 100));
    // Use html2canvas to capture the analytics section
    const canvas = await html2canvas(input, { scale: 2, useCORS: true });
    // Restore original styles
    input.style.overflow = originalOverflow;
    input.style.maxHeight = originalMaxHeight;
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("emissions-analytics.pdf");
  };

  return (
    <button
      className="mb-4 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all"
      onClick={handleDownload}
    >
      Download Analytics as PDF
    </button>
  );
}
