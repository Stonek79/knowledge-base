import { Prisma, PrismaClient } from '@prisma/client'

export { Prisma, PrismaClient }

// Re-export common types if needed, though specific entity types
// should ideally go to their respective type files (e.g. user.ts, document.ts)
export type TransactionClient = Prisma.TransactionClient
