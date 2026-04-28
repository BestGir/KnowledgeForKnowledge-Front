import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { SkillPicker } from '../components/SkillPicker';
import { EmptyState, LoadingBlock, Notice, Pagination, StatusTag, Surface } from '../components/Ui';
import {
  createSkillOffer,
  createSkillRequest,
  deleteSkillOffer,
  deleteSkillRequest,
  getProfile,
  getSkills,
  getSkillOffers,
  getSkillRequests,
  getUserSkills,
} from '../lib/api';
import { formatRequestStatus } from '../lib/format';
import type { Session } from '../lib/types';
import { useAsyncData } from '../lib/useAsyncData';

type ListingDraft = {
  details: string;
  skillId: string;
  title: string;
};

type NoticeState = { message: string; tone: 'danger' | 'info' | 'success' } | null;

const emptyDraft: ListingDraft = {
  details: '',
  skillId: '',
  title: '',
};

export function MyListingsPage() {
  const { session } = useAuth();

  if (!session) {
    return (
      <Surface title="Мои карточки недоступны">
        <EmptyState
          action={
            <Link className="button button--primary" to="/auth">
              Войти в систему
            </Link>
          }
          description="Чтобы создавать и удалять свои предложения и запросы, сначала войди в систему."
          title="Нужна авторизация"
        />
      </Surface>
    );
  }

  return <MyListingsContent session={session} />;
}

function MyListingsContent({ session }: { session: Session }) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [offerPage, setOfferPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [offerDraft, setOfferDraft] = useState<ListingDraft>(emptyDraft);
  const [requestDraft, setRequestDraft] = useState<ListingDraft>(emptyDraft);
  const pendingScrollYRef = useRef<number | null>(null);
  const listingsPageSize = 5;

  const profileState = useAsyncData([session.accountId, refreshToken], () => getProfile(session.accountId, session.token));
  const catalogSkillsState = useAsyncData([refreshToken], () => getSkills({ pageSize: 500 }));
  const userSkillsState = useAsyncData([session.accountId, refreshToken], () => getUserSkills(session.accountId, session.token));
  const offersState = useAsyncData([session.accountId, offerPage, refreshToken], () =>
    getSkillOffers({
      accountId: session.accountId,
      isActive: true,
      page: offerPage,
      pageSize: listingsPageSize,
    }),
  );
  const requestsState = useAsyncData([session.accountId, requestPage, refreshToken], () =>
    getSkillRequests({
      accountId: session.accountId,
      page: requestPage,
      pageSize: listingsPageSize,
      status: 0,
    }),
  );

  const userSkills = useMemo(() => userSkillsState.data ?? [], [userSkillsState.data]);
  const catalogSkills = useMemo(() => catalogSkillsState.data?.items ?? [], [catalogSkillsState.data]);
  const offersInitialLoading = offersState.loading && !offersState.data;
  const requestsInitialLoading = requestsState.loading && !requestsState.data;
  const offerListClassName = offersState.loading ? 'list-stack list-stack--updating' : 'list-stack';
  const requestListClassName = requestsState.loading ? 'list-stack list-stack--updating' : 'list-stack';

  useEffect(() => {
    if (offerDraft.skillId && !userSkills.some((skill) => skill.skillId === offerDraft.skillId)) {
      setOfferDraft((current) => ({ ...current, skillId: '' }));
    }

    if (requestDraft.skillId && !catalogSkills.some((skill) => skill.skillId === requestDraft.skillId)) {
      setRequestDraft((current) => ({ ...current, skillId: '' }));
    }
  }, [catalogSkills, offerDraft.skillId, requestDraft.skillId, userSkills]);

  useEffect(() => {
    if (offersState.data && offersState.data.totalPages > 0 && offerPage > offersState.data.totalPages) {
      setOfferPage(offersState.data.totalPages);
    }
  }, [offerPage, offersState.data]);

  useEffect(() => {
    if (requestsState.data && requestsState.data.totalPages > 0 && requestPage > requestsState.data.totalPages) {
      setRequestPage(requestsState.data.totalPages);
    }
  }, [requestPage, requestsState.data]);

  useLayoutEffect(() => {
    if (pendingScrollYRef.current === null) {
      return;
    }

    if (offersState.loading || requestsState.loading) {
      return;
    }

    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;

    root.style.scrollBehavior = 'auto';
    window.scrollTo({ top: pendingScrollYRef.current });
    pendingScrollYRef.current = null;

    const frameId = window.requestAnimationFrame(() => {
      root.style.scrollBehavior = previousScrollBehavior;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, [offersState.loading, requestsState.loading]);

  function refreshAll() {
    setRefreshToken((current) => current + 1);
  }

  async function runAction(
    actionKey: string,
    action: () => Promise<void>,
    successMessage: string,
    options?: {
      preserveScroll?: boolean;
      beforeRefresh?: () => void;
    },
  ) {
    setBusyAction(actionKey);
    setNotice(null);

    if (options?.preserveScroll) {
      pendingScrollYRef.current = window.scrollY;
    }

    try {
      await action();
      options?.beforeRefresh?.();
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

  function validateDraft(draft: ListingDraft, mode: 'offer' | 'request') {
    if (!profileState.data?.hasProfile) {
      return 'Сначала заполни профиль в кабинете, а потом создавай карточки.';
    }

    if (mode === 'offer' && !userSkills.length) {
      return 'Сначала добавь хотя бы один навык в личном кабинете.';
    }

    if (!draft.skillId) {
      return 'Выбери навык для карточки.';
    }

    if (!draft.title.trim()) {
      return 'Добавь заголовок карточки.';
    }

    return null;
  }

  async function handleOfferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateDraft(offerDraft, 'offer');

    if (validationError) {
      setNotice({
        message: validationError,
        tone: 'danger',
      });
      return;
    }

    await runAction(
      'offer-create',
      async () => {
        await createSkillOffer(session.token, {
          details: offerDraft.details.trim() || undefined,
          skillId: offerDraft.skillId,
          title: offerDraft.title.trim(),
        });

        setOfferDraft(emptyDraft);
        setOfferPage(1);
      },
      'Предложение создано.',
    );
  }

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateDraft(requestDraft, 'request');

    if (validationError) {
      setNotice({
        message: validationError,
        tone: 'danger',
      });
      return;
    }

    await runAction(
      'request-create',
      async () => {
        await createSkillRequest(session.token, {
          details: requestDraft.details.trim() || undefined,
          skillId: requestDraft.skillId,
          title: requestDraft.title.trim(),
        });

        setRequestDraft(emptyDraft);
        setRequestPage(1);
      },
      'Запрос создан.',
    );
  }

  const creationHint = !profileState.data?.hasProfile
    ? 'Сначала сохрани профиль в кабинете.'
    : !userSkills.length
      ? 'Предложения можно создавать только по своим навыкам, а запросы доступны по любому навыку из общего каталога.'
      : 'Здесь можно управлять своими карточками и быстро очищать витрину от неактуальных записей.';

  return (
    <div className="page-stack">
      <Surface className="dashboard-hero">
        <div className="hero-grid hero-grid--compact">
          <div className="hero-copy">
            <h1>Мои предложения и запросы</h1>
            <p className="hero-text">
              Здесь живут только твои карточки: можно создать новое предложение, оформить запрос на помощь и удалить то,
              что больше не нужно держать в каталоге.
            </p>
          </div>

          <div className="detail-panel">
            <span className="eyebrow">Сводка</span>
            <strong>{(offersState.data?.totalCount ?? 0) + (requestsState.data?.totalCount ?? 0)} карточек</strong>
            <p>{creationHint}</p>
            <div className="button-row">
              <Link className="button button--ghost" to="/explore">
                Открыть каталог
              </Link>
              <Link className="button button--ghost" to="/dashboard">
                Открыть кабинет
              </Link>
            </div>
          </div>
        </div>
      </Surface>

      {notice ? <Notice message={notice.message} tone={notice.tone} /> : null}

      <div className="content-grid content-grid--balanced">
        <Surface
          actions={<StatusTag label={`${offersState.data?.totalCount ?? 0} карточек`} tone="neutral" />}
          description="Создавай и удаляй свои предложения. В каталог они попадут автоматически."
          title="Мои предложения"
        >
          {profileState.loading || userSkillsState.loading ? (
            <LoadingBlock label="Готовим форму предложения..." />
          ) : (
            <form className="form-grid" onSubmit={handleOfferSubmit}>
              <label>
                <span>Навык</span>
                <SkillPicker
                  disabled={!userSkills.length}
                  emptyMessage="У тебя пока нет такого навыка в личном кабинете."
                  onChange={(skillId) => setOfferDraft((current) => ({ ...current, skillId }))}
                  options={userSkills}
                  placeholder="Начни вводить навык из своего кабинета"
                  value={offerDraft.skillId}
                />
              </label>
              <label>
                <span>Заголовок</span>
                <input
                  onChange={(event) => setOfferDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Например: Помогу с React и структурой компонентов"
                  value={offerDraft.title}
                />
              </label>
              <label>
                <span>Детали</span>
                <textarea
                  onChange={(event) => setOfferDraft((current) => ({ ...current, details: event.target.value }))}
                  placeholder="Кратко опиши формат помощи, тему и ожидания."
                  rows={4}
                  value={offerDraft.details}
                />
              </label>
              <button className="button button--primary" disabled={busyAction === 'offer-create'} type="submit">
                {busyAction === 'offer-create' ? 'Создаём...' : 'Создать предложение'}
              </button>
            </form>
          )}

          <div className="my-listings-feed">
            {offersInitialLoading ? (
              <LoadingBlock label="Загружаем твои предложения..." />
            ) : offersState.data && offersState.data.items.length > 0 ? (
              <div className={offerListClassName}>
                {offersState.data.items.map((offer) => (
                  <article className="list-card" key={offer.offerId}>
                    <div className="list-card-top">
                      <div>
                        <strong>{offer.title}</strong>
                        <p className="meta-line">{offer.skillName}</p>
                      </div>
                      <StatusTag label={offer.isActive ? 'Активно' : 'Пауза'} tone={offer.isActive ? 'success' : 'warning'} />
                    </div>
                    <p>{offer.details || 'Подробности пока не добавлены.'}</p>
                    <div className="button-row">
                      <button
                        className="button button--ghost"
                        disabled={busyAction === `offer-delete-${offer.offerId}`}
                        onClick={() =>
                          runAction(
                            `offer-delete-${offer.offerId}`,
                            () => deleteSkillOffer(session.token, offer.offerId),
                            'Предложение удалено.',
                            {
                              beforeRefresh: () => {
                                if (offersState.data && offersState.data.items.length === 1 && offerPage > 1) {
                                  setOfferPage((current) => current - 1);
                                }
                              },
                              preserveScroll: true,
                            },
                          )
                        }
                        type="button"
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                ))}
                <Pagination onPageChange={setOfferPage} page={offerPage} totalPages={offersState.data.totalPages} />
              </div>
            ) : (
              <EmptyState description="Добавь первое предложение, чтобы оно появилось в каталоге." title="Предложений пока нет" />
            )}
          </div>
        </Surface>

        <Surface
          actions={<StatusTag label={`${requestsState.data?.totalCount ?? 0} карточек`} tone="neutral" />}
          description="Оформляй запросы на помощь и удаляй те, которые уже не нужны."
          title="Мои запросы"
        >
          {profileState.loading || catalogSkillsState.loading ? (
            <LoadingBlock label="Готовим форму запроса..." />
          ) : (
            <form className="form-grid" onSubmit={handleRequestSubmit}>
              <label>
                <span>Навык</span>
                <SkillPicker
                  disabled={!catalogSkills.length}
                  emptyMessage="В общем каталоге нет навыка с таким названием."
                  onChange={(skillId) => setRequestDraft((current) => ({ ...current, skillId }))}
                  options={catalogSkills}
                  placeholder="Начни вводить навык из общего каталога"
                  value={requestDraft.skillId}
                />
              </label>
              <label>
                <span>Заголовок</span>
                <input
                  onChange={(event) => setRequestDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Например: Нужна помощь с PostgreSQL и индексами"
                  value={requestDraft.title}
                />
              </label>
              <label>
                <span>Детали</span>
                <textarea
                  onChange={(event) => setRequestDraft((current) => ({ ...current, details: event.target.value }))}
                  placeholder="Кратко опиши, что именно хочешь разобрать."
                  rows={4}
                  value={requestDraft.details}
                />
              </label>
              <button className="button button--primary" disabled={busyAction === 'request-create'} type="submit">
                {busyAction === 'request-create' ? 'Создаём...' : 'Создать запрос'}
              </button>
            </form>
          )}

          <div className="my-listings-feed">
            {requestsInitialLoading ? (
              <LoadingBlock label="Загружаем твои запросы..." />
            ) : requestsState.data && requestsState.data.items.length > 0 ? (
              <div className={requestListClassName}>
                {requestsState.data.items.map((request) => (
                  <article className="list-card" key={request.requestId}>
                    <div className="list-card-top">
                      <div>
                        <strong>{request.title}</strong>
                        <p className="meta-line">{request.skillName}</p>
                      </div>
                      <StatusTag label={formatRequestStatus(request.status)} tone="accent" />
                    </div>
                    <p>{request.details || 'Подробности пока не добавлены.'}</p>
                    <div className="button-row">
                      <button
                        className="button button--ghost"
                        disabled={busyAction === `request-delete-${request.requestId}`}
                        onClick={() =>
                          runAction(
                            `request-delete-${request.requestId}`,
                            () => deleteSkillRequest(session.token, request.requestId),
                            'Запрос удалён.',
                            {
                              beforeRefresh: () => {
                                if (requestsState.data && requestsState.data.items.length === 1 && requestPage > 1) {
                                  setRequestPage((current) => current - 1);
                                }
                              },
                              preserveScroll: true,
                            },
                          )
                        }
                        type="button"
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                ))}
                <Pagination onPageChange={setRequestPage} page={requestPage} totalPages={requestsState.data.totalPages} />
              </div>
            ) : (
              <EmptyState description="Добавь первый запрос, чтобы он появился в каталоге." title="Запросов пока нет" />
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}
