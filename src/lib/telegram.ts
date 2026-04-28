export type TelegramParseResult =
  | {
      botReadyValue: null;
      displayValue: '';
      kind: 'empty';
      link: null;
      normalized: '';
      raw: string;
    }
  | {
      botReadyValue: string;
      displayValue: string;
      kind: 'chat-id';
      link: null;
      normalized: string;
      raw: string;
    }
  | {
      botReadyValue: null;
      displayValue: string;
      kind: 'username';
      link: string;
      normalized: string;
      raw: string;
    }
  | {
      botReadyValue: null;
      displayValue: string;
      kind: 'invalid';
      link: null;
      normalized: string;
      raw: string;
    };

const telegramChatIdPattern = /^-?\d{5,20}$/;
const telegramUsernamePattern = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;

function extractTelegramUsernameCandidate(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  if (/^tg:\/\//i.test(trimmedValue)) {
    try {
      const url = new URL(trimmedValue);
      if (url.hostname.toLowerCase() === 'resolve') {
        return url.searchParams.get('domain')?.trim() ?? '';
      }
    } catch {
      return '';
    }
  }

  const withoutProtocol = trimmedValue.replace(/^https?:\/\//i, '');
  const telegramLinkMatch = withoutProtocol.match(/^(?:www\.)?(?:t(?:elegram)?\.me|telegram\.me)\/(.+)$/i);

  if (telegramLinkMatch?.[1]) {
    return telegramLinkMatch[1].split(/[/?#]/, 1)[0]?.replace(/^@/, '') ?? '';
  }

  return trimmedValue.replace(/^@/, '');
}

export function parseTelegramInput(value: string): TelegramParseResult {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      botReadyValue: null,
      displayValue: '',
      kind: 'empty',
      link: null,
      normalized: '',
      raw: value,
    };
  }

  if (telegramChatIdPattern.test(trimmedValue)) {
    return {
      botReadyValue: trimmedValue,
      displayValue: trimmedValue,
      kind: 'chat-id',
      link: null,
      normalized: trimmedValue,
      raw: value,
    };
  }

  const usernameCandidate = extractTelegramUsernameCandidate(trimmedValue);

  if (telegramUsernamePattern.test(usernameCandidate)) {
    return {
      botReadyValue: null,
      displayValue: `@${usernameCandidate}`,
      kind: 'username',
      link: `https://t.me/${usernameCandidate}`,
      normalized: `@${usernameCandidate}`,
      raw: value,
    };
  }

  return {
    botReadyValue: null,
    displayValue: trimmedValue,
    kind: 'invalid',
    link: null,
    normalized: trimmedValue,
    raw: value,
  };
}

export function normalizeTelegramContact(value: string) {
  const parsedValue = parseTelegramInput(value);

  if (parsedValue.kind === 'username') {
    return parsedValue.link;
  }

  if (parsedValue.kind === 'chat-id') {
    return parsedValue.normalized;
  }

  if (parsedValue.kind === 'empty') {
    return '';
  }

  return value.trim();
}
