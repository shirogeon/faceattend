import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AttendanceRepository } from '../repositories/AttendanceRepository';
import { FaceService } from './FaceService';
import { AppError } from '../middlewares/errorHandler';
import { LogType, Status } from '@prisma/client';

export class AttendanceService {
  private attendanceRepo: AttendanceRepository;
  private faceService: FaceService;

  constructor() {
    this.attendanceRepo = new AttendanceRepository();
    this.faceService = new FaceService();
  }

  /**
   * Mengambil liveness challenge (Blink, Turn Left, Turn Right) dari FaceService
   */
  async getChallenge() {
    return this.faceService.generateLivenessChallenge();
  }

  /**
   * Memproses data absensi dari frontend
   */
  async processAttendance(descriptor: number[], challengeToken: string, type: 'IN' | 'OUT') {
    // 1. Validasi Liveness Challenge Token (Anti-Spoofing)
    try {
      jwt.verify(challengeToken, env.JWT_SECRET);
    } catch (error) {
      throw { 
        statusCode: 400, 
        message: 'Liveness challenge token tidak valid atau sudah kadaluarsa (lebih dari 30 detik). Silakan coba lagi.' 
      } as AppError;
    }

    // 2. Identifikasi Wajah User menggunakan AI Vector Similarity
    const { user, confidence } = await this.faceService.identifyUser(descriptor);

    // 3. Cek Duplikasi Absen (Apakah sudah absen IN/OUT hari ini?)
    const today = new Date();
    const existingLog = await this.attendanceRepo.findLogByDateAndType(user.id, today, type as LogType);

    if (existingLog) {
      throw { 
        statusCode: 400, 
        message: `Anda sudah melakukan Check-${type} pada hari ini.` 
      } as AppError;
    }

    // 4. Simpan Log Absensi ke Database
    const log = await this.attendanceRepo.createLog({
      userId: user.id,
      type: type as LogType,
      status: Status.SUCCESS,
      confidence,
    });

    return {
      user,
      log,
    };
  }
}