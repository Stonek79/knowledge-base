import DOMPurify from 'dompurify';

import { Box, Typography } from '@mui/material';

interface SearchHighlightProps {
    text: string;
    highlights: string[];
    query: string;
}

export function SearchHighlight({
    text,
    highlights,
    query,
}: SearchHighlightProps) {
    const highlightText = (text: string, query: string) => {
        if (!query) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    };

    return (
        <Box>
            {highlights?.length > 0 ? (
                highlights?.map((highlight, index) => (
                    <Typography
                        key={index}
                        variant='body2'
                        color='text.secondary'
                        dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(
                                highlightText(highlight, query)
                            ),
                        }}
                        sx={{
                            '& mark': {
                                backgroundColor: 'yellow',
                                padding: '0 2px',
                                borderRadius: '2px',
                            },
                        }}
                    />
                ))
            ) : (
                <Typography
                    variant='body2'
                    color='text.secondary'
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(highlightText(text, query)),
                    }}
                    sx={{
                        '& mark': {
                            backgroundColor: 'yellow',
                            padding: '0 2px',
                            borderRadius: '2px',
                        },
                    }}
                />
            )}
        </Box>
    );
}
