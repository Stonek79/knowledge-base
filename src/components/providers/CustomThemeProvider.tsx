'use client'

import { CssBaseline, type PaletteMode } from '@mui/material'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

import { darkTheme, lightTheme } from '@/theme/theme'

interface ThemeContextType {
    mode: PaletteMode
    toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
    undefined
)

export const CustomThemeProvider = ({
    children,
}: {
    children: React.ReactNode
}) => {
    const [mode, setMode] = useState<PaletteMode>('dark')

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as PaletteMode | null
        if (storedTheme) {
            setMode(storedTheme)
        }
    }, [])

    const toggleTheme = useCallback(() => {
        setMode(prevMode => {
            const newMode = prevMode === 'light' ? 'dark' : 'light'
            localStorage.setItem('theme', newMode)
            return newMode
        })
    }, [])

    // 2. Выбираем нужную тему в зависимости от `mode`
    const theme = useMemo(
        () => (mode === 'light' ? lightTheme : darkTheme),
        [mode]
    )

    const contextValue = useMemo(
        () => ({ mode, toggleTheme }),
        [mode, toggleTheme]
    )

    return (
        <AppRouterCacheProvider>
            <ThemeContext.Provider value={contextValue}>
                <MuiThemeProvider theme={theme}>
                    <CssBaseline />
                    {children}
                </MuiThemeProvider>
            </ThemeContext.Provider>
        </AppRouterCacheProvider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a CustomThemeProvider')
    }
    return context
}
