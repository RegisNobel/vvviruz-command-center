export type AuthSessionStage = "setup-totp" | "pending-totp" | "authenticated";

export type AuthFactorMethod = "totp";

export type AdminUserRecord = {
  id: string;
  username: string;
  totp: {
    method: AuthFactorMethod | null;
    encryptedSecret: string | null;
    enrolledAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type AuthSessionRecord = {
  id: string;
  userId: string;
  username: string;
  stage: AuthSessionStage;
  factorMethod: AuthFactorMethod | null;
  pendingTotpSecret: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type SessionCookiePayload = {
  sid: string;
  stage: AuthSessionStage;
  exp: number;
  v: 1;
};
