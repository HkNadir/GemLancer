import { Resend } from 'resend'
import { emailConfig } from '@/lib/config'

let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(emailConfig.apiKey)
  }
  return _resend
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ error?: string }> {
  try {
    const resend = getResend()
    const { error } = await resend.emails.send({
      from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo,
    })
    if (error) return { error: error.message }
    return {}
  } catch (err: any) {
    return { error: err.message }
  }
}
