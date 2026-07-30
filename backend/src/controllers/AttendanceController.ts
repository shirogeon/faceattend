import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceController {
  recordAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, confidence } = req.body;

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const lastLog = await prisma.attendanceLog.findFirst({
        where: {
          userId,
          timestamp: { gte: startOfDay }
        },
        orderBy: { timestamp: 'desc' }
      });

      const type = (!lastLog || lastLog.type === 'OUT') ? 'IN' : 'OUT';
      const normalCheckIn = new Date(now);
      normalCheckIn.setHours(7, 0, 0, 0);

      const isLate = type === 'IN' && now > normalCheckIn;
      const attendanceStatus = isLate ? AttendanceStatus.LATE : AttendanceStatus.ON_TIME;
      const lateMinutes = isLate ? Math.max(0, Math.floor((now.getTime() - normalCheckIn.getTime()) / 60000)) : 0;

      const log = await prisma.attendanceLog.create({
        data: {
          userId,
          type,
          confidence: Number(confidence),
          attendanceStatus,
          lateMinutes: type === 'IN' ? lateMinutes : 0
        }
      });

      res.status(201).json({ success: true, message: 'Absensi berhasil dicatat.', data: log });
    } catch (error) {
      next(error);
    }
  };

  getLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const logs = await prisma.attendanceLog.findMany({
        include: { 
          user: {
            select: { employeeId: true, firstName: true, lastName: true }
          } 
        },
        orderBy: { timestamp: 'desc' }
      });
      
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const todayAttendance = await prisma.attendanceLog.count({
        where: {
          timestamp: { gte: startOfDay },
          type: 'IN'
        }
      });

      res.status(200).json({ success: true, data: { logs, stats: { todayAttendance } } });
    } catch (error) {
      next(error);
    }
  };
}