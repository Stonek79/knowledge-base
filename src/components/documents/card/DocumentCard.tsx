import { MoreVert as MoreIcon } from '@mui/icons-material';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import { IconButton } from '@mui/material';

import { DocumentWithAuthor } from '@/lib/types/document';

interface DocumentCardProps {
    document: DocumentWithAuthor;
    handleMenuOpen: (
        event: React.MouseEvent<HTMLElement>,
        document: DocumentWithAuthor
    ) => void;
}
export const DocumentCard = ({
    document,
    handleMenuOpen,
}: DocumentCardProps) => {

    return (
        <Card
            key={document.id}
            sx={{ mb: 2, width: '100%' }}
        >
            <CardContent>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <Typography variant='h6' gutterBottom>
                            {document.title}
                        </Typography>
                        <Typography
                            variant='body2'
                            color='text.secondary'
                            gutterBottom
                        >
                            {document.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            {document.categories.map(cat => (
                                <Chip
                                    key={cat.category.id}
                                    label={cat.category.name}
                                    size='small'
                                    color='primary'
                                    variant='outlined'
                                />
                            ))}
                            <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
                            >
                                <span>Автор: {document.author.username}</span>
                                <span>Создан:</span>
                                <span>
                                    {new Date(
                                        document.createdAt
                                    ).toLocaleDateString('ru-RU')}
                                </span>
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        size='small'
                        onClick={e => handleMenuOpen(e, document)}
                    >
                        <MoreIcon />
                    </IconButton>
                </Box>
            </CardContent>
        </Card>
    );
};
