'use client'

import { Autocomplete, TextField } from '@mui/material'

import {
    ACTION_TYPE_VALUES,
    AUDIT_LOG_ACTION_LABELS,
} from '@/constants/audit-log'
import type { ActionType } from '@/lib/types/audit-log'

interface ActionFilterProps {
    selectedActions: ActionType[]
    onChange: (actions: ActionType[]) => void
}

export function ActionFilter({ selectedActions, onChange }: ActionFilterProps) {
    return (
        <Autocomplete
            multiple
            limitTags={1}
            options={ACTION_TYPE_VALUES}
            value={selectedActions}
            onChange={(_, newValue) => {
                onChange(newValue)
            }}
            getOptionLabel={option => AUDIT_LOG_ACTION_LABELS[option] || option}
            renderInput={params => (
                <TextField
                    sx={{ textWrap: 'nowrap' }}
                    {...params}
                    label='Действия'
                />
            )}
            sx={{ minWidth: 300 }}
        />
    )
}
