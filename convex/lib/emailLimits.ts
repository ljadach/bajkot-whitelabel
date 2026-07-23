/**
 * Limits enforced on both sides of the admin Mail feature. Pure module —
 * imported by the backend action (convex/admin/email.ts) and the frontend
 * form (src/admin/pages/AdminMail.tsx), so the UI blocks exactly what the
 * backend would reject.
 *
 * Resend caps the whole message at 40MB; Convex action args at 16MB.
 * Base64 inflates ~4/3, so keep the raw payload comfortably below both.
 */

export const MAX_ATTACHMENT_TOTAL_BYTES = 10 * 1024 * 1024;
