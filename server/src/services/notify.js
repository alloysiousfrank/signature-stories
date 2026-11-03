/* Optional e-mail alert for new enquiries via the Resend HTTP API.
   Never throws: the enquiry is already saved, mail is best-effort. */
export async function notifyNewInquiry(env, inq, fetchImpl = fetch) {
  if (!env.resendKey) return false;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const html = `<h2>New enquiry — Signature Stories</h2>
<p><b>${esc(inq.name)}</b> &lt;${esc(inq.email)}&gt; ${esc(inq.phone)}</p>
<p>${esc(inq.eventType)} · ${esc(inq.eventDate) || "date TBC"} · ${esc(inq.guests)} guests${inq.packageName ? ` · ${esc(inq.packageName)}` : ""}</p>
<p style="white-space:pre-wrap">${esc(inq.message)}</p>`;
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.mailFrom, to: [env.notifyEmail], reply_to: inq.email,
        subject: `New enquiry: ${inq.name} (${inq.eventType})`, html,
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
        from: env.mailFrom, to: [env.notifyEmail], reply_to: c.email,
        subject: `Consultation request: ${c.name} on ${c.date} at ${c.slot}`,
        html: `<h2>New consultation request</h2><p><b>${esc(c.name)}</b> · ${esc(c.phone)} · ${esc(c.email)}</p>
<p>${esc(c.date)} at ${esc(c.slot)} (${esc(c.mode)})</p><p style="white-space:pre-wrap">${esc(c.topic)}</p>`,
      }),
    });
    return res.ok;
  } catch { return false; }
}
