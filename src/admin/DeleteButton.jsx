import { useState } from "react";

/* Two-step delete that works in every browser (window.confirm is blocked in
   some in-app browsers). First tap asks, second tap deletes. */
export default function DeleteButton({ onConfirm, label = "Delete", small = false, what = "this" }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const cls = `adm-btn adm-danger${small ? " small" : ""}`;
  if (!asking) {
    return <button type="button" className={cls} onClick={(e) => { e.stopPropagation(); setAsking(true); }}>{label}</button>;
  }
  return (
    <span className="adm-confirm" onClick={(e) => e.stopPropagation()}>
      <span>Delete {what}?</span>
      <button type="button" className={cls} disabled={busy}
        onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); setAsking(false); } }}>
        {busy ? "Deleting…" : "Yes, delete"}
      </button>
      <button type="button" className="adm-btn adm-ghost dark small" onClick={() => setAsking(false)}>Cancel</button>
    </span>
  );
}
