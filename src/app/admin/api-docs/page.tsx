import { Box, Typography } from '@mui/material'
import { notFound } from 'next/navigation'
import ApiDocsPage from '@/components/admin/api-docs/ApiDocsPage'
import { openApiService } from '@/lib/services/OpenAPIService'

// This is a Server Component
export default async function Page() {
    // В продакшене эта страница не будет доступна
    if (process.env.NODE_ENV === 'production') {
        notFound()
    }

    // Generate the spec directly on the server
    const spec = openApiService.generateSpec()

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant='h4' gutterBottom>
                API Documentation (Scalar)
            </Typography>
            {/* Pass the server-generated spec to the client component */}
            <ApiDocsPage spec={spec} />
        </Box>
    )
}
