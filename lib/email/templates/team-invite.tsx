interface TeamInviteProps {
  inviteeName: string
  inviterName: string
  workspaceName: string
  inviteUrl: string
  role: string
  accentColor?: string
}

export function renderTeamInviteEmail({
  inviteeName,
  inviterName,
  workspaceName,
  inviteUrl,
  role,
  accentColor = '#6366f1',
}: TeamInviteProps): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr><td style="height:6px;background:${accentColor}"></td></tr>
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a">
            You've been invited to join ${workspaceName}
          </h1>
          <p style="margin:0 0 24px;color:#64748b;font-size:15px">Hi ${inviteeName},</p>
          <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6">
            ${inviterName} has invited you to join <strong>${workspaceName}</strong> on GemLancer as a
            <strong>${role}</strong>. Click below to accept the invitation and set up your account.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px">
            <tr><td align="center">
              <a href="${inviteUrl}" style="display:inline-block;background:${accentColor};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
                Accept Invitation
              </a>
            </td></tr>
          </table>

          <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center">
            This invitation expires in 7 days. If you didn't expect this, ignore it safely.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
