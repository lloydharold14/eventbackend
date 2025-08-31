const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: 'ca-central-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES({ region: 'ca-central-1' });

async function findUserByEmail(email) {
  const params = {
    TableName: 'UserManagement-dev-dev-users',
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'GSI1PK = :email',
    ExpressionAttributeValues: {
      ':email': `EMAIL#${email.toLowerCase()}`
    }
  };

  try {
    const result = await dynamodb.query(params).promise();
    if (result.Items && result.Items.length > 0) {
      return result.Items[0];
    }
    return null;
  } catch (error) {
    console.error('Error finding user:', error);
    throw error;
  }
}

async function resendVerificationEmail(userId, email, firstName, lastName) {
  // Generate a simple verification token
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  const verificationUrl = `https://eventmanagementplatform.com/verify-email?token=${verificationToken}&userId=${userId}`;
  
  const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Event Management Platform</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0; color: #856404; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome! Verify Your Email</h1>
            </div>
            <div class="content">
                <h2>Hello ${firstName} ${lastName}! 👋</h2>
                <p>Welcome to the <strong>Event Management Platform</strong>! We're excited to have you on board.</p>
                
                <p>To get started and access all our amazing features, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" class="button">
                        ✅ Verify My Email Address
                    </a>
                </div>
                
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 15px; margin: 20px 0; color: #0c5460;">
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
            </div>
        </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${firstName} ${lastName}! 👋

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
  `;

  const params = {
    Source: 'noreply@eventmanagementplatform.com',
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Subject: {
        Data: '🎉 Welcome! Verify Your Email - Event Management Platform',
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: emailContent,
          Charset: 'UTF-8'
        },
        Text: {
          Data: textContent,
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log('✅ Verification email sent successfully!');
    console.log('📧 Email sent to:', email);
    console.log('🆔 User ID:', userId);
    console.log('🔗 Verification URL:', verificationUrl);
    console.log('📨 SES Message ID:', result.MessageId);
    return result;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    throw error;
  }
}

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: node resend-verification.js <email>');
    console.log('Example: node resend-verification.js tkhtechinc@gmail.com');
    process.exit(1);
  }

  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    const user = await findUserByEmail(email);
    
    if (!user) {
      console.log('❌ User not found with that email address');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.firstName, user.lastName);
    console.log('   Email:', user.email);
    console.log('   Status:', user.status);
    console.log('   Email Verified:', user.emailVerified);

    if (user.emailVerified) {
      console.log('⚠️  User email is already verified!');
      process.exit(1);
    }

    console.log('\n📧 Sending verification email...');
    await resendVerificationEmail(user.id, user.email, user.firstName, user.lastName);
    
    console.log('\n🎉 Success! The user should now receive the verification email.');
    console.log('📱 They can click the verification link to activate their account.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
