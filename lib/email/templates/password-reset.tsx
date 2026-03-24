interface PasswordResetProps {
  userName: string
  resetUrl: string
  accentColor?: string
}

export function renderPasswordResetEmail({
  userName,
  resetUrl,
  accentColor = '#6366f1',
}: PasswordResetProps): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr><td style="height:6px;background:${accentColor}"></td></tr>
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a">Reset your password</h1>
          <p style="margin:0 0 24px;color:#64748b;font-size:15px">Hi ${userName},</p>
          <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6">
            We received a request to reset your GemLancer password. Click below to choose a new one.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
            <tr><td align="center">
              <a href="${resetUrl}" style="display:inline-block;background:${accentColor};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
                Reset Password
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#94a3b8;font-size:13px">
            This link expires in 1 hour.
          </p>
          <p style="margin:0;color:#94a3b8;font-size:13px">
            If you didn't request this, you can safely ignore this email. Your password won't change.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
