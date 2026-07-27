import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/UserRepository';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.isActive) {
      throw { statusCode: 401, message: 'Invalid credentials or inactive account' } as AppError;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      throw { statusCode: 401, message: 'Invalid credentials' } as AppError;
    }

    const token = generateToken({ id: user.id, roleId: user.roleId });

    // Exclude password hash from the returned user object
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }
}