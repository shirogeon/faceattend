import prisma from '../config/prisma';
import { Prisma, LogType } from '@prisma/client';

export class AttendanceRepository {
  /**
   * Menyimpan data log absensi ke dalam database.
   */
  async createLog(data: Prisma.AttendanceLogUncheckedCreateInput) {
    return prisma.attendanceLog.create({
      data,
    });
  }

  /**
   * Mencari apakah user sudah melakukan absen (IN/OUT) pada hari ini.
   * Digunakan untuk mencegah duplicate check-in / check-out.
   */
  async findLogByDateAndType(userId: string, date: Date, type: LogType) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.attendanceLog.findFirst({
      where: {
        userId,
        type,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'SUCCESS',
      },
    });
  }
}