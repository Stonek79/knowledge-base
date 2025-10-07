import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/actions/users';
import { handleApiError } from '@/lib/api';
import { profileUpdateApiScheme } from '@/lib/schemas/profile';
import { UserService } from '@/lib/services/UserService';

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: User profile data
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userProfile = await UserService.getProfile(user.id);

        return NextResponse.json(userProfile);
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProfileUpdateSchema'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);
        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();

        const validation = profileUpdateApiScheme.safeParse(body);

        if (!validation.success) {
            return handleApiError(validation.error);
        }

        const updatedProfile = await UserService.updateProfile(
            user.id,
            validation.data
        );

        return NextResponse.json(updatedProfile);
    } catch (error) {
        return handleApiError(error);
    }
}
