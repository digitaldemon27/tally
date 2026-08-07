import brevoClient from '../../config/brevo.js';

const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.RESEND_MAIL_SERVICE_MAIL || process.env.MAIL_FROM || 'rishabh27122005@gmail.com';
const senderName = process.env.BREVO_SENDER_NAME || 'Tally';

export const SENDER = {
  name: senderName,
  email: senderEmail,
};

export { brevoClient };
export default brevoClient;
