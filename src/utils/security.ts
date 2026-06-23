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

/**
 * Anti-DevTools script to block casual inspection via F12 or right-click.
 * Bypassed on localhost and for authenticated Admin.
 */
export function initAntiDevTools(): void {
  // 1. Bypass in local development to allow developer debugging
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.')
  ) {
    return;
  }

  // 2. Bypass if admin is already logged in
  if (localStorage.getItem('admin_session_token')) {
    return;
  }

  // 3. Disable Right-Click Context Menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // 4. Disable keyboard shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U)
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      return false;
    }
  });

  // 5. Clear Console continuously to wipe any printed logs or inspection objects
  setInterval(() => {
    if (localStorage.getItem('admin_session_token')) return;
    console.clear();
  }, 1000);

  // 6. Debugger loop to freeze the browser tab if DevTools is opened
  const runDebugger = () => {
    function debuggerCall() {
      if (localStorage.getItem('admin_session_token')) return;
      debugger;
    }
    setInterval(debuggerCall, 500);
  };

  try {
    runDebugger();
  } catch (err) {
    // Ignore errors silently
  }
}

