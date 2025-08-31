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
      subject: '🎉 Welcome! Verify Your Email - Event Management Platform',
      htmlBody: `
        <h2>Hello ${userName}! 👋</h2>
        <p>Welcome to the <strong>Event Management Platform</strong>! We're excited to have you on board.</p>
        
        <p>To get started and access all our amazing features, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" class="button" style="font-size: 16px; padding: 15px 30px;">
            ✅ Verify My Email Address
          </a>
        </div>
        
        <div class="info">
          <strong>🔐 Why verify your email?</strong>
          <ul>
            <li>Secure your account and protect your data</li>
            <li>Receive important notifications about your events</li>
            <li>Access all platform features and capabilities</li>
            <li>Reset your password if needed</li>
          </ul>
        </div>
        
        <p><strong>Having trouble?</strong> If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #667eea; background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px;">${verificationUrl}</p>
        
        <div class="warning">
          <strong>⚠️ Security Notice:</strong>
          <ul>
            <li>This verification link will expire in 24 hours</li>
            <li>If you didn't create an account, please ignore this email</li>
            <li>Never share this link with anyone</li>
          </ul>
        </div>
        
        <p><strong>Need help?</strong> Our support team is here to help! Contact us at <a href="mailto:support@eventmanagementplatform.com">support@eventmanagementplatform.com</a></p>
        
        <p>Best regards,<br>
        <strong>The Event Management Platform Team</strong> 🚀</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          This email was sent to verify your account. If you have any questions, please contact our support team.
        </p>
        
        <p>Best regards,<br>The Event Management Platform Team</p>
      `,
      textBody: `
Hello ${userName}! 👋

Welcome to the Event Management Platform! We're excited to have you on board.

To get started and access all our amazing features, please verify your email address by clicking this link:

${verificationUrl}

🔐 Why verify your email?
- Secure your account and protect your data
- Receive important notifications about your events
- Access all platform features and capabilities
- Reset your password if needed

⚠️ Security Notice:
- This verification link will expire in 24 hours
- If you didn't create an account, please ignore this email
- Never share this link with anyone

Need help? Our support team is here to help! Contact us at support@eventmanagementplatform.com

Best regards,
The Event Management Platform Team 🚀

        ---
This email was sent to verify your account. If you have any questions, please contact our support team.
      `
    },
    'fr-CA': {
      subject: '🎉 Bienvenue ! Vérifiez votre email - Plateforme de gestion d\'événements',
      htmlBody: `
        <h2>Bonjour ${userName} ! 👋</h2>
        <p>Bienvenue sur la <strong>Plateforme de gestion d'événements</strong> ! Nous sommes ravis de vous accueillir.</p>
        
        <p>Pour commencer et accéder à toutes nos fonctionnalités, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" class="button" style="font-size: 16px; padding: 15px 30px;">
            ✅ Vérifier mon adresse email
          </a>
        </div>
        
        <div class="info">
          <strong>🔐 Pourquoi vérifier votre email ?</strong>
          <ul>
            <li>Sécuriser votre compte et protéger vos données</li>
            <li>Recevoir des notifications importantes sur vos événements</li>
            <li>Accéder à toutes les fonctionnalités de la plateforme</li>
            <li>Réinitialiser votre mot de passe si nécessaire</li>
          </ul>
        </div>
        
        <p><strong>Des problèmes ?</strong> Si le bouton ci-dessus ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; color: #667eea; background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px;">${verificationUrl}</p>
        
        <div class="warning">
          <strong>⚠️ Avis de sécurité :</strong>
          <ul>
            <li>Ce lien de vérification expirera dans 24 heures</li>
            <li>Si vous n'avez pas créé de compte, veuillez ignorer cet email</li>
            <li>Ne partagez jamais ce lien avec qui que ce soit</li>
          </ul>
        </div>
        
        <p><strong>Besoin d'aide ?</strong> Notre équipe de support est là pour vous aider ! Contactez-nous à <a href="mailto:support@eventmanagementplatform.com">support@eventmanagementplatform.com</a></p>
        
        <p>Cordialement,<br>
        <strong>L'équipe de la Plateforme de gestion d'événements</strong> 🚀</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Cet email a été envoyé pour vérifier votre compte. Si vous avez des questions, veuillez contacter notre équipe de support.
        </p>
      `,
      textBody: `
Bonjour ${userName} ! 👋

Bienvenue sur la Plateforme de gestion d'événements ! Nous sommes ravis de vous accueillir.

Pour commencer et accéder à toutes nos fonctionnalités, veuillez vérifier votre adresse email en cliquant sur ce lien :

${verificationUrl}

🔐 Pourquoi vérifier votre email ?
- Sécuriser votre compte et protéger vos données
- Recevoir des notifications importantes sur vos événements
- Accéder à toutes les fonctionnalités de la plateforme
- Réinitialiser votre mot de passe si nécessaire

⚠️ Avis de sécurité :
- Ce lien de vérification expirera dans 24 heures
- Si vous n'avez pas créé de compte, veuillez ignorer cet email
- Ne partagez jamais ce lien avec qui que ce soit

Besoin d'aide ? Notre équipe de support est là pour vous aider ! Contactez-nous à support@eventmanagementplatform.com

Cordialement,
L'équipe de la Plateforme de gestion d'événements 🚀

---
Cet email a été envoyé pour vérifier votre compte. Si vous avez des questions, veuillez contacter notre équipe de support.
      `
    },
    'es-US': {
      subject: '🎉 ¡Bienvenido! Verifica tu email - Plataforma de gestión de eventos',
      htmlBody: `
        <h2>¡Hola ${userName}! 👋</h2>
        <p>¡Bienvenido a la <strong>Plataforma de gestión de eventos</strong>! Nos emociona tenerte con nosotros.</p>
        
        <p>Para comenzar y acceder a todas nuestras increíbles funciones, por favor verifica tu dirección de email haciendo clic en el botón de abajo:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" class="button" style="font-size: 16px; padding: 15px 30px;">
            ✅ Verificar mi dirección de email
          </a>
        </div>
        
        <div class="info">
          <strong>🔐 ¿Por qué verificar tu email?</strong>
          <ul>
            <li>Segurar tu cuenta y proteger tus datos</li>
            <li>Recibir notificaciones importantes sobre tus eventos</li>
            <li>Acceder a todas las funciones de la plataforma</li>
            <li>Restablecer tu contraseña si es necesario</li>
          </ul>
        </div>
        
        <p><strong>¿Tienes problemas?</strong> Si el botón de arriba no funciona, copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #667eea; background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px;">${verificationUrl}</p>
        
        <div class="warning">
          <strong>⚠️ Aviso de seguridad:</strong>
          <ul>
            <li>Este enlace de verificación expirará en 24 horas</li>
            <li>Si no creaste una cuenta, por favor ignora este correo</li>
            <li>Nunca compartas este enlace con nadie</li>
          </ul>
        </div>
        
        <p><strong>¿Necesitas ayuda?</strong> ¡Nuestro equipo de soporte está aquí para ayudarte! Contáctanos en <a href="mailto:support@eventmanagementplatform.com">support@eventmanagementplatform.com</a></p>
        
        <p>Saludos cordiales,<br>
        <strong>El equipo de la Plataforma de gestión de eventos</strong> 🚀</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Este correo fue enviado para verificar tu cuenta. Si tienes alguna pregunta, por favor contacta a nuestro equipo de soporte.
        </p>
      `,
      textBody: `
¡Hola ${userName}! 👋

¡Bienvenido a la Plataforma de gestión de eventos! Nos emociona tenerte con nosotros.

Para comenzar y acceder a todas nuestras increíbles funciones, por favor verifica tu dirección de email haciendo clic en este enlace:

${verificationUrl}

🔐 ¿Por qué verificar tu email?
- Segurar tu cuenta y proteger tus datos
- Recibir notificaciones importantes sobre tus eventos
- Acceder a todas las funciones de la plataforma
- Restablecer tu contraseña si es necesario

⚠️ Aviso de seguridad:
- Este enlace de verificación expirará en 24 horas
- Si no creaste una cuenta, por favor ignora este correo
- Nunca compartas este enlace con nadie

¿Necesitas ayuda? ¡Nuestro equipo de soporte está aquí para ayudarte! Contáctanos en support@eventmanagementplatform.com

Saludos cordiales,
El equipo de la Plataforma de gestión de eventos 🚀

---
Este correo fue enviado para verificar tu cuenta. Si tienes alguna pregunta, por favor contacta a nuestro equipo de soporte.
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
