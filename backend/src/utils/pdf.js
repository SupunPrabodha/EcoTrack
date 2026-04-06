import PDFDocument from "pdfkit";

export function fmtDateTime(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d || "");
  }
}

export function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return String(d || "");
  }
}

export function pct(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

export async function renderPdf(build) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    build(doc);
    doc.end();
  });
}
