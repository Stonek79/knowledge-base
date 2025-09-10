export const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return new Intl.DateTimeFormat('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
};

// Универсальный парсер: поддерживает '14d', '30m', '3600' и т.п.
export const parseDurationToSeconds = (input: string): number => {
    const v = String(input).trim();
    const m = v.match(/^(\d+)\s*([smhd])?$/i);
    if (!m) return Number(v) || 0;
    const n = Number(m[1]);
    const u = (m[2] || 's').toLowerCase();
    switch (u) {
        case 's':
            return n;
        case 'm':
            return n * 60;
        case 'h':
            return n * 60 * 60;
        case 'd':
            return n * 60 * 60 * 24;
        default:
            return n;
    }
};
