// lib/utils/bib-generator.ts
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate BIB number untuk 5K (5001, 5002, ...) dan 10K (10001, 10002, ...)
 */
export async function generateBibNumber(
  category: '5K' | '10K',
  tx?: Prisma.TransactionClient
): Promise<string> {
  const db = tx || prisma;

  const lastParticipant = await db.participant.findFirst({
    where: { category, bibNumber: { not: null } },
    orderBy: { bibNumber: 'desc' },
    select: { bibNumber: true },
  });

  let nextNumber: number;
  if (!lastParticipant?.bibNumber) {
    nextNumber = category === '5K' ? 5001 : 10001;
  } else {
    nextNumber = parseInt(lastParticipant.bibNumber) + 1;
  }

  return nextNumber.toString();
}

/**
 * Batch generate BIB numbers untuk banyak peserta
 */
export async function generateBibNumbersBatch(
  category: '5K' | '10K',
  count: number,
  tx?: Prisma.TransactionClient
): Promise<string[]> {
  const db = tx || prisma;

  const lastParticipant = await db.participant.findFirst({
    where: { category, bibNumber: { not: null } },
    orderBy: { bibNumber: 'desc' },
    select: { bibNumber: true },
  });

  let start: number;
  if (!lastParticipant?.bibNumber) {
    start = category === '5K' ? 5001 : 10001;
  } else {
    start = parseInt(lastParticipant.bibNumber) + 1;
  }

  return Array.from({ length: count }, (_, i) => (start + i).toString());
}