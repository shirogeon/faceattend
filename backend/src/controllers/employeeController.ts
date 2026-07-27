import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { FaceRepository } from '../repositories/FaceRepository';

export class EmployeeController {
  private faceRepository: FaceRepository;

  constructor() {
    this.faceRepository = new FaceRepository();
  }

  getEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employees = await prisma.user.findMany({
        include: { faceDescriptors: true },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json({ success: true, data: employees });
    } catch (error) {
      next(error);
    }
  };

  createEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, employeeId, email, faceDescriptor, snapshotUrl } = req.body;
      const nameParts = name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const user = await prisma.user.create({
        data: { 
          employeeId, 
          email, 
          firstName, 
          lastName, 
          passwordHash: 'BIOMETRIC_ONLY_NO_PASSWORD',
          snapshotUrl,
          role: {
            connectOrCreate: {
              where: { name: 'USER' },
              create: { name: 'USER' }
            }
          },
          isActive: true
        }
      });

      await this.faceRepository.saveDescriptor(user.id, faceDescriptor);

      res.status(201).json({ success: true, message: 'Data berhasil disimpan.' });
    } catch (error) {
      next(error);
    }
  };

  deleteEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      
      await prisma.attendanceLog.deleteMany({ where: { userId: id } });
      await prisma.$executeRaw`DELETE FROM face_descriptors WHERE user_id = ${id}::uuid`;
      await prisma.user.delete({ where: { id } });
      
      res.status(200).json({ success: true, message: 'Data berhasil dihapus.' });
    } catch (error) {
      next(error);
    }
  };
}