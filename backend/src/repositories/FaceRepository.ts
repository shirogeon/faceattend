// backend/src/repositories/FaceRepository.ts
import prisma from '../config/prisma';

export interface FaceMatchResult {
  user_id: string;
  distance: number; // Berubah dari similarity menjadi distance (Euclidean)
}

export class FaceRepository {
  /**
   * Save a new face descriptor for a user.
   * pgvector requires vectors to be formatted as string arrays '[0.1, 0.2, ...]'
   */
  async saveDescriptor(userId: string, descriptor: number[], snapshotUrl: string | null = null) {
    const vectorString = `[${descriptor.join(',')}]`;
    
    // Using Prisma's raw execute to handle the vector insert
    await prisma.$executeRaw`
      INSERT INTO face_descriptors (id, user_id, descriptor, snapshot_url, is_primary, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, ${vectorString}::vector, ${snapshotUrl}, true, NOW(), NOW())
    `;
  }

  /**
   * Search for the closest face descriptor using Euclidean distance (<->).
   * Semakin kecil angkanya (mendekati 0.0), semakin identik.
   */
  async findClosestMatch(descriptor: number[]): Promise<FaceMatchResult | null> {
    const vectorString = `[${descriptor.join(',')}]`;

    // Query finds the nearest neighbor using the IVFFlat or HNSW index dengan Euclidean (<->)
    const results = await prisma.$queryRaw<FaceMatchResult[]>`
      SELECT 
        user_id, 
        (descriptor <-> ${vectorString}::vector) as distance 
      FROM face_descriptors 
      ORDER BY descriptor <-> ${vectorString}::vector 
      LIMIT 1
    `;

    if (results && results.length > 0) {
      return results[0];
    }
    return null;
  }
}