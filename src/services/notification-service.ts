import { mailer } from '../lib/mailer.js';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

export function buildPasswordResetUrl(token: string) {
  return `${env.FRONTEND_URL}/#/auth/reset-password?token=${encodeURIComponent(token)}`;
}

export const notificationService = {
  async sendBookingEmail(data: {
    to?: string | null;
    clientName: string;
    barbershopName: string;
    barberName: string;
    day: string;
    startTime: string;
    services: string[];
    event: 'CREATED' | 'RESCHEDULED' | 'CANCELLED' | 'REMINDER';
  }) {
    if (!data.to) return;

    const subjects = {
      CREATED: 'Agendamento confirmado',
      RESCHEDULED: 'Agendamento reagendado',
      CANCELLED: 'Agendamento cancelado',
      REMINDER: 'Lembrete do seu agendamento',
    };

    await mailer.sendMail({
      from: env.SMTP_FROM,
      to: data.to,
      subject: subjects[data.event],
      html: `
        <h2>${subjects[data.event]}</h2>
        <p>Ola, ${data.clientName}.</p>
        <p><strong>Barbearia:</strong> ${data.barbershopName}</p>
        <p><strong>Profissional:</strong> ${data.barberName}</p>
        <p><strong>Data e horario:</strong> ${data.day} as ${data.startTime}</p>
        <p><strong>Servicos:</strong> ${data.services.join(', ')}</p>
      `,
    });
  },

  async sendPasswordResetEmail(data: {
    to: string;
    name: string;
    token: string;
  }) {
    const resetUrl = buildPasswordResetUrl(data.token);
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

      return { previewUrl: undefined };
    } catch (err) {
      // In development, fall back to an Ethereal test account so developer can view the email
      if (env.NODE_ENV !== 'production') {
        try {
          const testAccount = await nodemailer.createTestAccount();
          const testTransport = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });

          const info = await testTransport.sendMail({
            from: env.SMTP_FROM,
            to: data.to,
            subject: 'Recuperacao de senha (TEST)',
            html: `
              <p>Ola, ${data.name}</p>
              <p>Clique no link abaixo para redefinir sua senha:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
            `,
          });

          const previewUrl = nodemailer.getTestMessageUrl(info) ?? undefined;
          return { previewUrl };
        } catch (testErr) {
          // If even the test send fails, return an explicit application error
          throw new AppError('Falha ao enviar email de recuperacao', 400);
        }
      }

      throw new AppError('Falha ao enviar email de recuperacao', 400);
    }
  },

  async sendBarberInviteEmail(data: {
    to: string;
    name: string;
    barbershopName: string;
    inviteToken: string;
  }) {
    const inviteUrl = `${env.FRONTEND_URL}/#/auth/barber-invite?token=${encodeURIComponent(data.inviteToken)}`;

    try {
      await mailer.sendMail({
        from: env.SMTP_FROM,
        to: data.to,
        subject: 'Convite - Cadastro como Barbeiro',
        html: `
          <h2>Bem-vindo, ${data.name}!</h2>
          <p>Voce foi convidado para trabalhar na barbearia <strong>${data.barbershopName}</strong>.</p>
          <p>Clique no link abaixo para criar sua senha e finalizar seu perfil:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
          <p>Esse convite e pessoal e ja esta vinculado a barbearia correta.</p>
        `,
      });
    } catch {
      throw new AppError('Falha ao enviar email de convite para barbeiro', 400);
    }
  },

  async sendAdminInviteEmail(data: {
    to: string;
    name: string;
    email: string;
    password: string;
    role: string;
  }) {
    const roleLabel = data.role === 'SUPER_ADMIN' ? 'Super Administrador' : 'Administrador da Barbearia';

    try {
      await mailer.sendMail({
        from: env.SMTP_FROM,
        to: data.to,
        subject: `Convite - Cadastro como ${roleLabel}`,
        html: `
          <h2>Bem-vindo, ${data.name}!</h2>
          <p>Você foi convidado a se registrar como <strong>${roleLabel}</strong> no sistema.</p>
          <p><strong>Suas credenciais temporárias:</strong></p>
          <ul>
            <li>Email: ${data.email}</li>
            <li>Senha: ${data.password}</li>
          </ul>
          <p>Acesse o sistema e altere sua senha assim que possível.</p>
          <p><strong>URL do Sistema:</strong> ${env.APP_URL}</p>
        `,
      });
    } catch {
      throw new AppError('Falha ao enviar email de convite para administrador', 400);
    }
  },
};
