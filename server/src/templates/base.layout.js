/**
 * Base email layout wrapper following responsive design best practices.
 * Handles the common boilerplate like font stacks, wrapper tables, containers, 
 * styling reset, header, and footer branding.
 * 
 * @param {string} title - The title of the email (for accessibility/browser title)
 * @param {string} htmlContent - The specific HTML body for the template
 * @returns {string} - The complete ready-to-send HTML document
 */
export function getBaseLayout(title, htmlContent) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <style>
    /* Dark Mode overrides for supportive email clients */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #121212 !important;
        color: #e0e0e0 !important;
      }
      .email-container {
        background-color: #1e1e1e !important;
        border-color: #2d2d2d !important;
      }
      .email-header {
        border-bottom-color: #2d2d2d !important;
      }
      .email-footer {
        color: #888888 !important;
      }
      .content-text {
        color: #cccccc !important;
      }
      .badge-container {
        background-color: #2b2b2b !important;
        color: #ffffff !important;
      }
      .divider {
        border-top-color: #2d2d2d !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; width: 100%; margin: 0; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Main Email Card -->
        <table class="email-container" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          
          <!-- Header (Branding) -->
          <tr>
            <td class="email-header" align="center" style="padding: 32px 40px; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; text-decoration: none;">
                    📊 Tally
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              ${htmlContent}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div class="divider" style="border-top: 1px solid #e2e8f0;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" align="center" style="padding: 32px 40px; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
              <p style="margin: 0 0 8px 0; font-weight: 600;">Tally Inc.</p>
              <p style="margin: 0 0 16px 0;">Identity & vote-based habit tracker.</p>
              <p style="margin: 0;">
                You received this email because you registered on our platform. 
                If you did not make this request, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
