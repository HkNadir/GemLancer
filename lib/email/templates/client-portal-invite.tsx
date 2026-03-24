interface ClientPortalInviteProps {
  clientName: string
  senderName: string
  magicLinkUrl: string
  accentColor?: string
  logoUrl?: string | null
}

export function renderClientPortalInviteEmail({
  clientName,
  senderName,
  magicLinkUrl,
  accentColor = '#6366f1',
}: ClientPortalInviteProps): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr><td style="height:6px;background:${accentColor}"></td></tr>
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a">You've been invited to the client portal</h1>
          <p style="margin:0 0 24px;color:#64748b;font-size:15px">Hi ${clientName},</p>
          <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6">
            ${senderName} has invited you to access your client portal where you can view your projects,
            invoices, shared files, and send messages — all in one place.
          </p>
          <p style="margin:0 0 8px;color:#334155;font-size:14px">Your magic link (valid for 30 days):</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px">
            <tr><td align="center">
              <a href="${magicLinkUrl}" style="display:inline-block;background:${accentColor};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
                Access Your Portal
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 16px;color:#94a3b8;font-size:13px">
            Or copy this link into your browser:<br>
            <a href="${magicLinkUrl}" style="color:${accentColor};word-break:break-all">${magicLinkUrl}</a>
          </p>

          <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center">
            If you didn't expect this email, you can safely ignore it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
