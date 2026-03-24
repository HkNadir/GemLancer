interface InvoiceSentProps {
  clientName: string
  invoiceNumber: string
  invoiceTotal: string
  dueDate: string
  viewUrl: string
  paymentUrl?: string
  senderName: string
  accentColor?: string
}

export function renderInvoiceSentEmail({
  clientName,
  invoiceNumber,
  invoiceTotal,
  dueDate,
  viewUrl,
  paymentUrl,
  senderName,
  accentColor = '#6366f1',
}: InvoiceSentProps): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr><td style="height:6px;background:${accentColor}"></td></tr>
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a">New Invoice from ${senderName}</h1>
          <p style="margin:0 0 32px;color:#64748b;font-size:15px">Hi ${clientName},</p>
          <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6">
            A new invoice has been sent to you. Please find the details below.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:20px;margin:0 0 24px">
            <tr>
              <td style="font-size:13px;color:#64748b;padding-bottom:8px">Invoice Number</td>
              <td align="right" style="font-size:14px;font-weight:600;color:#0f172a;padding-bottom:8px">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#64748b;padding-bottom:8px">Amount Due</td>
              <td align="right" style="font-size:20px;font-weight:800;color:${accentColor};padding-bottom:8px">${invoiceTotal}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#64748b">Due Date</td>
              <td align="right" style="font-size:14px;font-weight:600;color:#0f172a">${dueDate}</td>
            </tr>
          </table>

          ${paymentUrl ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
            <tr><td align="center">
              <a href="${paymentUrl}" style="display:inline-block;background:${accentColor};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
                Pay Now
              </a>
            </td></tr>
          </table>
          ` : ''}

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px">
            <tr><td align="center">
              <a href="${viewUrl}" style="display:inline-block;border:1px solid #e2e8f0;color:#475569;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px">
                View Invoice
              </a>
            </td></tr>
          </table>

          <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center">
            Sent by ${senderName} via GemLancer
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
