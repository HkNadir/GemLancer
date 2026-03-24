interface ProjectCompletedProps {
  clientName: string
  projectName: string
  senderName: string
  portalUrl: string
  accentColor?: string
}

export function renderProjectCompletedEmail({
  clientName,
  projectName,
  senderName,
  portalUrl,
  accentColor = '#6366f1',
}: ProjectCompletedProps): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr><td style="height:6px;background:${accentColor}"></td></tr>
        <tr><td style="padding:40px;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">🎉</div>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a">Project Completed!</h1>
          <p style="margin:0 0 24px;color:#64748b;font-size:15px">Hi ${clientName},</p>
          <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6">
            The project <strong>${projectName}</strong> has been marked as complete.
            Thank you for the collaboration!
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px">
            <tr><td align="center">
              <a href="${portalUrl}" style="display:inline-block;background:${accentColor};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
                View Project
              </a>
            </td></tr>
          </table>
          <p style="margin:0;color:#94a3b8;font-size:13px">${senderName} via GemLancer</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
