/**
 * Gives an existing account the admin role.
 *
 *   npm run make-admin -- you@example.com
 */
import './load-env';
import { createServiceClient } from './service-client';

async function main() {
  const email = process.argv[2];
  if (!email || !email.includes('@')) {
    console.error('Usage: npm run make-admin -- you@example.com');
    process.exit(1);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('promote_to_admin', { p_email: email });
  if (error) {
    console.error(`Could not promote ${email}: ${error.message}`);
    console.error('Make sure the account exists (sign up in the app first).');
    process.exit(1);
  }
  console.log(data);
}

main();
