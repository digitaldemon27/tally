import { getBaseLayout } from './base.layout.js';

/**
 * Generates the reset password email HTML.
 * 
 * @param {Object} data - Template variables
 * @param {string} data.name - Recipient's name
 * @param {string} data.resetUrl - Password reset action link
 * @returns {string} - Complete HTML string
 */
export function getResetPasswordTemplate({ name, resetUrl }) {
  const displayName = name ? name : 'there';
  const htmlContent = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; line-height: 1.25; color: #0f172a; letter-spacing: -0.5px;">
      Reset your password
    </h1>
    
    <p class="content-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #334155;">
      Hi ${displayName},
    </p>

    <p class="content-text" style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #334155;">
      We received a request to reset the password for your Tally account. Click the button below to choose a new one.
    </p>

    <!-- Call to Action -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 24px auto;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: #0f172a;">
          <a href="${resetUrl}" target="_blank" style="border: 1px solid #0f172a; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 12px 32px; text-decoration: none;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>

    <p class="content-text" style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.5; color: #dc2626; font-weight: 500;">
      ⚠️ For security reasons, this link will expire in 60 minutes.
    </p>

    <p class="content-text" style="margin: 0; font-size: 14px; line-height: 1.6; color: #64748b;">
      If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
  `;

  return getBaseLayout('Reset your Tally Password', htmlContent);
}
