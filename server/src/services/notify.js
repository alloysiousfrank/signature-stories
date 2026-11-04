/* Optional e-mail alert for new enquiries via the Resend HTTP API.
   Never throws: the enquiry is already saved, mail is best-effort. */
export async function notifyNewInquiry(env, inq, fetchImpl = fetch) {
  if (!env.resendKey) return false;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const html = `<h2>${inq.kind === "quote" ? "New quotation request" : "New enquiry"} — Signature Stories</h2>
<p><b>${esc(inq.name)}</b> ${esc(inq.email)} ${esc(inq.phone)} ${inq.email || inq.phone ? "" : "(no contact details given)"}</p>
<p>${esc(inq.eventType)} · ${esc(inq.eventDate) || "date TBC"} · ${esc(inq.guests)} guests${inq.packageName ? ` · ${esc(inq.packageName)}` : ""}</p>
${(inq.services || []).length ? `<p>Services: ${esc(inq.services.join(", "))}</p>` : ""}${inq.venue ? `<p>Venue: ${esc(inq.venue)}</p>` : ""}<p style="white-space:pre-wrap">${esc(inq.message)}</p>`;
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.mailFrom, to: [env.notifyEmail], ...(inq.email ? { reply_to: inq.email } : {}),
        subject: `${inq.kind === "quote" ? "Quotation request" : "New enquiry"}: ${inq.name} (${inq.eventType})`, html,
      }),
    });
    return res.ok;
  } catch { return false; }
}

export async function notifyConsultation(env, c, fetchImpl = fetch) {
  if (!env.resendKey) return false;
  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.mailFrom, to: [env.notifyEmail], ...(c.email ? { reply_to: c.email } : {}),
        subject: `Consultation request: ${c.name} on ${c.date} at ${c.slot}`,
        html: `<h2>New consultation request</h2><p><b>${esc(c.name)}</b> · ${esc(c.phone)} · ${esc(c.email)}</p>
<p>${esc(c.date)} at ${esc(c.slot)} (${esc(c.mode)})</p><p style="white-space:pre-wrap">${esc(c.topic)}</p>`,
      }),
    });
    return res.ok;
  } catch { return false; }
}

/* E-mails a quotation / invoice PDF to the client. Returns { ok, error }. */
export async function sendDocumentEmail(env, doc, pdfBase64, fetchImpl = fetch, link = "") {
  if (!env.resendKey) return { ok: false, error: "E-mail is not configured on the server (RESEND_API_KEY)." };
  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const isInv = doc.kind === "invoice";
  const label = isInv ? "Invoice" : "Quotation";
  const total = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(doc.total || 0);
  const html = `<div style="font-family:Georgia,serif;color:#242019;max-width:560px">
<h2 style="color:#8b6f33;margin:0 0 8px">Signature Stories</h2>
<p>Dear ${esc(doc.client?.name)},</p>
<p>Please find attached your ${label.toLowerCase()} <b>${esc(doc.number)}</b>${doc.eventType ? ` for your ${esc(doc.eventType.toLowerCase())}` : ""}.</p>
<p style="font-size:18px"><b>Total: ${esc(total)}</b>${doc.dueDate ? `<br><span style="font-size:14px">${isInv ? "Due" : "Valid until"}: ${esc(doc.dueDate)}</span>` : ""}</p>
${link ? `<p><a href="${esc(link)}" style="display:inline-block;background:#8b6f33;color:#fff;padding:10px 22px;border-radius:24px;text-decoration:none">${isInv ? "View invoice" : "View and accept quotation"}</a></p>` : ""}
<p>If you have any questions, simply reply to this email.</p>
<p>Warm regards,<br>Team Signature Stories</p></div>`;
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.mailFrom, to: [doc.client.email], reply_to: env.notifyEmail,
        subject: `${label} ${doc.number} from Signature Stories`, html,
        attachments: [{ filename: `${doc.number}.pdf`, content: pdfBase64 }],
      }),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.message || `Mail service returned ${res.status}.` };
  } catch { return { ok: false, error: "Could not reach the mail service." }; }
}

/* Generic transactional mail through Resend. Returns true on success, never throws. */
export async function sendMail(env, { to, subject, html, replyTo, attachments }, fetchImpl = fetch) {
  if (!env.resendKey || !to) return false;
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.mailFrom, to: [to], ...(replyTo ? { reply_to: replyTo } : {}), subject, html, ...(attachments ? { attachments } : {}) }),
    });
    return res.ok;
  } catch { return false; }
}
