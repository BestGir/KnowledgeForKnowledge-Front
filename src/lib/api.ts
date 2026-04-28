import type {
  Account,
  ApplicationItem,
  DealItem,
  EducationItem,
  LoginResponse,
  MatchItem,
  NotificationFeed,
  PagedResult,
  ProofItem,
  ReviewFeed,
  Session,
  Skill,
  SkillOffer,
  SkillRequest,
  UserProfile,
  UserSkill,
  VerificationRequestItem,
} from './types';

type JsonRecord = Record<string, unknown>;

interface RequestOptions {
  body?: BodyInit | JsonRecord;
  method?: 'DELETE' | 'GET' | 'POST' | 'PUT';
  token?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || '/api';
const API_ORIGIN = new URL(API_BASE_URL, window.location.origin).origin;

export class ApiError extends Error {
  errors?: Record<string, string[]>;
  status: number;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectRecord(value: unknown) {
  if (!isRecord(value)) {
    throw new Error('Сервер вернул неожиданный формат данных.');
  }

  return value;
}

function readValue<T>(source: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    if (key in source) {
      return source[key] as T;
    }
  }

  throw new Error(`В ответе сервера не хватает поля ${keys[0]}.`);
}

function readOptionalValue<T>(source: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    if (key in source) {
      return source[key] as T;
    }
  }

  return undefined;
}

function readString(source: JsonRecord, ...keys: string[]) {
  return String(readValue(source, ...keys));
}

function readNullableString(source: JsonRecord, ...keys: string[]) {
  const value = readOptionalValue<unknown>(source, ...keys);
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return String(value);
}

function readNumber(source: JsonRecord, ...keys: string[]) {
  return Number(readValue(source, ...keys));
}

function readNumberOr(source: JsonRecord, fallback: number, ...keys: string[]) {
  const value = readOptionalValue<unknown>(source, ...keys);
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return Number(value);
}

function readBoolean(source: JsonRecord, ...keys: string[]) {
  return Boolean(readValue(source, ...keys));
}

function readArray(source: JsonRecord, ...keys: string[]) {
  const value = readValue<unknown>(source, ...keys);
  return Array.isArray(value) ? value : [];
}

function withQuery(path: string, query: Record<string, boolean | number | string | undefined | null>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    params.set(key, String(value));
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function buildUrl(path: string) {
  const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function normalizePaged<T>(payload: unknown, itemMapper: (raw: unknown) => T): PagedResult<T> {
  const source = expectRecord(payload);

  return {
    items: readArray(source, 'items').map(itemMapper),
    page: readNumber(source, 'page'),
    pageSize: readNumber(source, 'pageSize'),
    totalCount: readNumber(source, 'totalCount'),
    totalPages: readNumber(source, 'totalPages'),
  };
}

function normalizeSession(payload: unknown): Session {
  const source = expectRecord(payload);

  return {
    accountId: readString(source, 'accountId', 'accountID'),
    isAdmin: readBoolean(source, 'isAdmin'),
    token: readString(source, 'token'),
  };
}

function normalizeLoginResponse(payload: unknown): LoginResponse {
  const source = expectRecord(payload);

    return {
      accountId: readString(source, 'accountId', 'accountID'),
      isAdmin: readBoolean(source, 'isAdmin'),
      requiresOtp: readBoolean(source, 'requiresOtp'),
      requiresTelegramLink: Boolean(readOptionalValue(source, 'requiresTelegramLink')),
      sessionId: readNullableString(source, 'sessionId'),
      telegramLinkToken: readNullableString(source, 'telegramLinkToken'),
      token: readNullableString(source, 'token') ?? '',
    };
  }

function normalizeAccount(payload: unknown): Account {
  const source = expectRecord(payload);

  return {
    accountId: readString(source, 'accountId', 'accountID'),
    createdAt: readString(source, 'createdAt'),
    isActive: readBoolean(source, 'isActive'),
    isAdmin: readBoolean(source, 'isAdmin'),
    login: readString(source, 'login'),
    telegramId: readNullableString(source, 'telegramId', 'telegramID'),
  };
}

function normalizeSkill(payload: unknown): Skill {
  const source = expectRecord(payload);

  return {
    epithet: readNumber(source, 'epithet'),
    skillId: readString(source, 'skillId', 'skillID'),
    skillName: readString(source, 'skillName'),
  };
}

function normalizeSkillOffer(payload: unknown): SkillOffer {
  const source = expectRecord(payload);

  return {
    accountId: readString(source, 'accountId', 'accountID'),
    authorName: readString(source, 'authorName'),
    authorPhotoUrl: readNullableString(source, 'authorPhotoUrl', 'authorPhotoURL'),
    details: readNullableString(source, 'details'),
    isActive: readBoolean(source, 'isActive'),
    offerId: readString(source, 'offerId', 'offerID'),
    skillEpithet: readNumberOr(source, 9, 'skillEpithet'),
    skillId: readString(source, 'skillId', 'skillID'),
    skillName: readString(source, 'skillName'),
    title: readString(source, 'title'),
  };
}

function normalizeSkillRequest(payload: unknown): SkillRequest {
  const source = expectRecord(payload);

  return {
    accountId: readString(source, 'accountId', 'accountID'),
    authorName: readString(source, 'authorName'),
    authorPhotoUrl: readNullableString(source, 'authorPhotoUrl', 'authorPhotoURL'),
    details: readNullableString(source, 'details'),
    requestId: readString(source, 'requestId', 'requestID'),
    skillEpithet: readNumberOr(source, 9, 'skillEpithet'),
    skillId: readString(source, 'skillId', 'skillID'),
    skillName: readString(source, 'skillName'),
    status: readNumber(source, 'status'),
    title: readString(source, 'title'),
  };
}

function normalizeProfile(payload: unknown): UserProfile {
  const source = expectRecord(payload);

  return {
    accountId: readString(source, 'accountId', 'accountID'),
    contactInfo: readNullableString(source, 'contactInfo'),
    dateOfBirth: readNullableString(source, 'dateOfBirth'),
    description: readNullableString(source, 'description'),
    fullName: readString(source, 'fullName'),
    hasProfile: readBoolean(source, 'hasProfile'),
    isActive: readBoolean(source, 'isActive'),
    lastSeenOnline: readNullableString(source, 'lastSeenOnline'),
    photoUrl: readNullableString(source, 'photoUrl', 'photoURL'),
  };
}

function normalizeApplication(payload: unknown): ApplicationItem {
  const source = expectRecord(payload);

  return {
    applicantId: readString(source, 'applicantId', 'applicantID'),
    applicantName: readString(source, 'applicantName'),
    applicantTelegramId: readNullableString(source, 'applicantTelegramId', 'applicantTelegramID'),
    applicationId: readString(source, 'applicationId', 'applicationID'),
    createdAt: readString(source, 'createdAt'),
    message: readNullableString(source, 'message'),
    offerId: readNullableString(source, 'offerId', 'offerID'),
    offerTitle: readNullableString(source, 'offerTitle'),
    requestTitle: readNullableString(source, 'requestTitle'),
    skillName: readNullableString(source, 'skillName'),
    skillRequestId: readNullableString(source, 'skillRequestId', 'skillRequestID'),
    status: readNumber(source, 'status'),
  };
}

function normalizeDeal(payload: unknown): DealItem {
  const source = expectRecord(payload);

  return {
    applicationId: readString(source, 'applicationId', 'applicationID'),
    completedAt: readNullableString(source, 'completedAt'),
    createdAt: readString(source, 'createdAt'),
    dealId: readString(source, 'dealId', 'dealID'),
    initiatorId: readString(source, 'initiatorId', 'initiatorID'),
    initiatorName: readString(source, 'initiatorName'),
    myReviewExists: readBoolean(source, 'myReviewExists'),
    offerTitle: readNullableString(source, 'offerTitle'),
    partnerId: readString(source, 'partnerId', 'partnerID'),
    partnerName: readString(source, 'partnerName'),
    requestTitle: readNullableString(source, 'requestTitle'),
    status: readString(source, 'status'),
  };
}

function normalizeNotificationFeed(payload: unknown): NotificationFeed {
  const source = expectRecord(payload);

  return {
    items: readArray(source, 'items').map((rawNotification) => {
      const notification = expectRecord(rawNotification);

      return {
        createdAt: readString(notification, 'createdAt'),
        isRead: readBoolean(notification, 'isRead'),
        message: readString(notification, 'message'),
        notificationId: readString(notification, 'notificationId', 'notificationID'),
        relatedEntityId: readNullableString(notification, 'relatedEntityId', 'relatedEntityID'),
        type: readString(notification, 'type'),
      };
    }),
    page: readNumber(source, 'page'),
    pageSize: readNumber(source, 'pageSize'),
    totalCount: readNumber(source, 'totalCount'),
    totalPages: readNumber(source, 'totalPages'),
    unreadCount: readNumber(source, 'unreadCount'),
  };
}

function normalizeMatch(payload: unknown): MatchItem {
  const source = expectRecord(payload);

  return {
    accountId: readString(source, 'accountId', 'accountID'),
    fullName: readString(source, 'fullName'),
    skillsIHaveThatTheyWant: readArray(source, 'skillsIHaveThatTheyWant').map((value) => String(value)),
    skillsTheyHaveThatIWant: readArray(source, 'skillsTheyHaveThatIWant').map((value) => String(value)),
    theirRequests: readArray(source, 'theirRequests').map((rawRequest) => {
      const request = expectRecord(rawRequest);

      return {
        requestId: readString(request, 'requestId', 'requestID'),
        skillName: readString(request, 'skillName'),
        title: readString(request, 'title'),
      };
    }),
  };
}

function normalizeUserSkill(payload: unknown): UserSkill {
  const source = expectRecord(payload);

  return {
    description: readNullableString(source, 'description'),
    epithet: readNumber(source, 'epithet'),
    isVerified: readBoolean(source, 'isVerified'),
    learnedAt: readNullableString(source, 'learnedAt'),
    level: readNumber(source, 'level'),
    skillId: readString(source, 'skillId', 'skillID'),
    skillName: readString(source, 'skillName'),
  };
}

function normalizeEducation(payload: unknown): EducationItem {
  const source = expectRecord(payload);

  return {
    degreeField: readNullableString(source, 'degreeField'),
    educationId: readString(source, 'educationId', 'educationID'),
    institutionName: readString(source, 'institutionName'),
    yearCompleted: (() => {
      const value = readOptionalValue<unknown>(source, 'yearCompleted');
      return value === null || value === undefined ? null : Number(value);
    })(),
  };
}

function normalizeProof(payload: unknown): ProofItem {
  const source = expectRecord(payload);

  return {
    fileUrl: readString(source, 'fileUrl', 'fileURL'),
    isVerified: readBoolean(source, 'isVerified'),
    proofId: readString(source, 'proofId', 'proofID'),
    skillId: readNullableString(source, 'skillId', 'skillID'),
    skillName: readNullableString(source, 'skillName'),
  };
}

function normalizeVerificationRequest(payload: unknown): VerificationRequestItem {
  const source = expectRecord(payload);

  return {
    accountId: readString(source, 'accountId', 'accountID'),
    accountName: readString(source, 'accountName'),
    createdAt: readString(source, 'createdAt'),
    proofFileUrl: readNullableString(source, 'proofFileUrl', 'proofFileURL'),
    proofId: readNullableString(source, 'proofId', 'proofID'),
    requestId: readString(source, 'requestId', 'requestID', 'verificationRequestId', 'verificationRequestID'),
    requestType: readNumber(source, 'requestType'),
    skillId: readNullableString(source, 'skillId', 'skillID'),
    skillLevel: readOptionalValue<unknown>(source, 'skillLevel') === null || readOptionalValue<unknown>(source, 'skillLevel') === undefined
      ? null
      : Number(readOptionalValue<unknown>(source, 'skillLevel')),
    skillName: readNullableString(source, 'skillName'),
    status: readNumber(source, 'status'),
  };
}

function normalizeReviewFeed(payload: unknown): ReviewFeed {
  const source = expectRecord(payload);

  return {
    averageRating: readNumber(source, 'averageRating'),
    items: readArray(source, 'items').map((rawReview) => {
      const review = expectRecord(rawReview);

      return {
        authorId: readString(review, 'authorId', 'authorID'),
        authorName: readString(review, 'authorName'),
        comment: readNullableString(review, 'comment'),
        createdAt: readString(review, 'createdAt'),
        dealId: readString(review, 'dealId', 'dealID'),
        rating: readNumber(review, 'rating'),
        reviewId: readString(review, 'reviewId', 'reviewID'),
        skillId: readNullableString(review, 'skillId', 'skillID'),
        skillName: readNullableString(review, 'skillName'),
      };
    }),
    page: readNumber(source, 'page'),
    pageSize: readNumber(source, 'pageSize'),
    totalCount: readNumber(source, 'totalCount'),
    totalPages: readNumber(source, 'totalPages'),
  };
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  let body: BodyInit | undefined;

  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(buildUrl(path), {
    body,
    headers,
    method: options.method ?? 'GET',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    let message = `Ошибка HTTP ${response.status}`;
    let errors: Record<string, string[]> | undefined;

    if (isRecord(payload)) {
      const rawMessage = readOptionalValue<unknown>(payload, 'message');
      if (typeof rawMessage === 'string' && rawMessage.trim()) {
        message = rawMessage;
      }

      const rawErrors = readOptionalValue<unknown>(payload, 'errors');
      if (isRecord(rawErrors)) {
        errors = Object.fromEntries(
          Object.entries(rawErrors).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.map((entry) => String(entry)) : [String(value)],
          ]),
        );
      }
    } else if (typeof payload === 'string' && payload.trim()) {
      message = payload;
    }

    throw new ApiError(message, response.status, errors);
  }

  return payload as T;
}

export function resolveAssetUrl(path: string | null | undefined) {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return new URL(path, API_ORIGIN).toString();
}

export async function registerAccount(payload: {
  createTelegramLinkToken?: boolean;
  login: string;
  password: string;
  telegramId?: string;
}) {
  const response = await request<unknown>('/accounts', {
    body: payload,
    method: 'POST',
  });

  if (typeof response === 'string') {
    return {
      accountId: response,
      telegramLinkToken: null,
    };
  }

  const source = expectRecord(response);
  return {
    accountId: readString(source, 'accountId', 'accountID'),
    telegramLinkToken: readNullableString(source, 'telegramLinkToken'),
  };
}

export async function login(payload: { login: string; password: string; requireTelegramOtp?: boolean }) {
  const response = await request<unknown>('/auth/login', {
    body: payload,
    method: 'POST',
  });

  return normalizeLoginResponse(response);
}

export async function verifyOtp(payload: { sessionId: string; code: string }) {
  const response = await request<unknown>('/auth/verify-otp', {
    body: payload,
    method: 'POST',
  });

  return normalizeSession(response);
}

export async function forgotPassword(loginValue: string) {
  const response = await request<unknown>('/auth/forgot-password', {
    body: { login: loginValue },
    method: 'POST',
  });

  const source = expectRecord(response);
  return {
    sessionId: readString(source, 'sessionId'),
  };
}

export async function resetPassword(payload: { sessionId: string; code: string; newPassword: string }) {
  await request('/auth/reset-password', {
    body: payload,
    method: 'POST',
  });
}

export async function getCurrentAccount(token: string) {
  const response = await request<unknown>('/accounts/me', { token });
  return normalizeAccount(response);
}

export async function updateAccountTelegramId(token: string, accountId: string, telegramId: string | null) {
  await request(`/accounts/${accountId}`, {
    body: { telegramId },
    method: 'PUT',
    token,
  });
}

export async function getProfile(accountId: string, token?: string) {
  const response = await request<unknown>(`/userprofiles/${accountId}`, { token });
  return normalizeProfile(response);
}

export async function upsertProfile(
  token: string,
  payload: {
    contactInfo?: string;
    dateOfBirth?: string;
    description?: string;
    fullName: string;
    photoUrl?: string;
  },
) {
  await request('/userprofiles', {
    body: payload,
    method: 'PUT',
    token,
  });
}

export async function uploadProfilePhoto(token: string, photoFile: File) {
  const body = new FormData();
  body.append('photo', photoFile);

  const response = await request<unknown>('/userprofiles/photo', {
    body,
    method: 'POST',
    token,
  });

  const source = expectRecord(response);
  return {
    photoUrl: readString(source, 'photoUrl', 'photoURL'),
  };
}

export async function getSkills(filters: {
  epithet?: number;
  page?: number;
  pageSize?: number;
  search?: string;
} = {}) {
  const response = await request<unknown>(withQuery('/skills', filters));
  return normalizePaged(response, normalizeSkill);
}

export async function createSkill(
  token: string,
  payload: {
    epithet: number;
    skillName: string;
  },
) {
  const response = await request<unknown>('/skills', {
    body: payload,
    method: 'POST',
    token,
  });

  const source = expectRecord(response);
  return {
    id: readString(source, 'id'),
  };
}

export async function getSkillOffers(filters: {
  accountId?: string;
  authorSearch?: string;
  epithetSearch?: string;
  excludeAccountId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  requireBarter?: boolean;
  search?: string;
  skillId?: string;
  titleSearch?: string;
  viewerAccountId?: string;
  viewerHasSkill?: boolean;
} = {}) {
  const response = await request<unknown>(withQuery('/skilloffers', filters));
  return normalizePaged(response, normalizeSkillOffer);
}

export async function createSkillOffer(
  token: string,
  payload: {
    details?: string;
    skillId: string;
    title: string;
  },
) {
  const response = await request<unknown>('/skilloffers', {
    body: payload,
    method: 'POST',
    token,
  });

  const source = expectRecord(response);
  return {
    id: readString(source, 'id'),
  };
}

export async function updateSkillOffer(
  token: string,
  offerId: string,
  payload: {
    details?: string;
    isActive: boolean;
    title: string;
  },
) {
  await request(`/skilloffers/${offerId}`, {
    body: payload,
    method: 'PUT',
    token,
  });
}

export async function deleteSkillOffer(token: string, offerId: string, deletionReason?: string) {
  await request(`/skilloffers/${offerId}`, {
    body: deletionReason ? { deletionReason } : undefined,
    method: 'DELETE',
    token,
  });
}

export async function getSkillRequests(filters: {
  accountId?: string;
  authorSearch?: string;
  canHelp?: boolean;
  excludeAccountId?: string;
  epithetSearch?: string;
  helperAccountId?: string;
  page?: number;
  pageSize?: number;
  requireBarter?: boolean;
  search?: string;
  skillId?: string;
  status?: number;
  titleSearch?: string;
} = {}) {
  const response = await request<unknown>(withQuery('/skillrequests', filters));
  return normalizePaged(response, normalizeSkillRequest);
}

export async function createSkillRequest(
  token: string,
  payload: {
    details?: string;
    skillId: string;
    title: string;
  },
) {
  const response = await request<unknown>('/skillrequests', {
    body: payload,
    method: 'POST',
    token,
  });

  const source = expectRecord(response);
  return {
    id: readString(source, 'id'),
  };
}

export async function updateSkillRequestStatus(token: string, requestId: string, status: number) {
  await request(`/skillrequests/${requestId}`, {
    body: { status },
    method: 'PUT',
    token,
  });
}

export async function deleteSkillRequest(token: string, requestId: string, deletionReason?: string) {
  await request(`/skillrequests/${requestId}`, {
    body: deletionReason ? { deletionReason } : undefined,
    method: 'DELETE',
    token,
  });
}

export async function createApplication(
  token: string,
  payload: {
    message?: string;
    offerId?: string;
    skillRequestId?: string;
  },
) {
  const response = await request<unknown>('/applications', {
    body: payload,
    method: 'POST',
    token,
  });

  const source = expectRecord(response);
  return {
    id: readString(source, 'id'),
  };
}

export async function getIncomingApplications(
  token: string,
  filters: {
    page?: number;
    pageSize?: number;
  } = {},
) {
  const response = await request<unknown>(withQuery('/applications/incoming', filters), { token });
  return normalizePaged(response, normalizeApplication);
}

export async function getOutgoingApplications(
  token: string,
  filters: {
    page?: number;
    pageSize?: number;
  } = {},
) {
  const response = await request<unknown>(withQuery('/applications/outgoing', filters), { token });
  return normalizePaged(response, normalizeApplication);
}

export async function getProcessedApplications(
  token: string,
  filters: {
    page?: number;
    pageSize?: number;
    status?: number;
  } = {},
) {
  const response = await request<unknown>(withQuery('/applications/processed', filters), { token });
  return normalizePaged(response, normalizeApplication);
}

export async function respondToApplication(token: string, applicationId: string, status: number) {
  await request(`/applications/${applicationId}/respond`, {
    body: { status },
    method: 'PUT',
    token,
  });
}

export async function cancelApplication(token: string, applicationId: string) {
  await request(`/applications/${applicationId}`, {
    method: 'DELETE',
    token,
  });
}

export async function getDeals(
  token: string,
  filters: {
    page?: number;
    pageSize?: number;
  } = {},
) {
  const response = await request<unknown>(withQuery('/deals', filters), { token });
  return normalizePaged(response, normalizeDeal);
}

export async function createReview(
  token: string,
  payload: {
    comment?: string;
    dealId: string;
    rating: number;
  },
) {
  const response = await request<unknown>('/reviews', {
    body: {
      comment: payload.comment,
      dealId: payload.dealId,
      rating: payload.rating,
    },
    method: 'POST',
    token,
  });

  const source = expectRecord(response);
  return {
    id: readString(source, 'id'),
  };
}

export async function getNotifications(token: string, unreadOnly = false) {
  const response = await request<unknown>(withQuery('/notifications', { unreadOnly }), { token });
  return normalizeNotificationFeed(response);
}

export async function generateTelegramLinkToken(token: string) {
  const response = await request<unknown>('/telegram/generate-link-token', {
    method: 'POST',
    token,
  });

  const source = expectRecord(response);
  return {
    token: readString(source, 'token'),
  };
}

export async function markNotificationRead(token: string, notificationId: string) {
  await request(`/notifications/${notificationId}/read`, {
    method: 'PUT',
    token,
  });
}

export async function markAllNotificationsRead(token: string) {
  await request('/notifications/read-all', {
    method: 'PUT',
    token,
  });
}

export async function getMatches(token: string) {
  const response = await request<unknown>('/matches', { token });
  return Array.isArray(response) ? response.map(normalizeMatch) : [];
}

export async function getUserSkills(accountId: string, token: string) {
  const response = await request<unknown>(`/userskills/${accountId}`, { token });
  return Array.isArray(response) ? response.map(normalizeUserSkill) : [];
}

export async function addUserSkill(
  token: string,
  payload: {
    description?: string;
    learnedAt?: string;
    level: number;
    skillId: string;
  },
) {
  await request('/userskills', {
    body: payload,
    method: 'POST',
    token,
  });
}

export async function removeUserSkill(token: string, skillId: string) {
  await request(`/userskills/${skillId}`, {
    method: 'DELETE',
    token,
  });
}

export async function getProofs(accountId: string, token: string) {
  const response = await request<unknown>(`/proofs/${accountId}`, { token });
  return Array.isArray(response) ? response.map(normalizeProof) : [];
}

export async function uploadProof(
  token: string,
  payload: {
    file: File;
    skillId?: string;
  },
) {
  const body = new FormData();
  body.append('file', payload.file);

  if (payload.skillId) {
    body.append('skillID', payload.skillId);
  }

  const response = await request<unknown>('/proofs', {
    body,
    method: 'POST',
    token,
  });

  const source = expectRecord(response);
  return {
    fileUrl: readString(source, 'fileUrl', 'fileURL'),
    id: readString(source, 'id'),
  };
}

export async function getVerificationRequests(
  token: string,
  filters: {
    accountId?: string;
    page?: number;
    pageSize?: number;
    status?: number;
  } = {},
) {
  const response = await request<unknown>(withQuery('/verification', filters), { token });
  return normalizePaged(response, normalizeVerificationRequest);
}

export async function submitVerificationRequest(
  token: string,
  payload: {
    proofId?: string;
    requestType: number;
  },
) {
  const response = await request<unknown>('/verification', {
    body: payload,
    method: 'POST',
    token,
  });

  const source = expectRecord(response);
  return {
    id: readString(source, 'id'),
  };
}

export async function reviewVerificationRequest(token: string, requestId: string, status: number, rejectionReason?: string) {
  await request(`/verification/${requestId}/review`, {
    body: { rejectionReason, status },
    method: 'PUT',
    token,
  });
}

export async function getEducations(accountId: string, token: string) {
  const response = await request<unknown>(`/education/${accountId}`, { token });
  return Array.isArray(response) ? response.map(normalizeEducation) : [];
}

export async function addEducation(
  token: string,
  payload: {
    degreeField?: string;
    institutionName: string;
    yearCompleted?: number;
  },
) {
  const response = await request<unknown>('/education', {
    body: payload,
    method: 'POST',
    token,
  });

  const source = expectRecord(response);
  return {
    id: readString(source, 'id'),
  };
}

export async function deleteEducation(token: string, educationId: string) {
  await request(`/education/${educationId}`, {
    method: 'DELETE',
    token,
  });
}

export async function getReviews(accountId: string) {
  const response = await request<unknown>(`/reviews/${accountId}`);
  return normalizeReviewFeed(response);
}
