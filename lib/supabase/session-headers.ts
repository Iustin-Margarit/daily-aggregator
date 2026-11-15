/*
 * Request headers the proxy (lib/supabase/proxy.ts) adds after verifying the
 * session, so pages know who is signed in without asking Supabase Auth again
 * (getSessionUser in lib/supabase/server.ts). The proxy deletes any copies a
 * browser sends before setting them. Database access never relies on them:
 * queries still carry the session cookie and row-level security.
 */
export const SESSION_CHECKED = 'x-session-checked';
export const SESSION_USER_ID = 'x-session-user-id';
export const SESSION_USER_EMAIL = 'x-session-user-email';
export const SESSION_HEADERS = [SESSION_CHECKED, SESSION_USER_ID, SESSION_USER_EMAIL];
