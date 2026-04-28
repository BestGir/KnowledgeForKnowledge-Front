const currentYearValue = new Date().getFullYear();

export const currentYear = currentYearValue;
export const maxBirthDate = new Date().toISOString().slice(0, 10);
export const minBirthDate = `${currentYearValue - 120}-01-01`;
export const maxEducationYear = currentYearValue + 10;
export const maxProfileFullNameLength = 150;
export const maxProfileContactLength = 255;
export const maxProfileDescriptionLength = 3000;
export const maxProfilePhotoFileSize = 5 * 1024 * 1024;
export const maxProofFileSize = 10 * 1024 * 1024;
export const maxProofsPerSkill = 3;
export const verificationRequestTypeSkill = 0;
export const verificationStatusPending = 0;
export const verificationStatusApproved = 1;
export const verificationStatusRejected = 2;

const allowedProfilePhotoMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedProfilePhotoExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
const allowedProofMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const allowedProofExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

export const emptySkillRequestsPage = {
  items: [],
  page: 1,
  pageSize: 0,
  totalCount: 0,
  totalPages: 0,
};

export function validateBirthDate(dateValue: string) {
  if (!dateValue) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return 'Дата рождения должна быть указана в календаре, без ручного текста.';
  }

  const parsedDate = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Дата рождения заполнена некорректно.';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsedDate >= today) {
    return 'Дата рождения должна быть раньше сегодняшнего дня.';
  }

  const earliestAllowedDate = new Date(`${currentYearValue - 120}-01-01T00:00:00`);

  if (parsedDate < earliestAllowedDate) {
    return 'Проверь год рождения: дата выглядит слишком ранней.';
  }

  return null;
}

export function validateEducationYear(yearValue: string) {
  if (!yearValue.trim()) {
    return null;
  }

  if (!/^\d{4}$/.test(yearValue.trim())) {
    return 'Год окончания нужно указывать четырьмя цифрами.';
  }

  const yearNumber = Number(yearValue);

  if (yearNumber < currentYearValue - 120 || yearNumber > maxEducationYear) {
    return `Год окончания должен быть между ${currentYearValue - 120} и ${maxEducationYear}.`;
  }

  return null;
}

export function validateProfilePhotoFile(photoFile: File | null) {
  if (!photoFile) {
    return null;
  }

  if (photoFile.size > maxProfilePhotoFileSize) {
    return `Фото профиля не должно превышать ${Math.round(maxProfilePhotoFileSize / 1024 / 1024)} МБ.`;
  }

  const normalizedType = photoFile.type.toLowerCase();
  const normalizedName = photoFile.name.toLowerCase();
  const hasAllowedExtension = allowedProfilePhotoExtensions.some((extension) => normalizedName.endsWith(extension));
  const hasAllowedMimeType = normalizedType ? allowedProfilePhotoMimeTypes.includes(normalizedType) : false;

  if (!hasAllowedMimeType && !hasAllowedExtension) {
    return 'Для фото профиля подходят только JPEG, PNG или WebP.';
  }

  return null;
}

export function validateSelectedProofFiles(files: File[], existingProofsCount: number) {
  if (files.length === 0) {
    return null;
  }

  if (existingProofsCount + files.length > maxProofsPerSkill) {
    return `К одному навыку можно приложить не более ${maxProofsPerSkill} файлов.`;
  }

  if (files.length > maxProofsPerSkill) {
    return `За один раз можно выбрать не более ${maxProofsPerSkill} файлов.`;
  }

  for (const proofFile of files) {
    if (proofFile.size > maxProofFileSize) {
      return `Размер приложения ${proofFile.name} не должен превышать ${Math.round(maxProofFileSize / 1024 / 1024)} МБ.`;
    }

    const normalizedType = proofFile.type.toLowerCase();
    const normalizedName = proofFile.name.toLowerCase();
    const hasAllowedExtension = allowedProofExtensions.some((extension) => normalizedName.endsWith(extension));
    const hasAllowedMimeType = normalizedType ? allowedProofMimeTypes.includes(normalizedType) : false;

    if (!hasAllowedMimeType && !hasAllowedExtension) {
      return `Для приложения ${proofFile.name} подходят только JPEG, PNG, WebP или PDF.`;
    }
  }

  return null;
}

export function getVerificationTone(status: number | null | undefined) {
  if (status === verificationStatusApproved) {
    return 'success' as const;
  }

  if (status === verificationStatusRejected) {
    return 'danger' as const;
  }

  if (status === verificationStatusPending) {
    return 'warning' as const;
  }

  return 'neutral' as const;
}
