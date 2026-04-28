import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { EmptyState, LoadingBlock, Notice, Pagination, StatusTag, Surface } from '../components/Ui';
import {
  createSkill,
  deleteSkillOffer,
  deleteSkillRequest,
  getSkillOffers,
  getSkillRequests,
  getSkills,
  getVerificationRequests,
  resolveAssetUrl,
  reviewVerificationRequest,
} from '../lib/api';
import {
  formatDate,
  formatSkillEpithet,
  formatSkillLevel,
  formatVerificationRequestType,
  formatVerificationStatus,
} from '../lib/format';
import { skillEpithetOptions } from '../lib/types';
import { useAsyncData } from '../lib/useAsyncData';

type NoticeState = { message: string; tone: 'danger' | 'info' | 'success' } | null;

const verificationStatusPending = 0;
const verificationStatusApproved = 1;
const verificationStatusRejected = 2;
const adminPageSize = 8;

function getVerificationTone(status: number | null | undefined) {
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

export function AdminPage() {
  const { isAuthenticated, session } = useAuth();
  const [notice, setNotice] = useState<NoticeState>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [verificationPage, setVerificationPage] = useState(1);
  const [offerPage, setOfferPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [skillCatalogPage, setSkillCatalogPage] = useState(1);
  const [skillSearch, setSkillSearch] = useState('');
  const [listingAuthorSearch, setListingAuthorSearch] = useState('');
  const [listingTitleSearch, setListingTitleSearch] = useState('');
  const [listingEpithetSearch, setListingEpithetSearch] = useState('');
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [skillForm, setSkillForm] = useState({
    epithet: 0,
    skillName: '',
  });

  const verificationState = useAsyncData([session?.token, session?.isAdmin, verificationPage, refreshToken], () =>
    session?.token && session.isAdmin
      ? getVerificationRequests(session.token, { page: verificationPage, pageSize: adminPageSize, status: verificationStatusPending })
      : Promise.resolve({ items: [], page: 1, pageSize: adminPageSize, totalCount: 0, totalPages: 0 }),
  );
  const offersState = useAsyncData(
    [session?.token, session?.isAdmin, offerPage, listingAuthorSearch, listingTitleSearch, listingEpithetSearch, refreshToken],
    () =>
    session?.token && session.isAdmin
      ? getSkillOffers({
          authorSearch: listingAuthorSearch.trim() || undefined,
          epithetSearch: listingEpithetSearch.trim() || undefined,
          isActive: true,
          page: offerPage,
          pageSize: adminPageSize,
          titleSearch: listingTitleSearch.trim() || undefined,
        })
      : Promise.resolve({ items: [], page: 1, pageSize: adminPageSize, totalCount: 0, totalPages: 0 }),
  );
  const requestsState = useAsyncData(
    [session?.token, session?.isAdmin, requestPage, listingAuthorSearch, listingTitleSearch, listingEpithetSearch, refreshToken],
    () =>
    session?.token && session.isAdmin
      ? getSkillRequests({
          authorSearch: listingAuthorSearch.trim() || undefined,
          epithetSearch: listingEpithetSearch.trim() || undefined,
          page: requestPage,
          pageSize: adminPageSize,
          status: 0,
          titleSearch: listingTitleSearch.trim() || undefined,
        })
      : Promise.resolve({ items: [], page: 1, pageSize: adminPageSize, totalCount: 0, totalPages: 0 }),
  );
  const catalogState = useAsyncData([session?.token, session?.isAdmin, skillCatalogPage, skillSearch, refreshToken], () =>
    session?.token && session.isAdmin
      ? getSkills({ page: skillCatalogPage, pageSize: 5, search: skillSearch.trim() || undefined })
      : Promise.resolve({ items: [], page: 1, pageSize: 5, totalCount: 0, totalPages: 0 }),
  );

  if (!isAuthenticated || !session) {
    return (
      <Surface description="Для страницы администратора нужно войти в аккаунт администратора." title="Админ закрыт">
        <Link className="button button--primary" to="/auth">
          Войти
        </Link>
      </Surface>
    );
  }

  if (!session.isAdmin) {
    return (
      <Surface description="Эта страница доступна только администраторам платформы." title="Недостаточно прав">
        <Link className="button button--ghost" to="/dashboard">
          Вернуться в кабинет
        </Link>
      </Surface>
    );
  }

  async function runAction(actionId: string, action: () => Promise<void>, successMessage: string) {
    setBusyAction(actionId);
    setNotice(null);

    try {
      await action();
      setNotice({ message: successMessage, tone: 'success' });
      setRefreshToken((current) => current + 1);
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Не удалось выполнить действие.',
        tone: 'danger',
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSkillSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = skillForm.skillName.trim();
    if (!normalizedName) {
      setNotice({ message: 'Укажи название нового навыка.', tone: 'danger' });
      return;
    }

    const existingSkills = await getSkills({ page: 1, pageSize: 10, search: normalizedName });
    const exactDuplicate = existingSkills.items.find((skill) => skill.skillName.toLowerCase() === normalizedName.toLowerCase());

    if (exactDuplicate) {
      setSkillSearch(normalizedName);
      setSkillCatalogPage(1);
      setNotice({
        message: `Навык «${exactDuplicate.skillName}» уже есть в каталоге. Ниже показал найденные совпадения.`,
        tone: 'danger',
      });
      return;
    }

    await runAction(
      'skill-create',
      async () => {
        await createSkill(session!.token, {
          epithet: skillForm.epithet,
          skillName: normalizedName,
        });
        setSkillForm({ epithet: 0, skillName: '' });
        setSkillSearch(normalizedName);
        setSkillCatalogPage(1);
      },
      'Навык добавлен в каталог.',
    );
  }

  function handleRejectionReasonChange(requestId: string, value: string) {
    setRejectionReasons((current) => ({
      ...current,
      [requestId]: value,
    }));
  }

  return (
    <div className="page-stack">
      <Surface
        className="hero-surface"
        description="Здесь собраны действия администратора: проверка пруфов, добавление навыков и уборка карточек витрины."
        eyebrow="Admin"
        title="Панель администратора"
      >
        <div className="metrics-grid metrics-grid--compact">
          <div className="metric-card">
            <p className="metric-value">{verificationState.data?.totalCount ?? 0}</p>
            <h3>Пруфы на проверке</h3>
            <p>Ожидают решения администратора</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{offersState.data?.totalCount ?? 0}</p>
            <h3>Активные предложения</h3>
            <p>Можно удалить из витрины</p>
          </div>
          <div className="metric-card">
            <p className="metric-value">{requestsState.data?.totalCount ?? 0}</p>
            <h3>Открытые запросы</h3>
            <p>Можно удалить из витрины</p>
          </div>
        </div>
      </Surface>

      {notice ? <Notice message={notice.message} tone={notice.tone} /> : null}

      <div className="content-grid content-grid--wide">
        <Surface
          description="В заявке видно пользователя, навык, уровень и файл. При отказе можно указать причину, она уйдёт человеку в Telegram."
          title="Проверка навыков"
        >
          {verificationState.loading ? (
            <LoadingBlock label="Загружаем заявки..." />
          ) : verificationState.error ? (
            <EmptyState description={verificationState.error} title="Не удалось загрузить заявки" />
          ) : verificationState.data?.items.length ? (
            <div className="list-stack">
              {verificationState.data.items.map((request) => (
                <article className="list-card" key={request.requestId}>
                  <div className="list-card-top">
                    <div>
                      <strong>{request.accountName}</strong>
                      <span className="meta-line">{formatDate(request.createdAt)}</span>
                    </div>
                    <StatusTag label={formatVerificationStatus(request.status)} tone={getVerificationTone(request.status)} />
                  </div>

                  <div className="admin-proof-grid">
                    <div>
                      <span className="meta-line">Навык</span>
                      <strong>{request.skillName || 'Навык не указан'}</strong>
                    </div>
                    <div>
                      <span className="meta-line">Уровень</span>
                      <strong>{formatSkillLevel(request.skillLevel)}</strong>
                    </div>
                    <div>
                      <span className="meta-line">Тип заявки</span>
                      <strong>{formatVerificationRequestType(request.requestType)}</strong>
                    </div>
                  </div>

                  {request.proofFileUrl ? (
                    <a className="button button--ghost admin-proof-file" href={resolveAssetUrl(request.proofFileUrl)} rel="noreferrer" target="_blank">
                      Открыть файл пруфа
                    </a>
                  ) : (
                    <p className="meta-line">Файл к заявке не приложен.</p>
                  )}

                  <label>
                    <span>Причина отказа</span>
                    <textarea
                      onChange={(event) => handleRejectionReasonChange(request.requestId, event.target.value)}
                      placeholder="Например: файл не читается, не видно автора сертификата, нужен другой документ..."
                      rows={3}
                      value={rejectionReasons[request.requestId] ?? ''}
                    />
                  </label>

                  <div className="button-row">
                    <button
                      className="button button--primary"
                      disabled={busyAction === `approve-${request.requestId}`}
                      onClick={() =>
                        runAction(
                          `approve-${request.requestId}`,
                          () => reviewVerificationRequest(session.token, request.requestId, verificationStatusApproved),
                          'Навык подтверждён.',
                        )
                      }
                      type="button"
                    >
                      Подтвердить навык
                    </button>
                    <button
                      className="button button--ghost"
                      disabled={busyAction === `reject-${request.requestId}`}
                      onClick={() =>
                        runAction(
                          `reject-${request.requestId}`,
                          () =>
                            reviewVerificationRequest(
                              session.token,
                              request.requestId,
                              verificationStatusRejected,
                              rejectionReasons[request.requestId]?.trim(),
                            ),
                          'Заявка отклонена, причина отправлена в Telegram при наличии привязки.',
                        )
                      }
                      type="button"
                    >
                      Отказать
                    </button>
                  </div>
                </article>
              ))}
              <Pagination onPageChange={setVerificationPage} page={verificationPage} totalPages={verificationState.data.totalPages} />
            </div>
          ) : (
            <EmptyState description="Сейчас нет навыков, ожидающих подтверждения." title="Очередь пустая" />
          )}
        </Surface>

        <Surface description="Новые навыки сразу попадают в общий каталог и становятся доступны пользователям." title="Добавить навык">
          <form className="form-grid" onSubmit={handleSkillSubmit}>
            <label>
              <span>Название навыка</span>
              <input
                onChange={(event) => setSkillForm((current) => ({ ...current, skillName: event.target.value }))}
                placeholder="Например: React, Docker, 3D Modeling"
                value={skillForm.skillName}
              />
            </label>
            <label>
              <span>Сфера</span>
              <select
                onChange={(event) => setSkillForm((current) => ({ ...current, epithet: Number(event.target.value) }))}
                value={skillForm.epithet}
              >
                {skillEpithetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button button--primary" disabled={busyAction === 'skill-create'} type="submit">
              {busyAction === 'skill-create' ? 'Добавляем...' : 'Добавить в каталог'}
            </button>
          </form>

          <div className="admin-skill-catalog">
            <label>
              <span>Поиск по каталогу</span>
              <input
                onChange={(event) => {
                  setSkillSearch(event.target.value);
                  setSkillCatalogPage(1);
                }}
                placeholder="Проверь похожие навыки перед добавлением"
                value={skillSearch}
              />
            </label>

            {catalogState.loading ? (
              <LoadingBlock label="Ищем навыки..." />
            ) : catalogState.error ? (
              <EmptyState description={catalogState.error} title="Каталог не загрузился" />
            ) : catalogState.data?.items.length ? (
              <div className="admin-skill-list">
                {catalogState.data.items.map((skill) => (
                  <article className="admin-skill-row" key={skill.skillId}>
                    <strong>{skill.skillName}</strong>
                    <StatusTag label={formatSkillEpithet(skill.epithet)} tone="accent" />
                  </article>
                ))}
                <Pagination onPageChange={setSkillCatalogPage} page={skillCatalogPage} totalPages={catalogState.data.totalPages} />
                <p className="meta-line">Показано по 5 навыков на странице. Всего найдено: {catalogState.data.totalCount}.</p>
              </div>
            ) : (
              <EmptyState description="По такому запросу навыков нет. Если название точное, его можно добавить." title="Ничего не найдено" />
            )}
          </div>
        </Surface>
      </div>

      <Surface
        description="Фильтры работают вместе: можно сузить список по автору, названию карточки и отрасли."
        title="Поиск по карточкам"
      >
        <div className="admin-search-grid">
          <label className="filter-cluster">
            <span>ФИО автора</span>
            <input
              onChange={(event) => {
                setListingAuthorSearch(event.target.value);
                setOfferPage(1);
                setRequestPage(1);
              }}
              placeholder="Например: Никита"
              value={listingAuthorSearch}
            />
          </label>
          <label className="filter-cluster">
            <span>Название карточки</span>
            <input
              onChange={(event) => {
                setListingTitleSearch(event.target.value);
                setOfferPage(1);
                setRequestPage(1);
              }}
              placeholder="Например: React"
              value={listingTitleSearch}
            />
          </label>
          <label className="filter-cluster">
            <span>Отрасль</span>
            <input
              onChange={(event) => {
                setListingEpithetSearch(event.target.value);
                setOfferPage(1);
                setRequestPage(1);
              }}
              placeholder="Например: ИТ, Дизайн"
              value={listingEpithetSearch}
            />
          </label>
        </div>
      </Surface>

      <div className="content-grid content-grid--balanced">
        <Surface description="Админ может удалить чужое предложение из витрины, если карточка мусорная или нарушает правила." title="Предложения">
          {offersState.loading ? (
            <LoadingBlock label="Загружаем предложения..." />
          ) : offersState.data?.items.length ? (
            <div className="list-stack">
              {offersState.data.items.map((offer) => (
                <article className="list-card" key={offer.offerId}>
                  <div className="list-card-top">
                    <div>
                      <strong>{offer.title}</strong>
                      <span className="meta-line">
                        {offer.authorName} · {offer.skillName} · {formatSkillEpithet(offer.skillEpithet)}
                      </span>
                    </div>
                    <StatusTag label="Предложение" tone="accent" />
                  </div>
                  <p>{offer.details || 'Описание не добавлено.'}</p>
                  <button
                    className="button button--ghost"
                    disabled={busyAction === `offer-delete-${offer.offerId}`}
                    onClick={() =>
                      runAction(
                        `offer-delete-${offer.offerId}`,
                        () => deleteSkillOffer(session.token, offer.offerId),
                        'Предложение удалено.',
                      )
                    }
                    type="button"
                  >
                    Удалить карточку
                  </button>
                </article>
              ))}
              <Pagination onPageChange={setOfferPage} page={offerPage} totalPages={offersState.data.totalPages} />
            </div>
          ) : (
            <EmptyState description="Активных предложений нет." title="Список пуст" />
          )}
        </Surface>

        <Surface description="Запросы тоже можно убрать из витрины, если они не должны быть видны пользователям." title="Запросы">
          {requestsState.loading ? (
            <LoadingBlock label="Загружаем запросы..." />
          ) : requestsState.data?.items.length ? (
            <div className="list-stack">
              {requestsState.data.items.map((request) => (
                <article className="list-card" key={request.requestId}>
                  <div className="list-card-top">
                    <div>
                      <strong>{request.title}</strong>
                      <span className="meta-line">
                        {request.authorName} · {request.skillName} · {formatSkillEpithet(request.skillEpithet)}
                      </span>
                    </div>
                    <StatusTag label="Запрос" tone="warning" />
                  </div>
                  <p>{request.details || 'Описание не добавлено.'}</p>
                  <button
                    className="button button--ghost"
                    disabled={busyAction === `request-delete-${request.requestId}`}
                    onClick={() =>
                      runAction(
                        `request-delete-${request.requestId}`,
                        () => deleteSkillRequest(session.token, request.requestId),
                        'Запрос удалён.',
                      )
                    }
                    type="button"
                  >
                    Удалить карточку
                  </button>
                </article>
              ))}
              <Pagination onPageChange={setRequestPage} page={requestPage} totalPages={requestsState.data.totalPages} />
            </div>
          ) : (
            <EmptyState description="Открытых запросов нет." title="Список пуст" />
          )}
        </Surface>
      </div>
    </div>
  );
}
