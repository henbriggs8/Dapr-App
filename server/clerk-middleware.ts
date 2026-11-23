import { Request, Response, NextFunction } from 'express';
import { clerkClient, requireAuth } from '@clerk/clerk-sdk-node';
import { storage } from './storage';
import { createBearerUserResolver } from './bearer-user';

export interface ClerkRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
  };
}

/**
 * Resolves an explicit Clerk Bearer identity; cookie-only sessions still work.
 * Use this on customer-facing routes that need to work for both web (cookie session)
 * and Capacitor iOS (Bearer token, no cross-origin cookies).
 * Always calls next() — does NOT 401. Let the route decide if req.user is required.
 */
export const resolveUserFromBearer = createBearerUserResolver({
  verifyToken: token => clerkClient.verifyToken(token),
  getUserByUsername: username => storage.getUserByUsername(username),
});

export async function clerkAuthMiddleware(req: ClerkRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  const token = authHeader.substring(7);
  
  try {
    const verified = await clerkClient.verifyToken(token);
    
    if (!verified || !verified.sub) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
    req.auth = {
      userId: verified.sub,
      sessionId: verified.sid as string
    };
    
    next();
  } catch (error) {
    console.error('Clerk auth error:', error);
    return res.status(401).json({ error: 'Unauthorized - Token verification failed' });
  }
}
