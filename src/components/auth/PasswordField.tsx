'use client'

import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField, { type TextFieldProps } from '@mui/material/TextField'
import { type MouseEvent, useState } from 'react'

interface PasswordFieldProps
    extends Omit<
        TextFieldProps,
        'name' | 'type' | 'variant' | 'margin' | 'fullWidth'
    > {
    autoCompletePolicy?: string // 'current-password' или 'new-password'
    name?: string
    required?: boolean
}

export function PasswordField({
    id,
    label = 'Пароль',
    autoCompletePolicy = 'current-password',
    name = 'password',
    required = true,
    ...props
}: PasswordFieldProps) {
    const [showPassword, setShowPassword] = useState(false)

    const handleClickShowPassword = () => setShowPassword(show => !show)
    const handleMouseDownPassword = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
    }

    return (
        <TextField
            margin='normal'
            required={required}
            fullWidth
            name={name}
            label={label}
            type={showPassword ? 'text' : 'password'}
            id={id}
            autoComplete={autoCompletePolicy}
            variant='outlined'
            {...props} // Здесь будут error, helperText, value, onChange от Controller
            slotProps={{
                input: {
                    endAdornment: (
                        <InputAdornment position='end'>
                            <IconButton
                                aria-label='Показать/скрыть пароль'
                                onClick={handleClickShowPassword}
                                onMouseDown={handleMouseDownPassword}
                                edge='end'
                            >
                                {showPassword ? (
                                    <VisibilityOff />
                                ) : (
                                    <Visibility />
                                )}
                            </IconButton>
                        </InputAdornment>
                    ),
                },
            }}
        />
    )
}
