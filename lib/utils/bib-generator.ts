// lib/utils/bib-generator.ts
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Validate BIB number format
 * 5K: 5001-5999
 * 10K: 10001-10999
 */
export function isValidBibFormat(bibNumber: string, category: '5K' | '10K'): boolean {
  const num = parseInt(bibNumber);
  if (isNaN(num)) return false;

  if (category === '5K') {
    return num >= 5001 && num <= 5999;
  } else {
    return num >= 10001 && num <= 10999;
  }
}

/**
 * Extract numeric sequence from BIB (e.g., "5001" -> 1, "10001" -> 1)
 */
function extractSequence(bibNumber: string, category: '5K' | '10K'): number {
  const num = parseInt(bibNumber);
  if (category === '5K') {
    return num - 5000;
  } else {
    return num - 10000;
  }
}

/**
 * Generate BIB number untuk 5K (5001, 5002, ...) dan 10K (10001, 10002, ...)
 */
export async function generateBibNumber(
  category: '5K' | '10K',
  tx?: Prisma.TransactionClient
): Promise<string> {
  const db = tx || prisma;

  // Get the highest valid BIB number for this category
  const participants = await db.participant.findMany({
    where: {
      category,
      bibNumber: { not: null }
    },
    select: { bibNumber: true },
  });

  // Filter only valid format BIBs and find the highest
  const validBibs = participants
    .map(p => p.bibNumber)
    .filter((bib): bib is string => bib !== null && isValidBibFormat(bib, category))
    .map(bib => parseInt(bib))
    .sort((a, b) => b - a);

  let nextNumber: number;
  if (validBibs.length === 0) {
    // Start from beginning
    nextNumber = category === '5K' ? 5001 : 10001;
  } else {
    // Get highest and increment
    const highest = validBibs[0];
    nextNumber = highest + 1;

    // Check if we've exceeded the range
    if (category === '5K' && nextNumber > 5999) {
      // Find gaps in sequence
      nextNumber = findGapInSequence(validBibs, 5001, 5999) || 5999;
    } else if (category === '10K' && nextNumber > 10999) {
      // Find gaps in sequence
      nextNumber = findGapInSequence(validBibs, 10001, 10999) || 10999;
    }
  }

  return nextNumber.toString();
}

/**
 * Find the next available BIB number, checking for uniqueness
 */
export async function generateUniqueBibNumber(
  category: '5K' | '10K',
  tx?: Prisma.TransactionClient
): Promise<string> {
  const db = tx || prisma;

  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const bibNumber = await generateBibNumber(category, db);

    // Double check it doesn't exist
    const existing = await db.participant.findFirst({
      where: { bibNumber },
      select: { id: true }
    });

    if (!existing) {
      return bibNumber;
    }

    attempts++;

    // If this BIB exists, mark it as used and try again
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to avoid race condition
  }

  // If all else fails, generate with timestamp suffix but keep format
  const base = category === '5K' ? 5000 : 10000;
  const suffix = Date.now().toString().slice(-3); // Last 3 digits of timestamp
  const bibNumber = (base + parseInt(suffix)).toString();

  // Ensure it's within valid range
  if (category === '5K' && parseInt(bibNumber) > 5999) {
    return '5999'; // Max for 5K
  } else if (category === '10K' && parseInt(bibNumber) > 10999) {
    return '10999'; // Max for 10K
  }

  return bibNumber;
}

/**
 * Find gap in sequence of numbers
 */
function findGapInSequence(numbers: number[], min: number, max: number): number | null {
  const sorted = numbers.sort((a, b) => a - b);

  // Check from min
  if (sorted[0] > min) {
    return min;
  }

  // Find gap in middle
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] > 1) {
      return sorted[i] + 1;
    }
  }

  // Check if there's room after last number
  if (sorted[sorted.length - 1] < max) {
    return sorted[sorted.length - 1] + 1;
  }

  return null;
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
  const bibs: string[] = [];

  for (let i = 0; i < count; i++) {
    const bib = await generateUniqueBibNumber(category, db);
    bibs.push(bib);
  }

  return bibs;
}

/**
 * Fix invalid BIB numbers in database
 */
export async function fixInvalidBibs(tx?: Prisma.TransactionClient): Promise<void> {
  const db = tx || prisma;

  // Find all participants with invalid BIB format
  const participants = await db.participant.findMany({
    where: { bibNumber: { not: null } },
    select: { id: true, bibNumber: true, category: true }
  });

  for (const participant of participants) {
    if (participant.bibNumber &&
      !isValidBibFormat(participant.bibNumber, participant.category as '5K' | '10K')) {
      // Generate new valid BIB
      const newBib = await generateUniqueBibNumber(participant.category as '5K' | '10K', db);

      await db.participant.update({
        where: { id: participant.id },
        data: { bibNumber: newBib }
      });

      console.log(`Fixed BIB for participant ${participant.id}: ${participant.bibNumber} -> ${newBib}`);
    }
  }
}