'use client'

import { Clear, Search } from '@mui/icons-material'
import {
    Box,
    Button,
    IconButton,
    InputAdornment,
    TextField,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { DOCUMENTS_BASE_PATH, SEARCH_BASE_PATH } from '@/constants/api'

type ExtraParams = Record<string, string | number | boolean | undefined | null>

interface SearchBarProps {
    initialValue?: string
    onSearch?: (q: string) => void
    getExtraParams?: () => ExtraParams
}

export function SearchBar({
    initialValue,
    onSearch,
    getExtraParams,
}: SearchBarProps) {
    const router = useRouter()
    const [query, setQuery] = useState(initialValue ?? '')

    const handleOnSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const q = query.trim()

        if (onSearch) {
            onSearch(q)
            return
        }

        const params = new URLSearchParams()
        if (q) params.set('q', q)

        const extra = getExtraParams?.() ?? {}
        Object.entries(extra).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return
            params.set(key, String(value))
        })

        router.push(
            `${DOCUMENTS_BASE_PATH}${SEARCH_BASE_PATH}?${params.toString()}`
        )
    }

    const handleClear = () => {
        setQuery('')
    }

    return (
        <Box sx={{ width: '100%', display: 'flex' }}>
            <TextField
                fullWidth
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='Поиск по всем документам...'
                slotProps={{
                    input: {
                        endAdornment: (
                            <InputAdornment position='end'>
                                <IconButton onClick={handleClear}>
                                    <Clear />
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                    },
                }}
            />
            <Button
                variant='contained'
                sx={{ mx: 2, px: 4 }}
                endIcon={<Search />}
                onClick={handleOnSearch}
            >
                Найти
            </Button>
        </Box>
    )
}
