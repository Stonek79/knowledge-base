'use client';

import { useRouter } from 'next/navigation';

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
} from '@mui/material';

import { DOCUMENTS_PAGE_PATH } from '@/constants/api';
import { useRecentDocuments } from '@/lib/hooks/documents/useRecentDocuments';
import { DocumentWithAuthor, SearchResult } from '@/lib/types/document';

export function RecentDocuments() {
    const { recentDocuments } = useRecentDocuments();
    const router = useRouter();
    const handleDocumentClick = (
        document: DocumentWithAuthor | SearchResult
    ) => {
        router.push(`${DOCUMENTS_PAGE_PATH}/${document.id}`);
    };

    if (recentDocuments.length === 0) {
        return (
            <Card>
                <CardContent>
                    <Typography variant='h6' gutterBottom>
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
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant='h6' gutterBottom>
                    Недавние документы
                </Typography>
                <List>
                    {recentDocuments.slice(0, 5).map(document => (
                        <ListItem key={document?.id} disablePadding>
                            <ListItemButton
                                onClick={() => handleDocumentClick(document)}
                            >
                                <ListItemIcon>
                                    <FileIcon />
                                </ListItemIcon>
                                <ListItemText primary={document?.title} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </CardContent>
        </Card>
    );
}
