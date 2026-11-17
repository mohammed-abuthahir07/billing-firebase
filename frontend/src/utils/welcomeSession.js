const WELCOME_KEY = 'zb_welcome_pending';

export function markWelcomePending() {
  try {
    sessionStorage.setItem(WELCOME_KEY, '1');
  } catch {
    // Private browsing can block session storage. Skip the popup rather than break login.
  }
}

export function consumeWelcomePending() {
  try {
    if (sessionStorage.getItem(WELCOME_KEY) !== '1') return false;
    sessionStorage.removeItem(WELCOME_KEY);
    return true;
  } catch {
    return false;
  }
}

export function clearWelcomePending() {
  try {
    sessionStorage.removeItem(WELCOME_KEY);
  } catch {
    // Nothing to clear.
  }
}
