'use client'

import {
    Download as DownloadIcon,
    Edit as EditIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material'
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Skeleton,
    Typography,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { DOCUMENT_EDIT_PAGE_PATH, DOCUMENTS_BASE_PATH } from '@/constants/api'
import { USER_ROLES } from '@/constants/user'
import { useDocumentDelete } from '@/lib/hooks/documents/useDocumentDelete'
import { useDocuments } from '@/lib/hooks/documents/useDocuments'
import { useRecentDocuments } from '@/lib/hooks/documents/useRecentDocuments'
import { useAuth } from '@/lib/hooks/useAuth'
import type { DocumentWithAuthor } from '@/lib/types/document'

import { DocumentCard } from '../card/DocumentCard'
import { DownloadButtons } from '../download/DownloadButtons'

export function FilteredList({ categoryId }: { categoryId: string }) {
    const { user } = useAuth()
    const router = useRouter()
    const { documents, isLoading } = useDocuments({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        categoryIds: [categoryId],
    })

    const [open, setOpen] = useState(false)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [selectedDocument, setSelectedDocument] =
        useState<DocumentWithAuthor | null>(null)

    const { deleteDocument, isDeleting, deleteError } = useDocumentDelete()
    const { removeRecentDocument } = useRecentDocuments()
    const isGuest = user?.role === USER_ROLES.GUEST

    const handleMenuOpen = (
        event: React.MouseEvent<HTMLElement>,
        document: DocumentWithAuthor
    ) => {
        setAnchorEl(event.currentTarget)
        setSelectedDocument(document)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
        setSelectedDocument(null)
    }

    const handleDocumentAction = async (action: string) => {
        if (!selectedDocument) return
        if (action === 'view') {
            router.push(`${DOCUMENTS_BASE_PATH}/${selectedDocument.id}`)
        }

        if (action === 'delete') {
            try {
                await deleteDocument(selectedDocument.id)

                removeRecentDocument(selectedDocument.id)
                if (!isDeleting && !deleteError) handleMenuClose()
            } catch (e) {
                console.log(e)
                if (e instanceof Error) throw Error(e.message)
            }
        }

        if (action === 'download') {
            setOpen(true)
        }

        if (action === 'edit') {
            router.push(`${DOCUMENT_EDIT_PAGE_PATH(selectedDocument.id)}`)
        }
    }

    if (isLoading) {
        return (
            <>
                <Skeleton variant='rectangular' height={100} />
                <Skeleton variant='rectangular' height={100} />
                <Skeleton variant='rectangular' height={100} />
                <Skeleton variant='rectangular' height={100} />
            </>
        )
    }

    if (documents.length === 0) {
        return <Typography>Документы не найдены</Typography>
    }

    return (
        <Box sx={{ width: '100%' }}>
            {documents.map(document => (
                <DocumentCard
                    key={document.id}
                    document={document}
                    handleMenuOpen={handleMenuOpen}
                />
            ))}

            {/* Меню действий с документом */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => handleDocumentAction('view')}>
                    <ListItemIcon>
                        <ViewIcon fontSize='small' />
                    </ListItemIcon>
                    <ListItemText>Просмотр</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleDocumentAction('download')}>
                    <ListItemIcon>
                        <DownloadIcon fontSize='small' />
                    </ListItemIcon>
                    <ListItemText>Скачать</ListItemText>
                </MenuItem>
                {!isGuest && (
                    <MenuItem onClick={() => handleDocumentAction('edit')}>
                        <ListItemIcon>
                            <EditIcon fontSize='small' />
                        </ListItemIcon>
                        <ListItemText>Редактировать</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            {/*Окно загрузки файла*/}
            {selectedDocument && (
                <Dialog open={open} onClose={() => setOpen(false)}>
                    <DialogTitle>Выбери фармат загружаемого файла:</DialogTitle>
                    <DialogContent>
                        <Box>
                            <Typography sx={{ mb: 2 }} component='h5' noWrap>
                                {selectedDocument?.title}
                            </Typography>
                            <DownloadButtons
                                documentId={selectedDocument?.id}
                                setOpen={setOpen}
                            />
                        </Box>
                    </DialogContent>
                </Dialog>
            )}
        </Box>
    )
}
