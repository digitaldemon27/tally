import { getBaseLayout } from './base.layout.js';

/**
 * Generates the email verification link email HTML.
 * 
 * @param {Object} data - Template variables
 * @param {string} data.username - Recipient's username
 * @param {string} data.verificationUrl - Email verification action link
 * @returns {string} - Complete HTML string
 */
export function getVerificationTemplate({ username, verificationUrl }) {
  const displayName = username ? username : 'there';
  const htmlContent = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; line-height: 1.25; color: #0f172a; letter-spacing: -0.5px;">
      Verify your email address
    </h1>
    
    <p class="content-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #334155;">
      Hi @${displayName},
    </p>

    <p class="content-text" style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #334155;">
      Thank you for registering on Tally! Please click the button below to verify your email address and continue setting up your account.
    </p>

    <!-- Call to Action -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 24px auto;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: #2563eb;">
          <a href="${verificationUrl}" target="_blank" style="border: 1px solid #2563eb; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 12px 32px; text-decoration: none;">
            Verify Email Address
          </a>
        </td>
      </tr>
    </table>

    <p class="content-text" style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.5; color: #64748b; font-style: italic;">
      If the button above does not work, copy and paste this link into your browser: <br/>
      <a href="${verificationUrl}" target="_blank" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
    </p>

    <p class="content-text" style="margin: 0; font-size: 14px; line-height: 1.6; color: #64748b;">
      This link will expire in 15 minutes. If you did not request this email, you can safely ignore it.
    </p>
  `;

  return getBaseLayout('Verify your email address', htmlContent);
}
