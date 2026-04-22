import { Request, Response, NextFunction } from 'express';
import { clerkClient, requireAuth } from '@clerk/clerk-sdk-node';
import { storage } from './storage';

export interface ClerkRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
  };
}

/**
 * Resolves req.user from a Clerk Bearer token if Passport hasn't already set it.
 * Use this on customer-facing routes that need to work for both web (cookie session)
 * and Capacitor iOS (Bearer token, no cross-origin cookies).
 * Always calls next() — does NOT 401. Let the route decide if req.user is required.
 */
export async function resolveUserFromBearer(req: Request, _res: Response, next: NextFunction) {
  if (req.user) return next();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.substring(7);
    const verified = await clerkClient.verifyToken(token);
    if (verified?.sub) {
      const user = await storage.getUserByUsername(`clerk_${verified.sub}`);
      if (user) {
        (req as any).user = user;
      }
    }
  } catch (err) {
    console.error('resolveUserFromBearer error:', err);
  }
  next();
}

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
