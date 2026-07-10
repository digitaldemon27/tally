// ─── Redis Key Namespacing ────────────────────────────────────────────────────
// All Redis keys used across the app are defined here so they stay consistent.

// function to generate the key of the pending users
export const pendingUserKey = (token) => `auth:pending:${token}`; //live for 15 minutes

// function to generate the key for the look up of mail from which the token is already generated , using the email as the key
// not the token becuase on every reqeust new token is assigned so no meaning of cooldown
export const cooldownKey = (email) => `auth:cooldown:${email}`; // live for 60 seconds

//session key holds the per-device session data (hashed token, userId, device, createdAt)
export const sessionKey = (sessionId) => `session:${sessionId}`;

//sessions set holds all active sessionIds for a given user (used for multi-device logout / audit)
export const sessionsSetKey = (userId) => `sessions:${userId}`;
