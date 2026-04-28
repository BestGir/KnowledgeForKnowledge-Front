import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { EmptyState, LoadingBlock, Metric, Notice, Pagination, StatusTag, Surface } from '../components/Ui';
import {
  cancelApplication,
  createReview,
  getDeals,
  getIncomingApplications,
  getOutgoingApplications,
  getProcessedApplications,
  respondToApplication,
} from '../lib/api';
import { formatApplicationStatus, formatDate } from '../lib/format';
import type { ApplicationItem, DealItem, Session } from '../lib/types';
import { useAsyncData } from '../lib/useAsyncData';

type TabKey = 'incoming' | 'outgoing' | 'processed';
type NoticeState = { message: string; tone: 'danger' | 'info' | 'success' } | null;
type ReviewDraft = { comment: string; rating: number };
type ApplicationFeedContext = {
  deal: DealItem | null;
  outgoingForCurrentUser: boolean;
};

const applicationPageSize = 5;
const dealsPageSize = 500;

export function ApplicationsPage() {
  const { session } = useAuth();

  if (!session) {
    return (
      <Surface title="Отклики недоступны">
        <EmptyState
          action={
            <Link className="button button--primary" to="/auth">
              Войти в систему
            </Link>
          }
          description="Чтобы видеть входящие и исходящие отклики, сначала войди в систему."
          title="Нужна авторизация"
        />
      </Surface>
    );
  }

  return <ApplicationsContent session={session} />;
}

function ApplicationsContent({ session }: { session: Session }) {
  const [tab, setTab] = useState<TabKey>('incoming');
  const [incomingPage, setIncomingPage] = useState(1);
  const [outgoingPage, setOutgoingPage] = useState(1);
  const [processedPage, setProcessedPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [reviewApplicationId, setReviewApplicationId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>({ comment: '', rating: 5 });
  const [hiddenProcessedIds, setHiddenProcessedIds] = useState<string[]>(() => readStoredIds(getHiddenStorageKey(session.accountId)));
  const [skippedReviewIds, setSkippedReviewIds] = useState<string[]>(() => readStoredIds(getSkippedStorageKey(session.accountId)));

  const incomingState = useAsyncData([session.accountId, incomingPage, refreshToken], () =>
    getIncomingApplications(session.token, { page: incomingPage, pageSize: applicationPageSize }),
  );
  const outgoingState = useAsyncData([session.accountId, outgoingPage, refreshToken], () =>
    getOutgoingApplications(session.token, { page: outgoingPage, pageSize: applicationPageSize }),
  );
  const processedState = useAsyncData([session.accountId, refreshToken], () =>
    getProcessedApplications(session.token, { page: 1, pageSize: dealsPageSize }),
  );
  const dealsState = useAsyncData([session.accountId, refreshToken], () =>
    getDeals(session.token, { page: 1, pageSize: dealsPageSize }),
  );

  useEffect(() => {
    setHiddenProcessedIds(readStoredIds(getHiddenStorageKey(session.accountId)));
    setSkippedReviewIds(readStoredIds(getSkippedStorageKey(session.accountId)));
    closeReviewForm();
  }, [session.accountId]);

  useEffect(() => {
    writeStoredIds(getHiddenStorageKey(session.accountId), hiddenProcessedIds);
  }, [hiddenProcessedIds, session.accountId]);

  useEffect(() => {
    writeStoredIds(getSkippedStorageKey(session.accountId), skippedReviewIds);
  }, [session.accountId, skippedReviewIds]);

  useEffect(() => {
    if (incomingState.data && incomingState.data.totalPages > 0 && incomingPage > incomingState.data.totalPages) {
      setIncomingPage(incomingState.data.totalPages);
    }
  }, [incomingPage, incomingState.data]);

  useEffect(() => {
    if (outgoingState.data && outgoingState.data.totalPages > 0 && outgoingPage > outgoingState.data.totalPages) {
      setOutgoingPage(outgoingState.data.totalPages);
    }
  }, [outgoingPage, outgoingState.data]);

  function refreshAll() {
    setRefreshToken((current) => current + 1);
  }

  async function runAction(actionKey: string, action: () => Promise<void>, successMessage: string) {
    setBusyAction(actionKey);
    setNotice(null);

    try {
      await action();
      setNotice({
        message: successMessage,
        tone: 'success',
      });
      refreshAll();
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Операция не выполнена.',
        tone: 'danger',
      });
    } finally {
      setBusyAction(null);
    }
  }

  function changeReviewDraft<K extends keyof ReviewDraft>(field: K, value: ReviewDraft[K]) {
    setReviewDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openReviewForm(applicationId: string) {
    setReviewApplicationId(applicationId);
    setReviewDraft({ comment: '', rating: 5 });
  }

  function closeReviewForm() {
    setReviewApplicationId(null);
    setReviewDraft({ comment: '', rating: 5 });
  }

  function hideProcessedCard(applicationId: string) {
    setHiddenProcessedIds((current) => (current.includes(applicationId) ? current : [...current, applicationId]));
    if (reviewApplicationId === applicationId) {
      closeReviewForm();
    }
  }

  function skipReview(applicationId: string) {
    setSkippedReviewIds((current) => (current.includes(applicationId) ? current : [...current, applicationId]));
    if (reviewApplicationId === applicationId) {
      closeReviewForm();
    }
  }

  const dealsByApplicationId = Object.fromEntries(
    (dealsState.data?.items ?? []).map((deal) => [deal.applicationId, deal] as const),
  );
  const processedItems = processedState.data?.items ?? [];
  const visibleProcessedItems = processedItems.filter((application) => !hiddenProcessedIds.includes(application.applicationId));
  const processedTotalPages = Math.max(1, Math.ceil(visibleProcessedItems.length / applicationPageSize));
  const processedPageStart = (processedPage - 1) * applicationPageSize;
  const pagedProcessedItems = visibleProcessedItems.slice(processedPageStart, processedPageStart + applicationPageSize);

  useEffect(() => {
    if (processedPage > processedTotalPages) {
      setProcessedPage(processedTotalPages);
    }
  }, [processedPage, processedTotalPages]);

  return (
    <div className="page-stack">
      {notice ? <Notice message={notice.message} tone={notice.tone} /> : null}

      <Surface className="dashboard-hero">
        <div className="metric-grid metric-grid--applications">
          <Metric caption="Ждут твоего решения" label="Мне написали" value={String(incomingState.data?.totalCount ?? 0)} />
          <Metric caption="Пока ещё не обработаны" label="Я откликнулся" value={String(outgoingState.data?.totalCount ?? 0)} />
          <Metric caption="Принятые и отклонённые" label="Обработанные" value={String(visibleProcessedItems.length)} />
        </div>
      </Surface>

      <Surface
        actions={
          <div className="tab-row">
            <button
              className={tab === 'incoming' ? 'tab-button tab-button--active' : 'tab-button'}
              onClick={() => setTab('incoming')}
              type="button"
            >
              Мне написали
            </button>
            <button
              className={tab === 'outgoing' ? 'tab-button tab-button--active' : 'tab-button'}
              onClick={() => setTab('outgoing')}
              type="button"
            >
              Я откликнулся
            </button>
            <button
              className={tab === 'processed' ? 'tab-button tab-button--active' : 'tab-button'}
              onClick={() => setTab('processed')}
              type="button"
            >
              Обработанные
            </button>
          </div>
        }
        description={
          tab === 'incoming'
            ? 'Люди, которые ждут твоего ответа по твоим карточкам.'
            : tab === 'outgoing'
              ? 'Только живые исходящие отклики, которые ещё не приняли и не отклонили.'
              : 'История принятых и отклонённых откликов, включая твои исходящие.'
        }
        title="Лента откликов"
      >
        {tab === 'incoming' ? (
          <ApplicationFeed
            currentAccountId={session.accountId}
            emptyDescription="Пока никто не откликнулся на твои карточки."
            emptyTitle="Входящих откликов нет"
            error={incomingState.error}
            items={incomingState.data?.items ?? []}
            loading={incomingState.loading}
            onPageChange={setIncomingPage}
            page={incomingPage}
            totalPages={Math.max(incomingState.data?.totalPages ?? 1, 1)}
            renderActions={(application) => (
              <>
                <button
                  className="button button--primary"
                  disabled={busyAction === `accept-${application.applicationId}` || busyAction === `reject-${application.applicationId}`}
                  onClick={() =>
                    runAction(
                      `accept-${application.applicationId}`,
                      () => respondToApplication(session.token, application.applicationId, 1),
                      'Отклик принят.',
                    )
                  }
                  type="button"
                >
                  Принять
                </button>
                <button
                  className="button button--ghost"
                  disabled={busyAction === `accept-${application.applicationId}` || busyAction === `reject-${application.applicationId}`}
                  onClick={() =>
                    runAction(
                      `reject-${application.applicationId}`,
                      () => respondToApplication(session.token, application.applicationId, 2),
                      'Отклик отклонён.',
                    )
                  }
                  type="button"
                >
                  Отклонить
                </button>
              </>
            )}
          />
        ) : tab === 'outgoing' ? (
          <ApplicationFeed
            currentAccountId={session.accountId}
            emptyDescription="У тебя нет исходящих откликов, которые ещё ждут решения."
            emptyTitle="Живых исходящих откликов нет"
            error={outgoingState.error}
            items={outgoingState.data?.items ?? []}
            loading={outgoingState.loading}
            onPageChange={setOutgoingPage}
            page={outgoingPage}
            totalPages={Math.max(outgoingState.data?.totalPages ?? 1, 1)}
            renderActions={(application) => (
              <button
                className="button button--ghost"
                disabled={busyAction === `cancel-${application.applicationId}`}
                onClick={() =>
                  runAction(
                    `cancel-${application.applicationId}`,
                    () => cancelApplication(session.token, application.applicationId),
                    'Отклик отозван.',
                  )
                }
                type="button"
              >
                Отозвать отклик
              </button>
            )}
          />
        ) : (
          <ApplicationFeed
            currentAccountId={session.accountId}
            dealByApplicationId={dealsByApplicationId}
            emptyDescription="Пока у тебя нет принятых или отклонённых откликов."
            emptyTitle="История пока пустая"
            error={processedState.error ?? dealsState.error}
            items={pagedProcessedItems}
            loading={processedState.loading || dealsState.loading}
            onPageChange={setProcessedPage}
            page={processedPage}
            totalPages={processedTotalPages}
            renderActions={(application, context) => {
              const reviewSkipped = skippedReviewIds.includes(application.applicationId);
              const reviewOpen = reviewApplicationId === application.applicationId;
              const canReview = application.status === 1 && context.deal && !context.deal.myReviewExists && !reviewSkipped;

              return (
                <>
                  {application.status === 1 && context.deal && context.deal.myReviewExists ? (
                    <span className="meta-line">Отзыв уже оставлен.</span>
                  ) : null}

                  {canReview ? (
                    <button
                      className="button button--primary"
                      disabled={busyAction === `review-${application.applicationId}`}
                      onClick={() => openReviewForm(application.applicationId)}
                      type="button"
                    >
                      Оставить отзыв
                    </button>
                  ) : null}

                  {canReview ? (
                    <button
                      className="button button--ghost"
                      disabled={busyAction === `skip-review-${application.applicationId}`}
                      onClick={() => skipReview(application.applicationId)}
                      type="button"
                    >
                      Не оставлять отзыв
                    </button>
                  ) : null}

                  <button
                    className="button button--ghost"
                    onClick={() => hideProcessedCard(application.applicationId)}
                    type="button"
                  >
                    Удалить карточку
                  </button>

                  {reviewOpen && context.deal ? (
                    <div className="review-form">
                      <label className="field">
                        <span>Оценка</span>
                        <select
                          className="select-field"
                          onChange={(event) => changeReviewDraft('rating', Number(event.target.value))}
                          value={reviewDraft.rating}
                        >
                          <option value={5}>5</option>
                          <option value={4}>4</option>
                          <option value={3}>3</option>
                          <option value={2}>2</option>
                          <option value={1}>1</option>
                        </select>
                      </label>

                      <label className="field">
                        <span>Комментарий</span>
                        <textarea
                          className="textarea-field"
                          onChange={(event) => changeReviewDraft('comment', event.target.value)}
                          placeholder="Коротко опиши, как прошёл обмен."
                          rows={3}
                          value={reviewDraft.comment}
                        />
                      </label>

                      <div className="card-actions">
                        <button
                          className="button button--primary"
                          disabled={busyAction === `review-${application.applicationId}`}
                          onClick={() =>
                            runAction(
                              `review-${application.applicationId}`,
                              async () => {
                                await createReview(session.token, {
                                  comment: reviewDraft.comment.trim() || undefined,
                                  dealId: context.deal!.dealId,
                                  rating: reviewDraft.rating,
                                });
                                closeReviewForm();
                              },
                              'Отзыв сохранён.',
                            )
                          }
                          type="button"
                        >
                          Сохранить отзыв
                        </button>
                        <button className="button button--ghost" onClick={closeReviewForm} type="button">
                          Закрыть
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              );
            }}
          />
        )}
      </Surface>
    </div>
  );
}

function ApplicationFeed({
  currentAccountId,
  dealByApplicationId,
  emptyDescription,
  emptyTitle,
  error,
  hiddenApplicationIds = [],
  items,
  loading,
  onPageChange,
  page,
  renderActions,
  totalPages,
}: {
  currentAccountId: string;
  dealByApplicationId?: Record<string, DealItem>;
  emptyDescription: string;
  emptyTitle: string;
  error: string | null;
  hiddenApplicationIds?: string[];
  items: ApplicationItem[];
  loading: boolean;
  onPageChange: (page: number) => void;
  page: number;
  renderActions?: (application: ApplicationItem, context: ApplicationFeedContext) => ReactNode;
  totalPages: number;
}) {
  const visibleItems = items.filter((application) => !hiddenApplicationIds.includes(application.applicationId));

  if (loading && visibleItems.length === 0) {
    return <LoadingBlock label="Загружаем отклики..." />;
  }

  if (error) {
    return <EmptyState description={error} title="Не удалось загрузить отклики" />;
  }

  if (visibleItems.length === 0 && items.length > 0) {
    return (
      <div className="list-stack">
        <EmptyState description="На этой странице все карточки уже скрыты." title="Карточки скрыты" />
        <Pagination onPageChange={onPageChange} page={page} totalPages={totalPages} />
      </div>
    );
  }

  if (visibleItems.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className={loading ? 'list-stack list-stack--updating' : 'list-stack'}>
      {visibleItems.map((application) => {
        const outgoingForCurrentUser = application.applicantId === currentAccountId;
        const deal = dealByApplicationId?.[application.applicationId] ?? null;

        return (
          <article className="list-card" key={application.applicationId}>
            <div className="list-card-top">
              <div>
                <strong>{getApplicationHeading(application)}</strong>
                <p className="meta-line">{getApplicationKindLabel(application, outgoingForCurrentUser)}</p>
              </div>
              <StatusTag label={formatApplicationStatus(application.status)} tone={getApplicationTone(application.status)} />
            </div>

            {!outgoingForCurrentUser ? (
              <div className="inline-author">
                <div className="avatar avatar--md">
                  <span>{application.applicantName.slice(0, 1).toUpperCase()}</span>
                </div>
                <div>
                  <strong>{application.applicantName}</strong>
                  <span>{application.skillName ?? 'Навык не указан'}</span>
                </div>
              </div>
            ) : (
              <p className="meta-line">{application.skillName ?? 'Навык не указан'}</p>
            )}

            <p>{getApplicationDescription(application, outgoingForCurrentUser)}</p>
            {deal ? <p className="meta-line">Сделка: {formatDealLabel(deal, currentAccountId)}</p> : null}
            <p>{application.message || 'Сообщение не добавлено.'}</p>
            <p className="meta-line">Создано: {formatDate(application.createdAt)}</p>

            <div className="card-actions">
              {!outgoingForCurrentUser ? (
                <Link className="text-link" to={`/profile/${application.applicantId}`}>
                  Профиль автора
                </Link>
              ) : null}
              {renderActions
                ? renderActions(application, {
                    deal,
                    outgoingForCurrentUser,
                  })
                : null}
            </div>
          </article>
        );
      })}

      <Pagination onPageChange={onPageChange} page={page} totalPages={totalPages} />
    </div>
  );
}

function getApplicationHeading(application: ApplicationItem) {
  return application.offerTitle ?? application.requestTitle ?? 'Карточка без названия';
}

function getApplicationKindLabel(application: ApplicationItem, outgoingForCurrentUser: boolean) {
  if (application.offerId) {
    return outgoingForCurrentUser ? 'Ты откликнулся на предложение' : 'Отклик на твоё предложение';
  }

  if (application.skillRequestId) {
    return outgoingForCurrentUser ? 'Ты предложил помощь по запросу' : 'Отклик на твой запрос';
  }

  return 'Отклик';
}

function getApplicationDescription(application: ApplicationItem, outgoingForCurrentUser: boolean) {
  if (application.offerId) {
    return outgoingForCurrentUser
      ? 'Ты отправил запрос по чужому предложению.'
      : `${application.applicantName} откликнулся на твоё предложение.`;
  }

  if (application.skillRequestId) {
    return outgoingForCurrentUser
      ? 'Ты предложил помощь по чужому запросу.'
      : `${application.applicantName} ответил на твой запрос и предлагает помощь.`;
  }

  return outgoingForCurrentUser ? 'Ты отправил исходящий отклик.' : 'По твоей карточке пришёл отклик.';
}

function getApplicationTone(status: number) {
  if (status === 1) {
    return 'success';
  }

  if (status === 2) {
    return 'danger';
  }

  return 'warning';
}

function formatDealLabel(deal: DealItem, currentAccountId: string) {
  const counterpartyName = deal.initiatorId === currentAccountId ? deal.partnerName : deal.initiatorName;
  return `${counterpartyName} • ${formatDealStatus(deal.status)}`;
}

function formatDealStatus(status: string) {
  switch (status) {
    case 'Active':
      return 'обмен активен';
    case 'CompletedByInitiator':
      return 'инициатор завершил';
    case 'CompletedByPartner':
      return 'партнёр завершил';
    case 'Completed':
      return 'обмен завершён';
    case 'Cancelled':
      return 'обмен отменён';
    default:
      return status;
  }
}

function getHiddenStorageKey(accountId: string) {
  return `applications:hidden:${accountId}`;
}

function getSkippedStorageKey(accountId: string) {
  return `applications:skip-review:${accountId}`;
}

function readStoredIds(key: string) {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function writeStoredIds(key: string, ids: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(ids));
}
