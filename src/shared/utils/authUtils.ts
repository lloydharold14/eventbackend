import { APIGatewayProxyEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

export function getUserIdFromToken(event: APIGatewayProxyEvent): string | null {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const secret = process.env.JWT_SECRET || 'your-jwt-secret';
    
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded.userId;
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return null;
  }
}

export function getUserFromToken(event: APIGatewayProxyEvent): JwtPayload | null {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const secret = process.env.JWT_SECRET || 'your-jwt-secret';
    
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error('Error extracting user from token:', error);
    return null;
  }
}

export function validateToken(token: string): JwtPayload | null {
  try {
    const secret = process.env.JWT_SECRET || 'your-jwt-secret';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error('Error validating token:', error);
    return null;
  }
}

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const secret = process.env.JWT_SECRET || 'your-jwt-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  
  return jwt.sign(payload, secret, { expiresIn } as any);
}

export function generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const secret = process.env.JWT_SECRET || 'your-jwt-secret';
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  
  return jwt.sign(payload, secret, { expiresIn } as any);
}
