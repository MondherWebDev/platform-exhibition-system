/**
 * Email Service for Event Platform
 * Handles sending welcome emails with credentials to newly created accounts
 */

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
}

export interface UserCredentials {
  email: string;
  password: string;
  category: string;
  name: string;
  userId: string;
  company?: string;
  position?: string;
}

export type AccountCategory = 'Exhibitor' | 'Sponsor' | 'Speaker' | 'Hosted Buyer' | 'Visitor' | 'Organizer' | 'Agent' | 'Media' | 'VIP';

export interface CategoryColors {
  [key: string]: string;
}

/**
 * Send welcome email with credentials using EmailJS
 */
export const sendWelcomeEmail = async (credentials: UserCredentials): Promise<boolean> => {
  try {
    console.log('📧 Sending welcome email to:', credentials.email);

    const emailData: EmailData = {
      to: credentials.email,
      subject: `Welcome to EventPlatform - Your ${credentials.category} Account is Ready!`,
      html: generateWelcomeEmailHTML(credentials),
      text: generateWelcomeEmailText(credentials)
    };

    // Using EmailJS service
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error(`Email service error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Welcome email sent successfully:', result);
    return true;

  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return false;
  }
};

/**
 * Generate HTML email template
 */
const generateWelcomeEmailHTML = (credentials: UserCredentials): string => {
  const categoryColors = {
    'Exhibitor': '#0d6efd',
    'Sponsor': '#fd7e14',
    'Speaker': '#198754',
    'Hosted Buyer': '#dc3545'
  };

  const color = categoryColors[credentials.category as keyof typeof categoryColors] || '#0d6efd';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to EventPlatform</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${color}, ${color}dd); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .credentials { background: white; border: 2px solid ${color}; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .credential-item { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .credential-label { font-weight: bold; color: ${color}; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
        .button { display: inline-block; background: ${color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Welcome to EventPlatform!</h1>
        <p>Your ${credentials.category} account has been created successfully</p>
      </div>

      <div class="content">
        <h2>Hello ${credentials.name}!</h2>

        <p>Congratulations! Your ${credentials.category} account for EventPlatform has been created and is ready to use.</p>

        <div class="credentials">
          <h3 style="margin-top: 0; color: ${color};">🔐 Your Login Credentials</h3>

          <div class="credential-item">
            <span class="credential-label">Name:</span> ${credentials.name}
          </div>

          <div class="credential-item">
            <span class="credential-label">Email:</span> ${credentials.email}
          </div>

          <div class="credential-item">
            <span class="credential-label">Password:</span> ${credentials.password}
          </div>

          <div class="credential-item">
            <span class="credential-label">User ID:</span> ${credentials.userId}
          </div>

          <div class="credential-item">
            <span class="credential-label">Account Type:</span> ${credentials.category}
          </div>
        </div>

        <div class="warning">
          <strong>⚠️ Important:</strong> Please save these credentials in a secure location. For security reasons, we cannot resend or recover passwords. If you lose your password, you'll need to contact the event organizer to reset it.
        </div>

        <div style="text-align: center;">
          <a href="http://localhost:3002" class="button">Login to Your Account</a>
        </div>

        <h3>🎫 What's Next?</h3>
        <ul>
          <li>Log in to your account using the credentials above</li>
          <li>Complete your profile information</li>
          <li>Upload your company logo or photo</li>
          <li>Connect with other event participants</li>
          <li>Access your personalized dashboard</li>
        </ul>

        <h3>📱 Features Available:</h3>
        <ul>
          <li>Professional profile management</li>
          <li>QR code badge generation</li>
          <li>Lead generation and management (for exhibitors)</li>
          <li>Event networking and matchmaking</li>
          <li>Real-time event updates</li>
        </ul>

        <p>If you have any questions or need assistance, please don't hesitate to contact the event organizers.</p>

        <p>Welcome aboard! We're excited to have you as part of our event community.</p>

        <p>Best regards,<br>The EventPlatform Team</p>
      </div>

      <div class="footer">
        <p>This email was sent to ${credentials.email}</p>
        <p>© 2025 EventPlatform. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate plain text email template
 */
const generateWelcomeEmailText = (credentials: UserCredentials): string => {
  return `
Welcome to EventPlatform!

Hello ${credentials.name},

Congratulations! Your ${credentials.category} account for EventPlatform has been created and is ready to use.

YOUR LOGIN CREDENTIALS:
======================
Name: ${credentials.name}
Email: ${credentials.email}
Password: ${credentials.password}
User ID: ${credentials.userId}
Account Type: ${credentials.category}

IMPORTANT: Please save these credentials in a secure location. For security reasons, we cannot resend or recover passwords.

LOGIN HERE: http://localhost:3002

WHAT'S NEXT?
============
1. Log in to your account using the credentials above
2. Complete your profile information
3. Upload your company logo or photo
4. Connect with other event participants
5. Access your personalized dashboard

FEATURES AVAILABLE:
==================
- Professional profile management
- QR code badge generation
- Lead generation and management (for exhibitors)
- Event networking and matchmaking
- Real-time event updates

If you have any questions or need assistance, please contact the event organizers.

Welcome aboard! We're excited to have you as part of our event community.

Best regards,
The EventPlatform Team

---
This email was sent to ${credentials.email}
© 2025 EventPlatform. All rights reserved.
  `;
};

/**
 * Send notification email for account creation (for organizers)
 */
export const sendAccountCreatedNotification = async (
  organizerEmail: string,
  accountDetails: UserCredentials
): Promise<boolean> => {
  try {
    const emailData: EmailData = {
      to: organizerEmail,
      subject: `EventPlatform - New ${accountDetails.category} Account Created`,
      html: generateOrganizerNotificationHTML(accountDetails),
      text: generateOrganizerNotificationText(accountDetails)
    };

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error(`Email service error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Organizer notification sent successfully:', result);
    return true;

  } catch (error) {
    console.error('❌ Error sending organizer notification:', error);
    return false;
  }
};

const generateOrganizerNotificationHTML = (credentials: UserCredentials): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Created Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
        .credentials { background: white; border: 2px solid #28a745; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✅ Account Created Successfully</h1>
      </div>

      <div class="content">
        <div class="success">
          <strong>Success!</strong> A new ${credentials.category} account has been created and the welcome email has been sent to the user.
        </div>

        <h3>Account Details:</h3>
        <div class="credentials">
          <p><strong>Name:</strong> ${credentials.name}</p>
          <p><strong>Email:</strong> ${credentials.email}</p>
          <p><strong>Category:</strong> ${credentials.category}</p>
          <p><strong>User ID:</strong> ${credentials.userId}</p>
          <p><strong>Created:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <p>The user has received a welcome email with their login credentials and instructions on how to access their account.</p>

        <p>Best regards,<br>EventPlatform System</p>
      </div>
    </body>
    </html>
  `;
};

const generateOrganizerNotificationText = (credentials: UserCredentials): string => {
  return `
Account Created Successfully

A new ${credentials.category} account has been created successfully.

ACCOUNT DETAILS:
================
Name: ${credentials.name}
Email: ${credentials.email}
Category: ${credentials.category}
User ID: ${credentials.userId}
Created: ${new Date().toLocaleString()}

The user has received a welcome email with their login credentials and instructions on how to access their account.

Best regards,
EventPlatform System
  `;
};
