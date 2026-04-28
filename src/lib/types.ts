export type LabelMap = Record<number, string>;

export interface Session {
  token: string;
  accountId: string;
  isAdmin: boolean;
}

export interface LoginResponse extends Session {
  requiresOtp: boolean;
  requiresTelegramLink: boolean;
  sessionId: string | null;
  telegramLinkToken: string | null;
}

export interface Account {
  accountId: string;
  login: string;
  telegramId: string | null;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Skill {
  skillId: string;
  skillName: string;
  epithet: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SkillOffer {
  offerId: string;
  accountId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  skillId: string;
  skillName: string;
  skillEpithet: number;
  title: string;
  details: string | null;
  isActive: boolean;
}

export interface SkillRequest {
  requestId: string;
  accountId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  skillId: string;
  skillName: string;
  skillEpithet: number;
  title: string;
  details: string | null;
  status: number;
}

export interface UserProfile {
  accountId: string;
  fullName: string;
  dateOfBirth: string | null;
  photoUrl: string | null;
  contactInfo: string | null;
  description: string | null;
  isActive: boolean;
  lastSeenOnline: string | null;
  hasProfile: boolean;
}

export interface ApplicationItem {
  applicationId: string;
  applicantId: string;
  applicantName: string;
  applicantTelegramId: string | null;
  offerId: string | null;
  offerTitle: string | null;
  skillRequestId: string | null;
  requestTitle: string | null;
  skillName: string | null;
  status: number;
  message: string | null;
  createdAt: string;
}

export interface DealItem {
  dealId: string;
  applicationId: string;
  initiatorId: string;
  initiatorName: string;
  partnerId: string;
  partnerName: string;
  status: string;
  myReviewExists: boolean;
  createdAt: string;
  completedAt: string | null;
  offerTitle: string | null;
  requestTitle: string | null;
}

export interface NotificationItem {
  notificationId: string;
  type: string;
  message: string;
  isRead: boolean;
  relatedEntityId: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  items: NotificationItem[];
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MatchRequest {
  requestId: string;
  title: string;
  skillName: string;
}

export interface MatchItem {
  accountId: string;
  fullName: string;
  skillsTheyHaveThatIWant: string[];
  skillsIHaveThatTheyWant: string[];
  theirRequests: MatchRequest[];
}

export interface UserSkill {
  skillId: string;
  skillName: string;
  epithet: number;
  level: number;
  description: string | null;
  learnedAt: string | null;
  isVerified: boolean;
}

export interface ProofItem {
  proofId: string;
  skillId: string | null;
  skillName: string | null;
  fileUrl: string;
  isVerified: boolean;
}

export interface VerificationRequestItem {
  requestId: string;
  accountId: string;
  accountName: string;
  requestType: number;
  status: number;
  proofId: string | null;
  proofFileUrl: string | null;
  skillId: string | null;
  skillName: string | null;
  skillLevel: number | null;
  createdAt: string;
}

export interface EducationItem {
  educationId: string;
  institutionName: string;
  degreeField: string | null;
  yearCompleted: number | null;
}

export interface ReviewItem {
  reviewId: string;
  dealId: string;
  authorId: string;
  authorName: string;
  skillId: string | null;
  skillName: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewFeed {
  items: ReviewItem[];
  totalCount: number;
  averageRating: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const skillEpithetLabels: LabelMap = {
  0: 'ИТ',
  1: 'Дизайн',
  2: 'Кулинария',
  3: 'Языки',
  4: 'Музыка',
  5: 'Спорт',
  6: 'Бизнес',
  7: 'Образование',
  8: 'Здоровье',
  9: 'Другое',
};

export const requestStatusLabels: LabelMap = {
  0: 'Открыт',
  1: 'Выполнен',
  2: 'Закрыт',
  3: 'На паузе',
};

export const applicationStatusLabels: LabelMap = {
  0: 'Ожидает',
  1: 'Принят',
  2: 'Отклонён',
};

export const verificationStatusLabels: LabelMap = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
};

export const verificationRequestTypeLabels: LabelMap = {
  0: 'Skill proof',
  1: 'Account verification',
};

export const skillLevelLabels: LabelMap = {
  0: 'Trainee',
  1: 'Junior',
  2: 'Middle',
  3: 'Senior',
};

export const skillEpithetOptions = Object.entries(skillEpithetLabels).map(([value, label]) => ({
  value: Number(value),
  label,
}));

export const requestStatusOptions = Object.entries(requestStatusLabels).map(([value, label]) => ({
  value: Number(value),
  label,
}));

export const applicationStatusOptions = Object.entries(applicationStatusLabels).map(([value, label]) => ({
  value: Number(value),
  label,
}));

export const skillLevelOptions = Object.entries(skillLevelLabels).map(([value, label]) => ({
  value: Number(value),
  label,
}));
