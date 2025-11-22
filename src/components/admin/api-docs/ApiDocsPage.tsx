'use client'

import { useTheme } from '@mui/material'
import { ApiReferenceReact } from '@scalar/api-reference-react'
import type { OpenAPIObject } from 'openapi3-ts/oas31'
import '@scalar/api-reference-react/style.css'

interface ApiDocsPageProps {
    spec: OpenAPIObject
}

export default function ApiDocsPage({ spec }: ApiDocsPageProps) {
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'

    return (
        <ApiReferenceReact
            configuration={{
                content: spec,
                theme: isDark ? 'purple' : 'default',
            }}
        />
    )
}
