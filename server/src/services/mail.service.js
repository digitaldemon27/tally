import brevoClient from '../../config/brevo.js';
import { SENDER } from '../config/mail.config.js';
import { getOnboardingTemplate } from '../templates/onboarding.template.js';
import { getResetPasswordTemplate } from '../templates/resetPassword.template.js';
import { getVerificationTemplate } from '../templates/verification.template.js';

/**
 * Low-level generic send email utility.
 * Handles communication with the Brevo TransactionalEmails client.
 * 
 * @param {Object} options - Sending options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - Email HTML body
 * @param {string} [options.text] - Plain text fallback body
 * @returns {Promise<Object>} - Brevo API response
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.BREVO_API_KEY) {
    const errorMsg = '❌ Cannot send email: Brevo client is not configured (missing BREVO_API_KEY).';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const recipients = Array.isArray(to) ? to.map(e => ({ email: e })) : [{ email: to }];

  try {
    const data = await brevoClient.transactionalEmails.sendTransacEmail({
      sender: SENDER,
      to: recipients,
      subject,
      htmlContent: html,
      ...(text && { textContent: text }),
    });

    console.log(`✅ Email sent successfully via Brevo to ${to}. Message ID: ${data.messageId}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to send email via Brevo to ${to}:`, error.body || error.message || error);
    throw error;
  }
}

/**
 * Sends a welcome onboarding email to a new user.
 * 
 * @param {string} to - Recipient email
 * @param {Object} variables - Template variables
 * @param {string} variables.name - User's name
 * @param {string} variables.dashboardUrl - Landing page or dashboard URL
 */
export async function sendOnboardingEmail(to, { name, dashboardUrl }) {
  const subject = 'Welcome to Tally! 📊';
  const html = getOnboardingTemplate({ name, dashboardUrl });
  
  return sendEmail({
    to,
    subject,
    html,
    text: `Welcome to Tally, ${name || 'there'}! Relaunch your habits at: ${dashboardUrl}`,
  });
}

/**
 * Sends a password reset email to a user.
 * 
 * @param {string} to - Recipient email
 * @param {Object} variables - Template variables
 * @param {string} variables.name - User's name
 * @param {string} variables.resetUrl - Link to trigger password reset
 */
export async function sendResetPasswordEmail(to, { name, resetUrl }) {
  const subject = 'Reset your Tally Password 🔒';
  const html = getResetPasswordTemplate({ name, resetUrl });

  return sendEmail({
    to,
    subject,
    html,
    text: `Hi ${name || 'there'},\n\nUse this link to reset your password: ${resetUrl}\n\nThis link will expire in 60 minutes.`,
  });
}


/**
 * Sends a registration email verification link.
 * 
 * @param {string} to - Recipient email
 * @param {Object} variables - Template variables
 * @param {string} variables.username - User's username
 * @param {string} variables.verificationUrl - Verification link
 */
export async function sendVerificationEmail(to, { username, verificationUrl }) {
  const subject = 'Verify Your Email Address ✉️';
  const html = getVerificationTemplate({ username, verificationUrl });

  return sendEmail({
    to,
    subject,
    html,
    text: `Hi @${username || 'there'},\n\nPlease use this link to complete your Tally registration: ${verificationUrl}\n\nThis link will expire in 15 minutes.`,
  });
}
