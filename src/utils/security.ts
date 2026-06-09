export const ADMIN_PASSWORD = 'adml123';

/**
 * A simple synchronous deterministic hash function (sdbm algorithm)
 * to avoid storing the raw password or a simple boolean flag in localStorage.
 */
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = password.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
  }
  return `admin_secure_session_${(hash >>> 0).toString(16)}_salt889`;
}

/**
 * Checks if the stored admin session token is valid by comparing it
 * with the expected hash of the hardcoded admin password.
 */
export function checkAdminSession(): boolean {
  const token = localStorage.getItem('admin_session_token');
  const expected = hashPassword(ADMIN_PASSWORD);
  return token === expected;
}

/**
 * Saves or deletes the admin session token from localStorage.
 */
export function setAdminSession(isAuthenticated: boolean): void {
  if (isAuthenticated) {
    const token = hashPassword(ADMIN_PASSWORD);
    localStorage.setItem('admin_session_token', token);
  } else {
    localStorage.removeItem('admin_session_token');
  }
}
