'use client'

import { Autocomplete, TextField } from '@mui/material'
import { useUsers } from '@/lib/hooks/useUsers'
import type { BaseUser } from '@/lib/types/user'

interface UserFilterProps {
    selectedUsers: BaseUser[]
    onChange: (users: BaseUser[]) => void
}

export function UserFilter({ selectedUsers, onChange }: UserFilterProps) {
    const { users } = useUsers()

    return (
        <Autocomplete
            sx={{ width: 300 }}
            multiple
            limitTags={1}
            value={selectedUsers}
            onChange={(_, newValue) => {
                onChange(newValue)
            }}
            options={users}
            getOptionLabel={option => option.username}
            renderInput={params => (
                <TextField
                    sx={{ textWrap: 'nowrap' }}
                    {...params}
                    label='Пользователь'
                />
            )}
        />
    )
}
