import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { DOCUMENTS_PAGE_PATH } from '@/constants/api'
import { COOKIE_NAME } from '@/constants/app'
import { USER_ROLES } from '@/constants/user'

export default async function AdminLayoutWrapper({
    children,
}: {
    children: React.ReactNode
}) {
    const token = (await cookies()).get(COOKIE_NAME)?.value
    if (!token) redirect(DOCUMENTS_PAGE_PATH)

    const [, body] = token.split('.')
    if (!body) redirect(DOCUMENTS_PAGE_PATH)

    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (decoded.role !== USER_ROLES.ADMIN) redirect(DOCUMENTS_PAGE_PATH)

    return <AdminLayout>{children}</AdminLayout>
}
