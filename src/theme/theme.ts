'use client';

import { Roboto } from 'next/font/google';

import { type ThemeOptions, createTheme } from '@mui/material/styles';

// 1. Определяем структуру наших кастомных цветов.
interface ChatColors {
    myMessageBackground: string;
    otherMessageBackground: string;
    chatBackground: string;
}

// 2. Расширяем интерфейсы Theme и ThemeOptions, добавляя `chat` в корень.
declare module '@mui/material/styles' {
    interface Theme {
        chat: ChatColors;
    }
    interface ThemeOptions {
        chat?: ChatColors;
    }

    interface PaletteOptions {
        msgOutBg?: string;
        msgInBg?: string;
    }

    interface Palette {
        msgOutBg: string;
        msgInBg: string;
    }
}

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
});

const commonSettings: ThemeOptions = {
    typography: {
        fontFamily: roboto.style.fontFamily,
    },
    components: {
        MuiButtonBase: {
            defaultProps: {
                disableRipple: true,
            },
        },
    },
};

// 3. Создаем темы, добавляя объект `chat` на верхний уровень.
export const lightTheme = createTheme({
    ...commonSettings,
    palette: {
        mode: 'light',
        primary: { main: '#1976d2' },
        background: {
            default: '#f0f2f5',
            paper: '#ffffff',
        },
    },
    // Наши кастомные цвета теперь находятся здесь, в корне темы.
    chat: {
        myMessageBackground: '#BEE3FF',
        otherMessageBackground: '#FFFFFF',
        chatBackground: '#ECE5DD',
    },
});

export const darkTheme = createTheme({
    ...commonSettings,
    palette: {
        mode: 'dark',
        primary: { main: '#90caf9' },
        background: {
            default: '#0a0a0a',
            paper: '#1a1a1a',
        },
    },
    // Наши кастомные цвета теперь находятся здесь, в корне темы.
    chat: {
        myMessageBackground: '#4A4AFF',
        otherMessageBackground: '#212121',
        chatBackground: '#0E1621',
    },
});
