import { Box, Typography } from '@mui/material'

interface SearchHighlightProps {
    text: string
    highlights: string[]
    query: string
}

/**
 * Экранирует специальные символы в строке для безопасного использования в регулярном выражении.
 * @param str - Исходная строка.
 * @returns Экранированная строка.
 */
function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function SearchHighlight({
    text,
    highlights,
    query,
}: SearchHighlightProps) {
    const highlightText = (textToHighlight: string, queryToFind: string) => {
        // 1. Очищаем запрос от "мусорных" символов, оставляя буквы, цифры и пробелы
        const sanitizedQuery = queryToFind
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .trim()

        if (!sanitizedQuery) return textToHighlight

        // 2. Разбиваем очищенный запрос на отдельные слова (токены) для поиска
        const searchTokens = sanitizedQuery.split(/\s+/).filter(Boolean)

        if (searchTokens.length === 0) return textToHighlight

        // 3. Создаем единое регулярное выражение, которое ищет любое из слов-токенов
        const escapedTokens = searchTokens.map(escapeRegExp)
        const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi')

        // 4. Разбиваем текст на части по найденным совпадениям
        const parts = textToHighlight.split(regex)

        return (
            <>
                {parts.map((part, index) => {
                    const key = `${part}-${index}`
                    // Проверяем, является ли текущая часть одним из искомых слов (без учета регистра)
                    const isMatch = searchTokens.some(
                        token => token.toLowerCase() === part.toLowerCase()
                    )
                    return isMatch ? <mark key={key}>{part}</mark> : part
                })}
            </>
        )
    }

    return (
        <Box>
            {highlights?.length > 0 ? (
                highlights?.map((highlight, index) => (
                    <Typography
                        // biome-ignore lint/suspicious/noArrayIndexKey: .
                        key={`${highlight}-${index}`}
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
