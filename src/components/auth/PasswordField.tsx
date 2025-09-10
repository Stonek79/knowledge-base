'use client';

import { MouseEvent, useState } from 'react';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { TextFieldProps } from '@mui/material/TextField';

interface PasswordFieldProps
    extends Omit<TextFieldProps, 'name' | 'type' | 'variant' | 'margin' | 'fullWidth'> {
    autoCompletePolicy?: string; // 'current-password' или 'new-password'
}

export function PasswordField({
    id,
    label = 'Пароль',
    autoCompletePolicy = 'current-password',
    ...props
}: PasswordFieldProps) {
    const [showPassword, setShowPassword] = useState(false);

    const handleClickShowPassword = () => setShowPassword(show => !show);
    const handleMouseDownPassword = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    return (
        <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label={label}
            type={showPassword ? 'text' : 'password'}
            id={id}
            autoComplete={autoCompletePolicy}
            variant="outlined"
            {...props} // Здесь будут error, helperText, value, onChange от Controller
            slotProps={{
                input: {
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="Показать/скрыть пароль"
                                onClick={handleClickShowPassword}
                                onMouseDown={handleMouseDownPassword}
                                edge="end"
                            >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                    ),
                },
            }}
        />
    );
}
