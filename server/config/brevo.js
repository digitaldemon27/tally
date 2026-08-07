import { BrevoClient } from '@getbrevo/brevo';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Resolve directory path for ES Modules to ensure environment variables are loaded if needed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Load environment variables from server/.env if not already loaded by runtime
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 3. Retrieve the Brevo API key securely from process.env without hardcoding secrets
const apiKey = process.env.BREVO_API_KEY || process.env.RESEND_MAIL_SERVICE_API;

if (!apiKey) {
  console.warn('⚠️ Warning: BREVO_API_KEY (or RESEND_MAIL_SERVICE_API) is not defined in environment variables.');
}

// 4. Initialize the BrevoClient instance with the API key configuration
const brevoClient = new BrevoClient({
  apiKey: apiKey || '',
});

// 5. Export the initialized brevoClient instance as default and named export for modular usage
export { brevoClient, BrevoClient };
export default brevoClient;
