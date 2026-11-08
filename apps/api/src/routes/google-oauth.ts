import { randomBytes } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import {
  buildAuthorizationUrl,
  consumeLoginState,
  createPkcePair,
  exchangeCodeForIdToken,
  readGoogleConfig,
  safeRedirectPath,
  saveLoginState,
  timingSafeEqualString,
  upsertGoogleUser,
  verifyGoogleIdToken,
  type GoogleConfig
} from '../services/google-oauth.ts';

export const GOOGLE_STATE_COOKIE = 'jobtrack_oauth_state';
export const GOOGLE_STATE_MAX_AGE = 10 * 60 * 1000;

const cookies = (header?: string) =>
  Object.fromEntries(
    (header || '').split(';').map(part => part.trim().split(/=(.*)/s).slice(0, 2))
  );

export function appRedirect(appOrigin: string, hash: string): string {
  const base = appOrigin.replace(/\/+$/, '');
  return `${base}/#${hash}`;
}

export function createGoogleOAuthRouter(options: {
  pool: Pool;
  appOrigin: () => string;
  secureCookie: () => boolean;
  createSession: (userId: string) => Promise<string>;
  sessionCookieName: string;
  sessionCookieOptions: { httpOnly: boolean; sameSite: 'lax'; secure: boolean; path: string; maxAge: number };
  limit: (req: Request, res: Response) => Promise<boolean>;
}): express.Router {
  const router = express.Router();

  const stateCookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: options.secureCookie(),
    path: '/api/auth/google',
    maxAge: GOOGLE_STATE_MAX_AGE
  });

  const configOrRedirect = (res: Response): GoogleConfig | null => {
    const config = readGoogleConfig();
    if (!config) {
      res.redirect(302, appRedirect(options.appOrigin(), 'auth?error=google_not_configured'));
      return null;
    }
    return config;
  };

  router.get('/start', async (req, res, next) => {
    try {
      if (!(await options.limit(req, res))) return;
      const config = configOrRedirect(res);
      if (!config) return;

      const state = randomBytes(32).toString('base64url');
      const { verifier, challenge } = createPkcePair();
      const redirectPath = safeRedirectPath(req.query.next);
      await saveLoginState(options.pool, state, verifier, redirectPath);

      res.cookie(GOOGLE_STATE_COOKIE, state, stateCookieOptions());
      res.set('Cache-Control', 'no-store');
      res.redirect(302, buildAuthorizationUrl(config, state, challenge));
    } catch (error) {
      next(error);
    }
  });

  router.get('/callback', async (req, res, next) => {
    try {
      if (!(await options.limit(req, res))) return;
      const config = configOrRedirect(res);
      if (!config) return;

      const errorCode = typeof req.query.error === 'string' ? req.query.error : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const cookieState = cookies(req.headers.cookie)[GOOGLE_STATE_COOKIE] || '';
      res.clearCookie(GOOGLE_STATE_COOKIE, { path: '/api/auth/google' });

      if (errorCode) {
        res.redirect(302, appRedirect(options.appOrigin(), `auth?error=${encodeURIComponent(errorCode)}`));
        return;
      }
      if (!state || !cookieState || !timingSafeEqualString(state, cookieState)) {
        res.redirect(302, appRedirect(options.appOrigin(), 'auth?error=google_state_mismatch'));
        return;
      }
      if (!code) {
        res.redirect(302, appRedirect(options.appOrigin(), 'auth?error=google_missing_code'));
        return;
      }

      const stored = await consumeLoginState(options.pool, state);
      if (!stored) {
        res.redirect(302, appRedirect(options.appOrigin(), 'auth?error=google_state_expired'));
        return;
      }

      const idToken = await exchangeCodeForIdToken(config, code, stored.verifier);
      const identity = await verifyGoogleIdToken(config, idToken);
      const login = await upsertGoogleUser(options.pool, identity);
      const token = await options.createSession(login.userId);

      res.cookie(options.sessionCookieName, token, options.sessionCookieOptions);
      const target = stored.redirectPath === '/' ? 'dashboard' : stored.redirectPath.replace(/^\/+/, '');
      res.redirect(302, appRedirect(options.appOrigin(), `${target}${login.created ? '?welcome=google' : ''}`));
    } catch (error) {
      const message = (error as Error).message || '';
      const code = message.includes('email_unverified')
        ? 'google_email_unverified'
        : message.includes('google_') ? 'google_failed' : 'google_failed';
      res.redirect(302, appRedirect(options.appOrigin(), `auth?error=${code}`));
      if (!message.startsWith('google_')) next(error);
    }
  });

  return router;
}

export function googleOAuthUnavailable(_req: Request, res: Response, _next: NextFunction) {
  res.status(503).json({
    code: 'google_oauth_not_configured',
    message: 'Đăng nhập Google chưa được cấu hình trên máy chủ này.'
  });
}
