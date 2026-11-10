/* Invoice / quotation PDFs, styled in the site's ivory + champagne palette.
   Libraries and fonts load on demand so the public site stays light.
   Fonts: Cinzel (headings) and Cormorant Garamond (text), both SIL OFL;
   they include the rupee sign. */
import { BUSINESS } from "../config.js";
import { computeTotals, paymentSchedule } from "./shared.js";

const GOLD = [185, 154, 85], GOLD_DARK = [139, 111, 51], INK = [36, 32, 25], IVORY = [245, 240, 223], MUTED = [122, 115, 95];
const money = (n) => `\u20B9 ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)}`;
const day = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

async function logoData() {
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = "/assests/logo.png"; });
    const k = Math.min(1, 420 / img.naturalWidth); // keep the PDF small enough to e-mail
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return { url: c.toDataURL("image/png"), ratio: img.naturalWidth / img.naturalHeight };
  } catch { return null; }
}

export async function buildPdf(doc) {
  const [{ jsPDF }, autoTableMod, QR, F] = await Promise.all([import("jspdf"), import("jspdf-autotable"), import("qrcode"), import("./pdfFonts.js")]);
  const autoTable = autoTableMod.default || autoTableMod.autoTable;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  for (const [file, data, name, style] of [
    ["Cinzel.ttf", F.cinzel, "Cinzel", "normal"], ["CormorantM.ttf", F.body, "Cormorant", "normal"],
    ["CormorantSB.ttf", F.bold, "Cormorant", "bold"], ["CormorantI.ttf", F.italic, "Cormorant", "italic"],
  ]) { pdf.addFileToVFS(file, data); pdf.addFont(file, name, style); }
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 16;
  const isInv = doc.kind === "invoice";
  const t = computeTotals(doc);
  const received = isInv ? Math.min(t.total, Number(doc.amountPaid) || (doc.status === "paid" ? t.total : 0)) : 0;
  const balance = Math.max(0, Math.round((t.total - received) * 100) / 100);

  // header band
  pdf.setFillColor(...IVORY); pdf.rect(0, 0, W, 42, "F");
  pdf.setFillColor(...GOLD); pdf.rect(0, 42, W, 1.2, "F");
  const logo = await logoData();
  if (logo) { const h = 22; pdf.addImage(logo.url, "PNG", M, 10, h * logo.ratio, h); }
  pdf.setTextColor(...INK); pdf.setFont("Cinzel", "normal"); pdf.setFontSize(23);
  pdf.text(isInv ? "INVOICE" : "QUOTATION", W - M, 20, { align: "right" });
  pdf.setFont("Cormorant", "bold"); pdf.setFontSize(11); pdf.setTextColor(...GOLD_DARK);
  pdf.text(doc.number, W - M, 27, { align: "right" });
  pdf.setTextColor(...MUTED);
  pdf.text(`Date: ${day(doc.issueDate)}`, W - M, 32, { align: "right" });
  pdf.text(`${isInv ? "Due" : "Valid until"}: ${day(doc.dueDate)}`, W - M, 37, { align: "right" });

  // from / to
  let y = 54;
  pdf.setFontSize(8.5); pdf.setTextColor(...GOLD_DARK); pdf.setFont("Cinzel", "normal");
  pdf.text("FROM", M, y); pdf.text(isInv ? "BILLED TO" : "PREPARED FOR", W / 2 + 4, y);
  pdf.setFont("Cormorant", "normal"); pdf.setTextColor(...INK); pdf.setFontSize(11.5);
  const from = [BUSINESS.name, ...pdf.splitTextToSize(BUSINESS.address, W / 2 - M - 6), `Phone: ${BUSINESS.phone}`];
  pdf.text(from, M, y + 6);
  const c = doc.client;
  const to = [c.name, ...(c.address ? pdf.splitTextToSize(c.address, W / 2 - M - 6) : []), c.phone && `Phone: ${c.phone}`, c.email].filter(Boolean);
  pdf.text(to, W / 2 + 4, y + 6);
  y += 6 + Math.max(from.length, to.length) * 5 + 4;

  if (doc.eventType || doc.eventDate || doc.venue) {
    pdf.setFillColor(251, 246, 232); pdf.roundedRect(M, y, W - 2 * M, 12, 2, 2, "F");
    pdf.setFontSize(10.5); pdf.setTextColor(...INK);
    pdf.text(`Event: ${doc.eventType || "—"}     Date: ${day(doc.eventDate)}     Venue: ${doc.venue || "—"}`, M + 4, y + 7.4);
    y += 18;
  }

  autoTable(pdf, {
    startY: y,
    head: [["#", "Description", "Qty", "Rate", "Amount"]],
    body: doc.items.map((it, i) => [i + 1, it.description, it.qty, money(it.rate), money(Number(it.qty) * Number(it.rate))]),
    theme: "grid",
    margin: { left: M, right: M },
    styles: { font: "Cormorant", fontStyle: "normal", fontSize: 11, textColor: INK, lineColor: [225, 217, 190], lineWidth: 0.2, cellPadding: 3 },
    headStyles: { font: "Cinzel", fontStyle: "normal", fontSize: 9, fillColor: GOLD_DARK, textColor: [255, 253, 247] },
    alternateRowStyles: { fillColor: [251, 248, 238] },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 16, halign: "right" }, 3: { cellWidth: 34, halign: "right" }, 4: { cellWidth: 36, halign: "right" } },
  });

  y = pdf.lastAutoTable.finalY + 6;
  if (y > H - 90) { pdf.addPage(); y = 20; }
  const rows = [["Subtotal", money(t.subtotal)]];
  if (t.discount) rows.push(["Discount", `- ${money(t.discount)}`]);
  if (doc.gstPercent) rows.push([`GST @ ${doc.gstPercent}%`, money(t.tax)]);
  autoTable(pdf, {
    startY: y, body: rows, theme: "plain", tableWidth: 82, margin: { left: W - M - 82 },
    styles: { font: "Cormorant", fontStyle: "normal", fontSize: 11.5, textColor: INK, cellPadding: 1.8 }, columnStyles: { 1: { halign: "right" } },
  });
  y = pdf.lastAutoTable.finalY + 1;
  pdf.setFillColor(...GOLD_DARK); pdf.roundedRect(W - M - 82, y, 82, 11, 2, 2, "F");
  pdf.setTextColor(255, 253, 247); pdf.setFont("Cinzel", "normal"); pdf.setFontSize(10.5);
  pdf.text(isInv ? "TOTAL" : "TOTAL", W - M - 78, y + 7.2);
  pdf.setFont("Cormorant", "bold"); pdf.setFontSize(13);
  pdf.text(money(t.total), W - M - 4, y + 7.2, { align: "right" });
  if (isInv && doc.status === "paid") {
    pdf.setTextColor(47, 107, 63); pdf.setFont("Cinzel", "normal"); pdf.setFontSize(18); pdf.text("PAID", M, y + 8);
  }

  if (received > 0) {
    pdf.setFont("Cormorant", "normal"); pdf.setFontSize(11.5); pdf.setTextColor(...INK);
    pdf.text("Received", W - M - 78, y + 17); pdf.text(`- ${money(received)}`, W - M - 4, y + 17, { align: "right" });
    pdf.setFont("Cormorant", "bold"); pdf.text("Balance due", W - M - 78, y + 23); pdf.text(money(balance), W - M - 4, y + 23, { align: "right" });
    y += 12;
  }

  // payment schedule
  let ny = y + 22;
  if (ny > H - 70) { pdf.addPage(); ny = 20; }
  pdf.setFont("Cinzel", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(...GOLD_DARK); pdf.text("PAYMENT PLAN", M, ny);
  pdf.setFont("Cormorant", "normal"); pdf.setFontSize(11.5); pdf.setTextColor(...INK);
  let py = ny + 6;
  for (const r of paymentSchedule(t.total, doc.advancePercent)) {
    pdf.text(`${r.label}  ·  ${r.when}`, M, py);
    pdf.setFont("Cormorant", "bold"); pdf.text(money(r.amount), W - M, py, { align: "right" }); pdf.setFont("Cormorant", "normal");
    py += 6;
  }
  if (doc.paymentTerms) { pdf.setFont("Cormorant", "italic"); pdf.text(pdf.splitTextToSize(doc.paymentTerms, W - 2 * M), M, py); py += 6; pdf.setFont("Cormorant", "normal"); }
  ny = py + 4;

  // payment QR (invoices) + notes
  if (isInv && balance > 0 && doc.status !== "cancelled" && BUSINESS.upiId) {
    const upi = `upi://pay?pa=${encodeURIComponent(BUSINESS.upiId)}&pn=${encodeURIComponent(BUSINESS.short)}&am=${balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent(doc.number)}`;
    const qr = await QR.toDataURL(upi, { margin: 1, width: 300, color: { dark: "#242019", light: "#ffffff" } });
    if (ny + 40 > H - 24) { pdf.addPage(); ny = 20; }
    pdf.addImage(qr, "PNG", M, ny, 32, 32);
    pdf.setTextColor(...GOLD_DARK); pdf.setFontSize(8.5); pdf.setFont("Cinzel", "normal"); pdf.text("PAY BY UPI", M + 36, ny + 6);
    pdf.setFont("Cormorant", "normal"); pdf.setTextColor(...INK); pdf.setFontSize(11);
    pdf.text([`UPI ID: ${BUSINESS.upiId}`, `Amount: ${money(balance)}`, `Ref: ${doc.number}`], M + 36, ny + 12);
    ny += 38;
  }
  const terms = doc.notes || (isInv
    ? "Payment is due by the date above. Thank you for choosing us."
    : "This quotation is an estimate based on the details above and is subject to final confirmation of date, venue and guest count.");
  if (ny > H - 40) { pdf.addPage(); ny = 20; }
  pdf.setFont("Cinzel", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(...GOLD_DARK); pdf.text(isInv ? "NOTES" : "TERMS & NOTES", M, ny);
  pdf.setFont("Cormorant", "normal"); pdf.setFontSize(11); pdf.setTextColor(...INK);
  pdf.text(pdf.splitTextToSize(terms, W - 2 * M), M, ny + 5);

  // footer on every page
  const n = pdf.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...GOLD); pdf.setLineWidth(0.4); pdf.line(M, H - 16, W - M, H - 16);
    pdf.setFontSize(10); pdf.setTextColor(...MUTED); pdf.setFont("Cormorant", "italic");
    pdf.text(`${BUSINESS.name}  ·  ${BUSINESS.phone}  ·  ${BUSINESS.tagline}`, W / 2, H - 11, { align: "center" });
    pdf.setFont("Cormorant", "normal"); pdf.text(`Page ${i} of ${n}`, W - M, H - 11, { align: "right" });
  }
  return pdf;
}

export async function downloadPdf(doc) {
  const pdf = await buildPdf(doc);
  pdf.save(`${doc.number}.pdf`);
}

export async function pdfBlob(doc) {
  const pdf = await buildPdf(doc);
  return pdf.output("blob");
}

export async function pdfBase64(doc) {
  const pdf = await buildPdf(doc);
  return pdf.output("datauristring").split("base64,")[1];
}
