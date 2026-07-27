import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserRepository } from '../repositories/UserRepository';
import { AppError } from './errorHandler';

const userRepository = new UserRepository();

// Extend the Express Request interface to inject the user object
declare global {
  namespace Express {
    interface Request {
      user?: any; // You can replace 'any' with a stricter User type later
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw { statusCode: 401, message: 'Not authorized to access this route' } as AppError;
    }

    const decoded = verifyToken(token);
    const user = await userRepository.findById(decoded.id);

    if (!user || !user.isActive) {
      throw { statusCode: 401, message: 'User no longer exists or is inactive' } as AppError;
    }

    req.user = user;
    next();
  } catch (error) {
    next({ statusCode: 401, message: 'Not authorized, token failed' } as AppError);
  }
};