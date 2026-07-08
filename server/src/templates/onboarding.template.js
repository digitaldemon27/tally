import { getBaseLayout } from './base.layout.js';

/**
 * Generates the onboarding / welcome email HTML.
 * 
 * @param {Object} data - Template variables
 * @param {string} data.name - Recipient's name
 * @param {string} data.dashboardUrl - Landing page/dashboard URL
 * @returns {string} - Complete HTML string
 */
export function getOnboardingTemplate({ name, dashboardUrl }) {
  const displayName = name ? name : 'there';
  const htmlContent = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; line-height: 1.25; color: #0f172a; letter-spacing: -0.5px;">
      Welcome to Tally, ${displayName}! 👋
    </h1>
    
    <p class="content-text" style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #334155;">
      We're absolutely thrilled to have you here. Tally is an identity and vote-based habit tracker designed to help you commit to your goals, stay accountable with friends, and unlock your potential.
    </p>

    <p class="content-text" style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #334155;">
      Ready to start tracking? Click the button below to head to your dashboard and create your very first habit challenge.
    </p>

    <!-- Call to Action -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 32px auto;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: #2563eb;">
          <a href="${dashboardUrl}" target="_blank" style="border: 1px solid #2563eb; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 12px 32px; text-decoration: none;">
            Get Started
          </a>
        </td>
      </tr>
    </table>

    <p class="content-text" style="margin: 0; font-size: 15px; line-height: 1.6; color: #64748b;">
      If you have any questions or feedback, just reply to this email. We'd love to hear from you.
    </p>
  `;

  return getBaseLayout('Welcome to Tally', htmlContent);
}
