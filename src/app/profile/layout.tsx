'use client'

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'

import { DocumentsLayout } from '@/components/layout/DocumentsLayout'

/**
 * Layout для страницы профиля пользователя.
 * - Обеспечивает общий внешний вид через DocumentsLayout.
 * - Добавляет LocalizationProvider для работы DatePicker.
 */
export default function ProfileLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DocumentsLayout>{children}</DocumentsLayout>
        </LocalizationProvider>
    )
}
