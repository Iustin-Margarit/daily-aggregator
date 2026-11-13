// Loads .env.local (then .env) for command-line scripts. Imported first so the
// variables are in place before any other module runs. Variables that are
// already set (for example from .env.cloud.local) win.
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ quiet: true });
