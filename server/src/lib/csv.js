const esc = (v) => {
  let s = v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function inquiriesToCsv(rows) {
  const head = ["Received", "Name", "Email", "Phone", "Event", "Event date", "Guests", "Package", "Status", "Message"];
  const lines = [head.join(",")];
  for (const r of rows) {
    lines.push([
      new Date(r.createdAt).toISOString(), r.name, r.email, r.phone, r.eventType,
      r.eventDate, r.guests, r.packageName, r.status, r.message,
    ].map(esc).join(","));
  }
  return lines.join("\n");
}
