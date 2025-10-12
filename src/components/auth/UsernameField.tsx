'use client';

import TextField, { TextFieldProps } from '@mui/material/TextField';

type UsernameFieldProps = Omit<
    TextFieldProps,
    'name' | 'label' | 'autoComplete' | 'type'
>;

export function UsernameField(props: UsernameFieldProps) {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (props.onChange) {
            props.onChange(event);
        }
    };

    return (
        <TextField
            margin='normal'
            required
            fullWidth
            id={props.id || 'username'}
            label='Имя пользователя'
            name='username'
            autoComplete='username'
            {...props}
            onChange={handleChange}
        />
    );
}
