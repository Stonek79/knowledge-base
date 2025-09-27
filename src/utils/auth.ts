import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hashes a password using bcrypt.
 * @param password The plain-text password to hash.
 * @returns A promise that resolves to the hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain-text password with a hash.
 * @param password The plain-text password.
 * @param hash The hash to compare against.
 * @returns A promise that resolves to true if the passwords match, false otherwise.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}
