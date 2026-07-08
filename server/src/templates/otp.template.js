import { getBaseLayout } from './base.layout.js';

/**
 * Generates the OTP verification email HTML.
 * 
 * @param {Object} data - Template variables
 * @param {string} data.name - Recipient's name
 * @param {string} data.otpCode - The OTP verification code
 * @param {number} [data.expiryMinutes=10] - Number of minutes the OTP is valid
 * @returns {string} - Complete HTML string
 */
export function getOtpTemplate({ name, otpCode, expiryMinutes = 10 }) {
  const displayName = name ? name : 'there';
  const htmlContent = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; line-height: 1.25; color: #0f172a; letter-spacing: -0.5px;">
      Verify your email
    </h1>
    
    <p class="content-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #334155;">
      Hi ${displayName},
    </p>

    <p class="content-text" style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #334155;">
      Please use the verification code below to complete your sign-up or verification process on Tally.
    </p>

    <!-- OTP Code Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 24px auto;">
      <tr>
        <td class="badge-container" align="center" style="background-color: #f1f5f9; border-radius: 8px; padding: 16px 40px; border: 1px solid #e2e8f0;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 6px; color: #0f172a;">
            ${otpCode}
          </span>
        </td>
      </tr>
    </table>

    <p class="content-text" style="text-align: center; margin: 0 0 24px 0; font-size: 14px; line-height: 1.5; color: #64748b;">
      This code is valid for <strong>${expiryMinutes} minutes</strong>.
    </p>

    <p class="content-text" style="margin: 0; font-size: 14px; line-height: 1.6; color: #64748b;">
      If you did not request a verification code, you can safely ignore this email.
    </p>
  `;

  return getBaseLayout('Verify your email', htmlContent);
}
