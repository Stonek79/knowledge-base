'use client'

import { SWRConfig } from 'swr'

import { CustomThemeProvider } from './CustomThemeProvider'

export function RootProvider({ children }: { children: React.ReactNode }) {
    return (
        <SWRConfig
            value={{
                revalidateOnFocus: false,
                revalidateOnReconnect: true,
                errorRetryCount: 3,
            }}
        >
            <CustomThemeProvider>
                <main className='h-screen'>{children}</main>
            </CustomThemeProvider>
        </SWRConfig>
    )
}
