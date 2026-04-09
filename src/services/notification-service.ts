import { mailer } from '../lib/mailer.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

export const notificationService = {
  async sendPasswordResetEmail(data: {
    to: string;
    name: string;
    token: string;
  }) {
    const resetUrl = `${env.APP_URL}/reset-password?token=${data.token}`;

    try {
      await mailer.sendMail({
        from: env.SMTP_FROM,
        to: data.to,
        subject: 'Recuperacao de senha',
        html: `
          <p>Ola, ${data.name}</p>
          <p>Clique no link abaixo para redefinir sua senha:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
        `,
      });
    } catch {
      throw new AppError('Falha ao enviar email de recuperacao', 400);
    }
  },
};
