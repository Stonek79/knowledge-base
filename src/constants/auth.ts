import { parseDurationToSeconds } from '@/utils/date';

export const JWT_SECRET = process.env.JWT_SECRET || 'supersecuresecret';
export const JWT_MAX_AGE = '1209600';
// Источник TTL из окружения (секунды или '14d')
const JWT_MAX_AGE_SOURCE = process.env.JWT_MAX_AGE || JWT_MAX_AGE;

// Единые константы:
export const JWT_EXPIRES_IN = parseDurationToSeconds(JWT_MAX_AGE_SOURCE); // jsonwebtoken: number (секунды) 1209600 //
