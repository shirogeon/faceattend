// backend/src/services/FaceService.ts
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { FaceRepository } from '../repositories/FaceRepository';
import { UserRepository } from '../repositories/UserRepository';
import { AppError } from '../middlewares/errorHandler';

interface ChallengePayload {
  action: 'blink' | 'turn_left' | 'turn_right';
  jti: string; // Unique identifier to prevent challenge replay
}

export class FaceService {
  private faceRepository: FaceRepository;
  private userRepository: UserRepository;
  
  // Standar keamanan Euclidean Distance (Semakin KECIL semakin mirip)
  // Jarak 0.0 = Identik sempurna. Di atas 0.45 = Orang yang berbeda (Tolak!)
  private readonly MAX_DISTANCE_THRESHOLD = 0.45; 

  constructor() {
    this.faceRepository = new FaceRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Generates a random liveness challenge to prevent spoofing.
   */
  generateLivenessChallenge() {
    const actions: ChallengePayload['action'][] = ['blink', 'turn_left', 'turn_right'];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    
    // Generate token valid for only 30 seconds
    const challengeToken = jwt.sign(
      { action: randomAction, jti: crypto.randomUUID() }, 
      env.JWT_SECRET, 
      { expiresIn: '30s' }
    );

    return {
      challenge: randomAction,
      challengeToken
    };
  }

  /**
   * Identifies the user based on the 128D descriptor.
   */
  async identifyUser(descriptor: number[]) {
    // 1. Search vector database for closest match
    const match = await this.faceRepository.findClosestMatch(descriptor);

    // 2. Evaluate against strict maximum distance threshold
    // Jika data kosong atau jarak lebih dari 0.45 (tidak mirip), blokir seketika!
    if (!match || match.distance > this.MAX_DISTANCE_THRESHOLD) {
      throw { statusCode: 401, message: 'Verifikasi Gagal: Wajah tidak dikenali atau tingkat presisi biometrik terlalu jauh.' } as AppError;
    }

    // 3. Fetch matched user data
    const user = await this.userRepository.findById(match.user_id);
    
    if (!user || !user.isActive) {
      throw { statusCode: 401, message: 'Akun pegawai tidak valid atau sedang dinonaktifkan.' } as AppError;
    }

    // Exclude password hash from return
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      confidence: match.distance // Nilai ini akan tersimpan di tabel attendanceLogs
    };
  }
}