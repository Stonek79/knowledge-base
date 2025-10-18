'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button, { type ButtonProps } from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useSWRConfig } from 'swr'

import { API_ME_PATH } from '@/constants/api'
import { login } from '@/lib/actions/actions'
import { useAuthRedirect } from '@/lib/hooks/useAuthRedirect'
import { loginSchema } from '@/lib/schemas/auth'
import type { LoginData } from '@/lib/types/auth'

import { PasswordField } from './PasswordField'
import { UsernameField } from './UsernameField'

interface SubmitButtonProps extends ButtonProps {
    isLoading: boolean
    loadingText?: string
}

export function SubmitButton({
    isLoading,
    loadingText,
    children,
    ...props
}: SubmitButtonProps) {
    return (
        <Button
            type='submit'
            fullWidth
            variant='contained'
            disabled={isLoading}
            sx={{ mt: 2, mb: 2 }}
            startIcon={
                isLoading ? (
                    <CircularProgress size={20} color='inherit' />
                ) : (
                    props.startIcon
                )
            }
            {...props}
        >
            {isLoading ? loadingText || children : children}
        </Button>
    )
}

export function LoginForm() {
    const { mutate } = useSWRConfig()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { redirectAfterAuth } = useAuthRedirect()
    const usernameId = useId()
    const passwordId = useId()

    const {
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<LoginData>({
        resolver: zodResolver(loginSchema),
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
    })

    const onSubmit = async (data: LoginData) => {
        setIsSubmitting(true)

        try {
            const authResponse = await login(data)
            await mutate(API_ME_PATH, authResponse, { revalidate: false })

            // Добавляем небольшую задержку перед редиректом чтобы куки успели записаться
            setTimeout(() => {
                redirectAfterAuth(authResponse.role)
            }, 100)
        } catch (error: unknown) {
            console.log('error', error)
            // Обрабатываем общую ошибку, не привязанную к полю
            const errorMessage =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : 'Произошла неизвестная ошибка'

            setError('root.serverError', {
                type: 'server',
                message: errorMessage,
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Container component='main' maxWidth='xs'>
            <Box
                sx={{
                    marginTop: { xs: 4, sm: 6, md: 8 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingX: { xs: 2, sm: 0 },
                }}
            >
                <Typography component='h1' variant='h5' gutterBottom>
                    Вход в систему
                </Typography>
                <Box
                    component='form'
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    sx={{ mt: 1, width: '100%' }}
                >
                    <Controller
                        name='username'
                        control={control}
                        defaultValue=''
                        render={({ field }) => (
                            <UsernameField
                                {...field}
                                autoFocus
                                id={usernameId}
                                error={!!errors.username}
                                helperText={errors.username?.message}
                            />
                        )}
                    />
                    <Controller
                        name='password'
                        control={control}
                        defaultValue=''
                        render={({ field }) => (
                            <PasswordField
                                {...field}
                                id={passwordId}
                                autoCompletePolicy='current-password'
                                error={!!errors.password}
                                helperText={errors.password?.message}
                            />
                        )}
                    />
                    {errors.root?.serverError && (
                        <Alert severity='error' sx={{ width: '100%', mt: 2 }}>
                            {errors.root.serverError.message}
                        </Alert>
                    )}
                    <SubmitButton
                        isLoading={isSubmitting}
                        loadingText='Вход...'
                    >
                        Войти
                    </SubmitButton>
                </Box>
            </Box>
        </Container>
    )
}
