interface InvoicePaidProps {
  tenantName: string
  invoiceNumber: string
  invoiceTotal: string
  clientName: string
  paidDate: string
  accentColor?: string
}

export function renderInvoicePaidEmail({
  tenantName,
  invoiceNumber,
  invoiceTotal,
  clientName,
  paidDate,
  accentColor = '#6366f1',
}: InvoicePaidProps): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr><td style="height:6px;background:#16a34a"></td></tr>
        <tr><td style="padding:40px">
          <div style="text-align:center;margin-bottom:32px">
            <div style="display:inline-flex;width:56px;height:56px;background:#dcfce7;border-radius:50%;align-items:center;justify-content:center;font-size:28px">✓</div>
          </div>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center">Payment Received</h1>
          <p style="margin:0 0 32px;color:#64748b;font-size:15px;text-align:center">
            ${clientName} has paid invoice ${invoiceNumber}
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:20px;margin:0 0 32px">
            <tr>
              <td style="font-size:13px;color:#64748b;padding-bottom:8px">Invoice</td>
              <td align="right" style="font-size:14px;font-weight:600;color:#0f172a;padding-bottom:8px">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#64748b;padding-bottom:8px">Amount Paid</td>
              <td align="right" style="font-size:20px;font-weight:800;color:#16a34a;padding-bottom:8px">${invoiceTotal}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#64748b">Paid On</td>
              <td align="right" style="font-size:14px;font-weight:600;color:#0f172a">${paidDate}</td>
            </tr>
          </table>

          <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center">
            ${tenantName} via GemLancer
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
