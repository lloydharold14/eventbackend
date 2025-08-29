// Email Templates for Event Management Platform
// Supports multiple languages and branding

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface EmailTemplateData {
  [key: string]: string | number | boolean;
}

// Base template with common styling
const getBaseTemplate = (content: string, locale: string = 'en-US'): string => {
  const isRTL = ['ar', 'he', 'fa'].includes(locale.split('-')[0]);
  const direction = isRTL ? 'rtl' : 'ltr';
  
  return `
<!DOCTYPE html>
<html lang="${locale}" dir="${direction}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Management Platform</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .info {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #0c5460;
        }
        @media only screen and (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 4px;
            }
            .content {
                padding: 20px 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Event Management Platform</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© 2024 Event Management Platform. All rights reserved.</p>
            <p>This email was sent to you because you have an account with us.</p>
        </div>
    </div>
</body>
</html>`;
};

// Password Reset Email Template
export const getPasswordResetTemplate = (
  resetUrl: string,
  userName: string,
  locale: string = 'en-US'
): EmailTemplate => {
  const templates = {
    'en-US': {
      subject: 'Password Reset Request - Event Management Platform',
      htmlBody: `
        <h2>Hello ${userName},</h2>
        <p>We received a request to reset your password for your Event Management Platform account.</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="button">Reset Your Password</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
        
        <div class="warning">
          <strong>Security Notice:</strong>
          <ul>
            <li>This link will expire in 1 hour</li>
            <li>If you didn't request this password reset, please ignore this email</li>
            <li>Never share this link with anyone</li>
          </ul>
        </div>
        
        <p>If you have any questions, please contact our support team.</p>
        
        <p>Best regards,<br>The Event Management Platform Team</p>
      `,
      textBody: `
Hello ${userName},

We received a request to reset your password for your Event Management Platform account.

Reset your password by clicking this link: ${resetUrl}

Security Notice:
- This link will expire in 1 hour
- If you didn't request this password reset, please ignore this email
- Never share this link with anyone

If you have any questions, please contact our support team.

Best regards,
The Event Management Platform Team
      `
    },
    'fr-CA': {
      subject: 'Demande de réinitialisation de mot de passe - Plateforme de gestion d\'événements',
      htmlBody: `
        <h2>Bonjour ${userName},</h2>
        <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Plateforme de gestion d'événements.</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="button">Réinitialiser votre mot de passe</a>
        </div>
        
        <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
        
        <div class="warning">
          <strong>Avis de sécurité :</strong>
          <ul>
            <li>Ce lien expirera dans 1 heure</li>
            <li>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail</li>
            <li>Ne partagez jamais ce lien avec qui que ce soit</li>
          </ul>
        </div>
        
        <p>Si vous avez des questions, veuillez contacter notre équipe de support.</p>
        
        <p>Cordialement,<br>L'équipe de la Plateforme de gestion d'événements</p>
      `,
      textBody: `
Bonjour ${userName},

Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Plateforme de gestion d'événements.

Réinitialisez votre mot de passe en cliquant sur ce lien : ${resetUrl}

Avis de sécurité :
- Ce lien expirera dans 1 heure
- Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail
- Ne partagez jamais ce lien avec qui que ce soit

Si vous avez des questions, veuillez contacter notre équipe de support.

Cordialement,
L'équipe de la Plateforme de gestion d'événements
      `
    },
    'es-US': {
      subject: 'Solicitud de restablecimiento de contraseña - Plataforma de gestión de eventos',
      htmlBody: `
        <h2>Hola ${userName},</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en la Plataforma de gestión de eventos.</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="button">Restablecer tu contraseña</a>
        </div>
        
        <p>Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
        
        <div class="warning">
          <strong>Aviso de seguridad:</strong>
          <ul>
            <li>Este enlace expirará en 1 hora</li>
            <li>Si no solicitaste este restablecimiento, por favor ignora este correo</li>
            <li>Nunca compartas este enlace con nadie</li>
          </ul>
        </div>
        
        <p>Si tienes alguna pregunta, por favor contacta a nuestro equipo de soporte.</p>
        
        <p>Saludos cordiales,<br>El equipo de la Plataforma de gestión de eventos</p>
      `,
      textBody: `
Hola ${userName},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en la Plataforma de gestión de eventos.

Restablece tu contraseña haciendo clic en este enlace: ${resetUrl}

Aviso de seguridad:
- Este enlace expirará en 1 hora
- Si no solicitaste este restablecimiento, por favor ignora este correo
- Nunca compartas este enlace con nadie

Si tienes alguna pregunta, por favor contacta a nuestro equipo de soporte.

Saludos cordiales,
El equipo de la Plataforma de gestión de eventos
      `
    }
  };

  const template = templates[locale as keyof typeof templates] || templates['en-US'];
  
  return {
    subject: template.subject,
    htmlBody: getBaseTemplate(template.htmlBody, locale),
    textBody: template.textBody
  };
};

// Email Verification Template
export const getEmailVerificationTemplate = (
  verificationUrl: string,
  userName: string,
  locale: string = 'en-US'
): EmailTemplate => {
  const templates = {
    'en-US': {
      subject: 'Verify Your Email - Event Management Platform',
      htmlBody: `
        <h2>Hello ${userName},</h2>
        <p>Welcome to the Event Management Platform! Please verify your email address to complete your registration.</p>
        
        <div style="text-align: center;">
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
        
        <div class="info">
          <strong>What happens next?</strong>
          <ul>
            <li>Click the verification link above</li>
            <li>Your email will be verified</li>
            <li>You can start using all platform features</li>
          </ul>
        </div>
        
        <p>If you didn't create an account, please ignore this email.</p>
        
        <p>Best regards,<br>The Event Management Platform Team</p>
      `,
      textBody: `
Hello ${userName},

Welcome to the Event Management Platform! Please verify your email address to complete your registration.

Verify your email by clicking this link: ${verificationUrl}

What happens next?
- Click the verification link above
- Your email will be verified
- You can start using all platform features

If you didn't create an account, please ignore this email.

Best regards,
The Event Management Platform Team
      `
    }
  };

  const template = templates[locale as keyof typeof templates] || templates['en-US'];
  
  return {
    subject: template.subject,
    htmlBody: getBaseTemplate(template.htmlBody, locale),
    textBody: template.textBody
  };
};

// Booking Confirmation Template
export const getBookingConfirmationTemplate = (
  bookingData: {
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    ticketType: string;
    quantity: number;
    totalAmount: string;
    bookingId: string;
  },
  userName: string,
  locale: string = 'en-US'
): EmailTemplate => {
  const templates = {
    'en-US': {
      subject: `Booking Confirmed - ${bookingData.eventTitle}`,
      htmlBody: `
        <h2>Hello ${userName},</h2>
        <p>Your booking has been confirmed! Here are the details:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>Event Details</h3>
          <p><strong>Event:</strong> ${bookingData.eventTitle}</p>
          <p><strong>Date:</strong> ${bookingData.eventDate}</p>
          <p><strong>Location:</strong> ${bookingData.eventLocation}</p>
          <p><strong>Ticket Type:</strong> ${bookingData.ticketType}</p>
          <p><strong>Quantity:</strong> ${bookingData.quantity}</p>
          <p><strong>Total Amount:</strong> ${bookingData.totalAmount}</p>
          <p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>
        </div>
        
        <div class="info">
          <strong>What's next?</strong>
          <ul>
            <li>You'll receive a QR code for entry</li>
            <li>Save this email for your records</li>
            <li>Contact support if you need to make changes</li>
          </ul>
        </div>
        
        <p>Thank you for choosing our platform!</p>
        
        <p>Best regards,<br>The Event Management Platform Team</p>
      `,
      textBody: `
Hello ${userName},

Your booking has been confirmed! Here are the details:

Event Details:
- Event: ${bookingData.eventTitle}
- Date: ${bookingData.eventDate}
- Location: ${bookingData.eventLocation}
- Ticket Type: ${bookingData.ticketType}
- Quantity: ${bookingData.quantity}
- Total Amount: ${bookingData.totalAmount}
- Booking ID: ${bookingData.bookingId}

What's next?
- You'll receive a QR code for entry
- Save this email for your records
- Contact support if you need to make changes

Thank you for choosing our platform!

Best regards,
The Event Management Platform Team
      `
    }
  };

  const template = templates[locale as keyof typeof templates] || templates['en-US'];
  
  return {
    subject: template.subject,
    htmlBody: getBaseTemplate(template.htmlBody, locale),
    textBody: template.textBody
  };
};

// Template factory function
export const getEmailTemplate = (
  type: string,
  data: EmailTemplateData,
  locale: string = 'en-US'
): EmailTemplate => {
  switch (type) {
    case 'password_reset':
      return getPasswordResetTemplate(
        data.resetUrl as string,
        data.userName as string,
        locale
      );
    case 'email_verification':
      return getEmailVerificationTemplate(
        data.verificationUrl as string,
        data.userName as string,
        locale
      );
    case 'booking_confirmation':
      return getBookingConfirmationTemplate(
        data as any,
        data.userName as string,
        locale
      );
    default:
      throw new Error(`Unknown email template type: ${type}`);
  }
};
