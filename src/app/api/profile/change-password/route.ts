'use server'

import { type NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/actions/users'
import { handleApiError } from '@/lib/api/apiError'
import { changePasswordSchema } from '@/lib/schemas/profile'
import { UserService } from '@/lib/services/UserService'

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser(req)
        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await req.json()
        const validation = changePasswordSchema.safeParse(body)

        if (!validation.success) {
            return handleApiError(validation.error)
        }

        const { oldPassword, newPassword } = validation.data

        await UserService.changePassword(user.id, oldPassword, newPassword)

        return NextResponse.json({ message: 'Пароль успешно изменен' })
    } catch (error) {
        return handleApiError(error)
    }
}
