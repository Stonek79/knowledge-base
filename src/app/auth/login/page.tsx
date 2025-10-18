import { Suspense } from 'react'

import { LoginForm } from '@/components/auth'

export default async function LoginPage() {
    return (
        <Suspense fallback={<div>Загрузка...</div>}>
            <LoginForm />
        </Suspense>
    )
}
