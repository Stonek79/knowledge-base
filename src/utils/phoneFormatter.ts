/**
 * Интеллектуально форматирует строку с номером телефона в формат +7-XXX-XXX-XX-XX
 * в реальном времени по мере ввода.
 *
 * Функция делает следующее:
 * 1. Оставляет во вводе только цифры.
 * 2. Постепенно применяет маску форматирования к неполному номеру.
 * 3. Корректно обрабатывает код страны '7' или '8'.
 *
 * @param value - Входящая строка из поля ввода.
 * @returns - Отформатированная строка.
 */
export function formatPhoneNumber(value: string): string {
    if (!value) {
        return '';
    }

    // 1. Оставляем только цифры
    const cleaned = value.replace(/\D/g, '');

    // Ограничиваем максимальную длину, чтобы избежать переполнения
    const maxLength = 11;
    let number = cleaned.slice(0, maxLength);

    // 2. Если первая цифра '7' или '8', считаем ее кодом страны
    if (number.length > 0) {
        if (number[0] === '8') {
            number = '7' + number.slice(1);
        }
        if (number[0] !== '7') {
            number = '7' + number;
        }
    }

    // 3. Применяем маску по частям
    const match = number.match(
        /^(\d{1})?(\d{1,3})?(\d{1,3})?(\d{1,2})?(\d{1,2})?$/
    );

    if (!match) {
        return `+${number}`;
    }

    let formatted = '+';
    // match[0] - вся строка, match[1]... - группы
    if (match[1]) {
        formatted += match[1];
    }
    if (match[2]) {
        formatted += `-${match[2]}`;
    }
    if (match[3]) {
        formatted += `-${match[3]}`;
    }
    if (match[4]) {
        formatted += `-${match[4]}`;
    }
    if (match[5]) {
        formatted += `-${match[5]}`;
    }

    return formatted;
}

/**
 * Форматирует городской номер телефона по маске 8-(XXX)-XXX-XX-XX.
 * Игнорирует первую введенную цифру, всегда подставляя '8'.
 *
 * @param value - Входящая строка из поля ввода.
 * @returns - Отформатированная строка.
 */
export function formatCityPhone(value: string): string {
    if (!value) {
        return '';
    }

    // 1. Оставляем только цифры
    const cleaned = value.replace(/\D/g, '');

    // 2. Игнорируем первую цифру (код страны), так как формат фиксирован с '8'
    //    и берем следующие 10 цифр.
    const digits = cleaned.startsWith('8') ? cleaned.substring(1) : cleaned;
    const number = digits.slice(0, 10);

    // 3. Собираем отформатированную строку по частям
    const parts: string[] = [];
    if (number.length > 0) {
        parts.push(`(${number.slice(0, 3)}`);
    }
    if (number.length > 3) {
        // Закрываем скобку, только если она была открыта
        if (parts[0] && parts[0].length === 4) parts[0] += ')';
        parts.push(`-${number.slice(3, 6)}`);
    }
    if (number.length > 6) {
        parts.push(`-${number.slice(6, 8)}`);
    }
    if (number.length > 8) {
        parts.push(`-${number.slice(8, 10)}`);
    }

    return `8-${parts.join('')}`;
}

/**
 * Форматирует внутренний номер телефона по маскам XX-XX или XXX-XX-XX
 * Адаптируется к длине вводимого номера.
 *
 * @param value - Входящая строка из поля ввода.
 * @returns - Отформатированная строка.
 */
export function formatInternalPhone(value: string): string {
    if (!value) {
        return '';
    }

    // 1. Оставляем только цифры
    const cleaned = value.replace(/\D/g, '');

    // Определяем максимальную длину
    const maxLength = 7;
    const number = cleaned.slice(0, maxLength);

    // Если цифр 4 или меньше, используем формат XX-XX
    if (number.length <= 4) {
        const match = number.match(/^(\d{1,2})?(\d{1,2})?$/);
        if (!match) return number; // На случай непредвиденной ситуации
        // Соединяем группы, которые не пустые, через дефис
        return [match[1], match[2]].filter(Boolean).join('-');
    }
    // Если цифр больше 4, используем формат XXX-XX-XX
    else {
        const match = number.match(/^(\d{1,3})?(\d{1,2})?(\d{1,2})?$/);
        if (!match) return number;
        return [match[1], match[2], match[3]].filter(Boolean).join('-');
    }
}
