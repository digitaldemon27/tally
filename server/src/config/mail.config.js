import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory name in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the server/.env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.RESEND_MAIL_SERVICE_API;
const fromEmail = process.env.RESEND_MAIL_SERVICE_MAIL;

if (!apiKey) {
  console.warn('⚠️ Warning: RESEND_MAIL_SERVICE_API is not set in environment variables.');
}

if (!fromEmail) {
  console.warn('⚠️ Warning: RESEND_MAIL_SERVICE_MAIL is not set in environment variables.');
}

export const resend = apiKey ? new Resend(apiKey) : null;
// Note: Resend requires a verified custom domain to send from custom addresses.
// For testing/development, if your domain is not verified, you must use 'onboarding@resend.dev'
// as the sender and only send to your own registered email address.
const isProduction = process.env.NODE_ENV === 'production';
export const FROM_EMAIL = (!isProduction || fromEmail?.includes('gmail.com')) 
  ? 'onboarding@resend.dev' 
  : (fromEmail || 'onboarding@resend.dev');
