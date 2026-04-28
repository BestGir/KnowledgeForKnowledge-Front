import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { EmptyState, LoadingBlock, Notice, Pagination, Surface } from '../components/Ui';
import {
  createApplication,
  deleteSkillOffer,
  deleteSkillRequest,
  getSkillOffers,
  getSkillRequests,
  getSkills,
  getUserSkills,
} from '../lib/api';
import { useAsyncData } from '../lib/useAsyncData';
import { OfferCard, RequestCard } from './explore/ExploreCards';
import { OfferFilters, RequestFilters } from './explore/ExploreFilters';
import { ExploreHero } from './explore/ExploreHero';
import {
  defaultApplicationMessage,
  type AdminDeleteTarget,
  type ComposerTarget,
  type ExchangeFilter,
  type ListingMode,
  type NoticeState,
  type OfferSkillFilter,
  type RequestCapabilityFilter,
} from './explore/exploreTypes';

const listingPageSize = 5;

export function ExplorePage() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [appliedSkillId, setAppliedSkillId] = useState('');
  const [listingMode, setListingMode] = useState<ListingMode>('offer');
  const [offerSkillFilter, setOfferSkillFilter] = useState<OfferSkillFilter>('all');
  const [requestCapabilityFilter, setRequestCapabilityFilter] = useState<RequestCapabilityFilter>('all');
  const [offerExchangeFilter, setOfferExchangeFilter] = useState<ExchangeFilter>('all');
  const [requestExchangeFilter, setRequestExchangeFilter] = useState<ExchangeFilter>('all');
  const [offerPage, setOfferPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [composer, setComposer] = useState<ComposerTarget | null>(null);
  const [applicationMessage, setApplicationMessage] = useState(defaultApplicationMessage);
  const [adminDeleteTarget, setAdminDeleteTarget] = useState<AdminDeleteTarget | null>(null);
  const [adminDeletionReason, setAdminDeletionReason] = useState('');
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isAdminDeleting, setIsAdminDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filterSkillsState = useAsyncData([], () => getSkills({ pageSize: 500 }));
  const viewerSkillsState = useAsyncData([session?.accountId ?? 'anonymous', session?.token ?? 'anonymous'], () =>
    session?.token ? getUserSkills(session.accountId, session.token) : Promise.resolve([]),
  );

  const offerViewerAccountId =
    session && (offerSkillFilter !== 'all' || offerExchangeFilter === 'mutual') ? session.accountId : undefined;
  const requestViewerAccountId =
    session && (requestCapabilityFilter !== 'all' || requestExchangeFilter === 'mutual') ? session.accountId : undefined;
  const excludeOwnAccountId = session?.accountId;

  const offersState = useAsyncData(
    [
      appliedSkillId,
      offerPage,
      offerSkillFilter,
      offerExchangeFilter,
      offerViewerAccountId ?? 'anonymous',
      excludeOwnAccountId ?? 'anonymous',
    ],
    () =>
      getSkillOffers({
        excludeAccountId: excludeOwnAccountId,
        isActive: true,
        page: offerPage,
        pageSize: listingPageSize,
        requireBarter: session && offerExchangeFilter === 'mutual' ? true : undefined,
        skillId: appliedSkillId || undefined,
        viewerAccountId: offerViewerAccountId,
        viewerHasSkill: session && offerSkillFilter !== 'all' ? offerSkillFilter === 'have-skill' : undefined,
      }),
  );

  const requestsState = useAsyncData(
    [
      appliedSkillId,
      requestPage,
      requestCapabilityFilter,
      requestExchangeFilter,
      requestViewerAccountId ?? 'anonymous',
      excludeOwnAccountId ?? 'anonymous',
    ],
    () =>
      getSkillRequests({
        canHelp: session && requestCapabilityFilter !== 'all' ? requestCapabilityFilter === 'can-help' : undefined,
        excludeAccountId: excludeOwnAccountId,
        helperAccountId: requestViewerAccountId,
        page: requestPage,
        pageSize: listingPageSize,
        requireBarter: session && requestExchangeFilter === 'mutual' ? true : undefined,
        skillId: appliedSkillId || undefined,
        status: 0,
      }),
  );

  useEffect(() => {
    if (!filterSkillsState.data?.items.length) {
      return;
    }

    const selectedSkillStillVisible =
      selectedSkillId === '' || filterSkillsState.data.items.some((skill) => skill.skillId === selectedSkillId);
    const appliedSkillStillVisible =
      appliedSkillId === '' || filterSkillsState.data.items.some((skill) => skill.skillId === appliedSkillId);

    if (!selectedSkillStillVisible || !appliedSkillStillVisible) {
      setOfferPage(1);
      setRequestPage(1);
      setSelectedSkillId('');
      setAppliedSkillId('');
      closeComposer();
    }
  }, [appliedSkillId, filterSkillsState.data, selectedSkillId]);

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

  useEffect(() => {
    if (!session) {
      setOfferSkillFilter('all');
      setRequestCapabilityFilter('all');
      setOfferExchangeFilter('all');
      setRequestExchangeFilter('all');
      closeComposer();
      closeAdminDelete();
    }
  }, [session]);

  useEffect(() => {
    closeComposer();
    closeAdminDelete();
  }, [listingMode, appliedSkillId, offerPage, requestPage]);

  const mySkillIds = useMemo(
    () => new Set((viewerSkillsState.data ?? []).map((skill) => skill.skillId)),
    [viewerSkillsState.data],
  );
  const offerItems = offersState.data?.items ?? [];
  const requestItems = requestsState.data?.items ?? [];
  const offerListIsRefreshing = offersState.loading && offersState.data !== null;
  const requestListIsRefreshing = requestsState.loading && requestsState.data !== null;
  const activeSkillName =
    filterSkillsState.data?.items.find((skill) => skill.skillId === appliedSkillId)?.skillName ?? '';

  function applySkillFilter() {
    setOfferPage(1);
    setRequestPage(1);
    setAppliedSkillId(selectedSkillId);
  }

  function openComposer(target: ComposerTarget) {
    if (!session) {
      navigate('/auth');
      return;
    }

    setComposer(target);
    closeAdminDelete();
    setApplicationMessage(
      target.kind === 'offer'
        ? `Привет! Хочу откликнуться на предложение «${target.title}».`
        : `Привет! Могу помочь по запросу «${target.title}».`,
    );
    setNotice(null);
  }

  function closeComposer() {
    setComposer(null);
    setApplicationMessage(defaultApplicationMessage);
  }

  function openAdminDelete(target: AdminDeleteTarget) {
    if (!session?.isAdmin) {
      return;
    }

    closeComposer();
    setAdminDeleteTarget(target);
    setAdminDeletionReason('');
    setNotice(null);
  }

  function closeAdminDelete() {
    setAdminDeleteTarget(null);
    setAdminDeletionReason('');
  }

  async function handleAdminDeleteSubmit(event: FormEvent<HTMLFormElement>, target: AdminDeleteTarget) {
    event.preventDefault();

    if (!session?.isAdmin) {
      return;
    }

    const reason = adminDeletionReason.trim();
    if (!reason) {
      setNotice({
        message: 'Укажи причину удаления. Она уйдёт владельцу карточки в Telegram.',
        tone: 'danger',
      });
      return;
    }

    setIsAdminDeleting(true);
    setNotice(null);

    try {
      if (target.kind === 'offer') {
        await deleteSkillOffer(session.token, target.id, reason);
        offersState.reload();
      } else {
        await deleteSkillRequest(session.token, target.id, reason);
        requestsState.reload();
      }

      closeAdminDelete();
      setNotice({
        message: 'Карточка удалена, причина отправлена владельцу в Telegram.',
        tone: 'success',
      });
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Не удалось удалить карточку.',
        tone: 'danger',
      });
    } finally {
      setIsAdminDeleting(false);
    }
  }

  async function handleApplicationSubmit(event: FormEvent<HTMLFormElement>, target: ComposerTarget) {
    event.preventDefault();

    if (!session) {
      return;
    }

    setIsApplying(true);
    setNotice(null);

    try {
      await createApplication(session.token, {
        message: applicationMessage.trim() || undefined,
        offerId: target.kind === 'offer' ? target.id : undefined,
        skillRequestId: target.kind === 'request' ? target.id : undefined,
      });

      closeComposer();
      setNotice({
        message: target.kind === 'offer' ? 'Запрос отправлен.' : 'Предложение помощи отправлено.',
        tone: 'success',
      });
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Не удалось отправить отклик.',
        tone: 'danger',
      });
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="page-stack">
      {notice ? <Notice message={notice.message} tone={notice.tone} /> : null}

      <ExploreHero
        activeSkillName={activeSkillName}
        appliedSkillId={appliedSkillId}
        filterSkills={filterSkillsState.data}
        filterSkillsLoading={filterSkillsState.loading}
        onApplySkill={applySkillFilter}
        onSelectedSkillChange={setSelectedSkillId}
        selectedSkillId={selectedSkillId}
      />

      <Surface
        actions={
          <div className="tab-row">
            <button
              className={listingMode === 'offer' ? 'tab-button tab-button--active' : 'tab-button'}
              onClick={() => startTransition(() => setListingMode('offer'))}
              type="button"
            >
              Предложения
            </button>
            <button
              className={listingMode === 'request' ? 'tab-button tab-button--active' : 'tab-button'}
              onClick={() => startTransition(() => setListingMode('request'))}
              type="button"
            >
              Запросы
            </button>
          </div>
        }
        description={isPending ? 'Переключаем режим...' : 'Актуальная лента карточек обмена.'}
        title="Живая витрина"
      >
        {listingMode === 'offer' ? (
          <>
            <OfferFilters
              disabled={!session}
              exchangeFilter={offerExchangeFilter}
              onExchangeFilterChange={(value) => {
                setOfferPage(1);
                setOfferExchangeFilter(value);
              }}
              onSkillFilterChange={(value) => {
                setOfferPage(1);
                setOfferSkillFilter(value);
              }}
              skillFilter={offerSkillFilter}
            />
            {!session ? (
              <small className="field-hint">
                Войди в систему, чтобы фильтровать предложения по своим навыкам и взаимному обмену.
              </small>
            ) : (
              <small className="field-hint">
                Взаимный обмен ищет авторов предложений, которые хотят изучить хотя бы один из твоих навыков.
              </small>
            )}
            {renderOfferList()}
          </>
        ) : (
          <>
            <RequestFilters
              capabilityFilter={requestCapabilityFilter}
              disabled={!session}
              exchangeFilter={requestExchangeFilter}
              onCapabilityFilterChange={(value) => {
                setRequestPage(1);
                setRequestCapabilityFilter(value);
              }}
              onExchangeFilterChange={(value) => {
                setRequestPage(1);
                setRequestExchangeFilter(value);
              }}
            />
            {!session ? (
              <small className="field-hint">
                Войди в систему, чтобы фильтровать запросы по своим навыкам и взаимному обмену.
              </small>
            ) : (
              <small className="field-hint">
                Взаимный обмен ищет авторов запросов, у которых есть навык, нужный тебе по открытому запросу.
              </small>
            )}
            {renderRequestList()}
          </>
        )}
      </Surface>
    </div>
  );

  function renderOfferList() {
    if (offersState.loading && offersState.data === null) {
      return <LoadingBlock label="Подгружаем предложения..." />;
    }

    if (offersState.error) {
      return <EmptyState description={offersState.error} title="Не удалось загрузить предложения" />;
    }

    if (offerItems.length === 0) {
      return (
        <EmptyState
          description="По текущим фильтрам подходящих предложений не нашлось."
          title="Нет предложений"
        />
      );
    }

    return (
      <div className={offerListIsRefreshing ? 'list-stack list-stack--updating' : 'list-stack'}>
        {offerListIsRefreshing ? (
          <div className="results-status" role="status">
            Обновляем предложения без резкого перерендера страницы.
          </div>
        ) : null}

        {offerItems.map((offer) => (
          <OfferCard
            adminDeleteTarget={adminDeleteTarget}
            adminDeletionReason={adminDeletionReason}
            applicationMessage={applicationMessage}
            composer={composer}
            iHaveOfferSkill={mySkillIds.has(offer.skillId)}
            isAdminDeleting={isAdminDeleting}
            isApplying={isApplying}
            key={offer.offerId}
            offer={offer}
            onAdminDeleteSubmit={handleAdminDeleteSubmit}
            onAdminDeletionReasonChange={setAdminDeletionReason}
            onApplicationMessageChange={setApplicationMessage}
            onApplicationSubmit={handleApplicationSubmit}
            onAuthClick={() => navigate('/auth')}
            onCloseAdminDelete={closeAdminDelete}
            onCloseComposer={closeComposer}
            onOpenAdminDelete={openAdminDelete}
            onOpenComposer={openComposer}
            session={session}
          />
        ))}

        <Pagination
          onPageChange={setOfferPage}
          page={offerPage}
          totalPages={Math.max(offersState.data?.totalPages ?? 1, 1)}
        />
      </div>
    );
  }

  function renderRequestList() {
    if (requestsState.loading && requestsState.data === null) {
      return <LoadingBlock label="Подгружаем запросы..." />;
    }

    if (requestsState.error) {
      return <EmptyState description={requestsState.error} title="Не удалось загрузить запросы" />;
    }

    if (requestItems.length === 0) {
      return (
        <EmptyState
          description="По текущим фильтрам запросов не нашлось."
          title="Пустая лента"
        />
      );
    }

    return (
      <div className={requestListIsRefreshing ? 'list-stack list-stack--updating' : 'list-stack'}>
        {requestListIsRefreshing ? (
          <div className="results-status" role="status">
            Обновляем запросы без резкого перерендера страницы.
          </div>
        ) : null}

        {requestItems.map((request) => (
          <RequestCard
            adminDeleteTarget={adminDeleteTarget}
            adminDeletionReason={adminDeletionReason}
            applicationMessage={applicationMessage}
            canHelpWithRequest={mySkillIds.has(request.skillId)}
            composer={composer}
            isAdminDeleting={isAdminDeleting}
            isApplying={isApplying}
            key={request.requestId}
            onAdminDeleteSubmit={handleAdminDeleteSubmit}
            onAdminDeletionReasonChange={setAdminDeletionReason}
            onApplicationMessageChange={setApplicationMessage}
            onApplicationSubmit={handleApplicationSubmit}
            onAuthClick={() => navigate('/auth')}
            onCloseAdminDelete={closeAdminDelete}
            onCloseComposer={closeComposer}
            onOpenAdminDelete={openAdminDelete}
            onOpenComposer={openComposer}
            request={request}
            session={session}
          />
        ))}

        <Pagination
          onPageChange={setRequestPage}
          page={requestPage}
          totalPages={Math.max(requestsState.data?.totalPages ?? 1, 1)}
        />
      </div>
    );
  }
}
