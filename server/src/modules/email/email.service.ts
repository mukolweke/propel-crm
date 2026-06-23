import nodemailer from 'nodemailer'
import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
})

export const emailService = {
  async sendPasswordResetCode(to: string, fullName: string, code: string): Promise<void> {
    const subject = 'Your Propel CRM password reset code'
    const text = [
      `Hi ${fullName},`,
      '',
      `Your password reset code is: ${code}`,
      '',
      `This code expires in ${env.PASSWORD_RESET_CODE_TTL_MINUTES} minutes.`,
      'If you did not request a password reset, you can ignore this email.',
    ].join('\n')

    const html = `
      <p>Hi ${fullName},</p>
      <p>Your password reset code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
      <p>This code expires in ${env.PASSWORD_RESET_CODE_TTL_MINUTES} minutes.</p>
      <p>If you did not request a password reset, you can ignore this email.</p>
    `

    await transport.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    })

    logger.info('Password reset email sent', { to })
  },
}
