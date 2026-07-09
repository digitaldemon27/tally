import { resend, FROM_EMAIL } from '../config/mail.config.js';
import { getOnboardingTemplate } from '../templates/onboarding.template.js';
import { getResetPasswordTemplate } from '../templates/resetPassword.template.js';
import { getVerificationTemplate } from '../templates/verification.template.js';

/**
 * Low-level generic send email utility.
 * Handles communication with the Resend client.
 * 
 * @param {Object} options - Sending options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - Email HTML body
 * @param {string} [options.text] - Plain text fallback body
 * @returns {Promise<Object>} - Resend API response
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!resend) {
    const errorMsg = '❌ Cannot send email: Resend client is not configured (missing API key).';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      ...(text && { text }),
    });

    if (data.error) {
      console.error(`❌ Resend API returned error sending to ${to}:`, data.error);
      throw data.error;
    }

    console.log(`✅ Email sent successfully to ${to}. Message ID: ${data.data?.id}`);
    return data.data;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
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
