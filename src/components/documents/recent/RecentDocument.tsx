'use client';


import { Description as FileIcon } from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    useTheme,
} from '@mui/material';
import { useRouter } from 'next/navigation';

import { DOCUMENTS_PAGE_PATH } from '@/constants/api';
import { useRecentDocuments } from '@/lib/hooks/documents/useRecentDocuments';
import { DocumentWithAuthor, SearchResult } from '@/lib/types/document';

export function RecentDocuments() {
    const { recentDocuments } = useRecentDocuments();
    const router = useRouter();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const handleDocumentClick = (
        document: DocumentWithAuthor | SearchResult
    ) => {
        router.push(`${DOCUMENTS_PAGE_PATH}/${document.id}`);
    };

    if (recentDocuments.length === 0) {
        return (
            <Card
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                }}
            >
                <CardContent
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    <Typography
                        variant='h6'
                        gutterBottom
                        sx={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 1,
                            bgcolor: 'background.paper',
                            py: 1,
                        }}
                    >
                        Недавние документы
                    </Typography>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <FileIcon
                            sx={{ fontSize: 48, color: 'grey.300', mb: 2 }}
                        />
                        <Typography color='text.secondary'>
                            Вы еще не просматривали документы
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            sx={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
            }}
        >
            <CardContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                    p: 1,
                }}
            >
                <Typography
                    variant='h6'
                    gutterBottom
                    sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        bgcolor: 'background.paper',
                        py: 1,
                    }}
                >
                    Недавние документы
                </Typography>
                <List sx={{ flex: 1, overflow: 'auto', minHeight: 0, pr: 1 }}>
                    {recentDocuments.slice(0, 5).map(document => (
                        <ListItem
                            key={document?.id}
                            disablePadding
                            sx={{
                                gap: 1,
                                borderRadius: 1,
                                mb: 0.3,
                                backgroundColor: isDark ? '#1a1a1a' : '#f0f2f5'
                            }}
                        >
                            <ListItemButton
                                onClick={() => handleDocumentClick(document)}
                            >
                                <ListItemIcon>
                                    <FileIcon
                                        sx={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                        }}
                                    />
                                </ListItemIcon>
                                <Typography variant='body2'>
                                    {document?.title}
                                </Typography>
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </CardContent>
        </Card>
    );
}
