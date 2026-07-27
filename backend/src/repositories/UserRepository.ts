import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { 
        email, 
        deletedAt: null // Only fetch non-deleted users
      },
      include: { 
        role: true, 
        department: true 
      }
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { 
        id, 
        deletedAt: null 
      },
      include: { 
        role: true, 
        department: true 
      }
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
    });
  }
}