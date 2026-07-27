import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

export class AttendanceController {
  recordAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, confidence } = req.body;
      
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const lastLog = await prisma.attendanceLog.findFirst({
        where: {
          userId,
          timestamp: { gte: startOfDay }
        },
        orderBy: { timestamp: 'desc' }
      });

      const type = (!lastLog || lastLog.type === 'OUT') ? 'IN' : 'OUT';
      
      const log = await prisma.attendanceLog.create({
        data: {
          userId,
          type,
          confidence: Number(confidence)
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