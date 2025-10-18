import { Box, Typography } from '@mui/material'

interface SearchHighlightProps {
    text: string
    highlights: string[]
    query: string
}

export function SearchHighlight({
    text,
    highlights,
    query,
}: SearchHighlightProps) {
    const highlightText = (text: string, query: string) => {
        if (!query) return text

        const parts = text.split(new RegExp(`(${query})`, 'gi'))

        return (
            <>
                {parts.map((part, ind) => {
                    const key = ind
                    return part.toLowerCase() === query.toLowerCase() ? (
                        <mark key={key}>{part}</mark>
                    ) : (
                        part
                    )
                })}
            </>
        )
    }

    return (
        <Box>
            {highlights?.length > 0 ? (
                highlights?.map(highlight => (
                    <Typography
                        key={highlights.indexOf(highlight)}
                        variant='body2'
                        color='text.secondary'
                        sx={{
                            '& mark': {
                                backgroundColor: 'yellow',
                                padding: '0 2px',
                                borderRadius: '2px',
                            },
                        }}
                    >
                        {highlightText(highlight, query)}
                    </Typography>
                ))
            ) : (
                <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{
                        '& mark': {
                            backgroundColor: 'yellow',
                            padding: '0 2px',
                            borderRadius: '2px',
                        },
                    }}
                >
                    {highlightText(text, query)}
                </Typography>
            )}
        </Box>
    )
}
