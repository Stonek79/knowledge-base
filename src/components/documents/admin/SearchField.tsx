'use client';

import { useEffect, useState } from 'react';

import { Search as SearchIcon } from '@mui/icons-material';
import { TextField } from '@mui/material';

import { useDebounce } from '@/lib/hooks/useDebounce';

interface SearchFieldProps {
    value?: string;
    onSearch: (search: string) => void;
    placeholder?: string;
}

export function SearchField({
    value = '',
    onSearch,
    placeholder = 'Поиск документов...',
}: SearchFieldProps) {
    const [searchValue, setSearchValue] = useState(value);

    const debouncedOnSearch = useDebounce(onSearch);

    useEffect(() => {
        setSearchValue(value);
    }, [value]);

    const handleInputChange = (newValue: string) => {
        setSearchValue(newValue);

        debouncedOnSearch(newValue);
    };

    return (
        <TextField
            placeholder={placeholder}
            value={searchValue}
            onChange={e => handleInputChange(e.target.value)}
            slotProps={{
                input: {
                    startAdornment: <SearchIcon sx={{ mr: 1 }} />,
                },
            }}
            size='small'
        />
    );
}
