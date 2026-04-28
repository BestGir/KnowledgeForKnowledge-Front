import {
  applicationStatusLabels,
  requestStatusLabels,
  skillEpithetLabels,
  skillLevelLabels,
  verificationRequestTypeLabels,
  verificationStatusLabels,
  type LabelMap,
} from './types';

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Не указано';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') ? 'short' : undefined,
  }).format(new Date(value));
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return 'Не указано';
  }

  const datePart = value.includes('T') ? value.slice(0, 10) : value;
  const parts = datePart.split('-').map((part) => Number(part));

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return 'Не указано';
  }

  const [year, month, day] = parts;

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
  }).format(new Date(year, month - 1, day));
}

export function formatEnum(labels: LabelMap, value: number | null | undefined, fallback = 'Не указано') {
  if (value === null || value === undefined) {
    return fallback;
  }

  return labels[value] ?? fallback;
}

export function formatSkillEpithet(value: number | null | undefined) {
  return formatEnum(skillEpithetLabels, value);
}

export function formatRequestStatus(value: number | null | undefined) {
  return formatEnum(requestStatusLabels, value);
}

export function formatApplicationStatus(value: number | null | undefined) {
  return formatEnum(applicationStatusLabels, value);
}

export function formatVerificationStatus(value: number | null | undefined) {
  return formatEnum(verificationStatusLabels, value);
}

export function formatVerificationRequestType(value: number | null | undefined) {
  return formatEnum(verificationRequestTypeLabels, value);
}

export function formatSkillLevel(value: number | null | undefined) {
  return formatEnum(skillLevelLabels, value);
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
