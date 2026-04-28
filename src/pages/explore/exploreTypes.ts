export type ListingMode = 'offer' | 'request';
export type OfferSkillFilter = 'all' | 'have-skill' | 'need-skill';
export type RequestCapabilityFilter = 'all' | 'can-help' | 'cant-help';
export type ExchangeFilter = 'all' | 'mutual';

export type ComposerTarget = {
  id: string;
  kind: ListingMode;
  title: string;
};

export type AdminDeleteTarget = ComposerTarget;
export type NoticeState = { message: string; tone: 'danger' | 'info' | 'success' } | null;

export const defaultApplicationMessage =
  'Привет! Хочу обсудить карточку и договориться о формате общения.';
