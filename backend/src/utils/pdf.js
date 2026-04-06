import PDFDocument from "pdfkit";

export const BRAND = {
  emerald: "#10b981",
  cyan: "#06b6d4",
  slate: "#0b1220",
  text: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  cardBg: "#f8fafc",
  zebra: "#f1f5f9",
};

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

export function drawBrandHeader(doc, { title, subtitle } = {}) {
  const headerH = 78;
  const accentH = 6;
  const pageW = doc.page.width;
  const marginL = doc.page.margins.left;
  const marginR = doc.page.margins.right;

  doc.save();
  doc.rect(0, 0, pageW, headerH).fill(BRAND.emerald);
  doc.rect(0, headerH - accentH, pageW, accentH).fill(BRAND.cyan);

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20);
  doc.text(title || "EcoTrack Report", marginL, 20, { width: pageW - marginL - marginR });

  if (subtitle) {
    doc.fillColor("#ecfeff").font("Helvetica").fontSize(10);
    doc.text(subtitle, marginL, 46, { width: pageW - marginL - marginR });
  }

  doc.restore();
  doc.x = marginL;
  doc.y = headerH + 22;
}

export function drawSectionTitle(doc, text) {
  doc.moveDown(0.6);
  const x = doc.page.margins.left;
  const y = doc.y;
  const right = doc.page.width - doc.page.margins.right;

  doc.save();
  doc.rect(x, y + 2, 3, 14).fill(BRAND.cyan);
  doc.fillColor(BRAND.text).font("Helvetica-Bold").fontSize(12);
  doc.text(text, x + 10, y, { width: right - (x + 10) });
  doc.restore();

  doc.moveDown(0.25);
  doc.strokeColor(BRAND.line).lineWidth(1).moveTo(x, doc.y).lineTo(right, doc.y).stroke();
  doc.moveDown(0.4);
}

export function drawKeyValue(doc, k, v) {
  const startX = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const keyW = 140;

  const y = doc.y;
  doc.fontSize(10);
  doc.fillColor(BRAND.muted).font("Helvetica").text(String(k), startX, y, { width: keyW });
  doc.fillColor(BRAND.text).font("Helvetica-Bold").text(String(v ?? "—"), startX + keyW, y, {
    width: right - (startX + keyW),
  });
  doc.moveDown(0.15);
}

export function drawKpiRow(doc, cards, { columns = 4 } = {}) {
  const items = Array.isArray(cards) ? cards.filter(Boolean) : [];
  if (!items.length) return;

  const gap = 10;
  const x0 = doc.page.margins.left;
  const y0 = doc.y;
  const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colCount = Math.max(1, Math.min(columns, items.length));
  const cardW = (usableW - gap * (colCount - 1)) / colCount;
  const cardH = 56;

  doc.save();
  for (let i = 0; i < colCount; i += 1) {
    const c = items[i];
    const x = x0 + i * (cardW + gap);

    doc.roundedRect(x, y0, cardW, cardH, 10).fillAndStroke(BRAND.cardBg, BRAND.line);
    doc.fillColor(BRAND.muted).font("Helvetica").fontSize(9).text(String(c.label || ""), x + 12, y0 + 10, {
      width: cardW - 24,
    });
    doc.fillColor(BRAND.text).font("Helvetica-Bold").fontSize(16).text(String(c.value ?? "—"), x + 12, y0 + 22, {
      width: cardW - 24,
    });
    if (c.sub) {
      doc.fillColor(BRAND.muted).font("Helvetica").fontSize(8).text(String(c.sub), x + 12, y0 + 42, {
        width: cardW - 24,
      });
    }
  }
  doc.restore();

  doc.y = y0 + cardH + 10;
  doc.x = x0;
}

function drawFooter(doc, { page, totalPages } = {}) {
  const marginL = doc.page.margins.left;
  const marginR = doc.page.margins.right;
  const y = doc.page.height - Math.max(doc.page.margins.bottom, 50) + 18;
  const usableW = doc.page.width - marginL - marginR;

  doc.save();
  doc.font("Helvetica").fontSize(8).fillColor(BRAND.muted);
  doc.text("EcoTrack", marginL, y, { width: usableW / 2, align: "left" });
  doc.text(`Page ${page}${totalPages ? ` of ${totalPages}` : ""}`, marginL, y, { width: usableW, align: "right" });
  doc.restore();
}

export async function renderPdf(build) {
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    build(doc);

    // Add footers with page numbers after content is generated.
    const range = doc.bufferedPageRange(); // { start: 0, count: N }
    const totalPages = range.count;
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      drawFooter(doc, { page: i + 1, totalPages });
    }

    doc.end();
  });
}
