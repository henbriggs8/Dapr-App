import { Request, Response, NextFunction } from 'express';
import { clerkClient, requireAuth } from '@clerk/clerk-sdk-node';

export interface ClerkRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
  };
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
