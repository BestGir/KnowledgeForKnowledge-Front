import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { Avatar, EmptyState, LoadingBlock, Notice, Pagination, StatusTag, Surface } from '../components/Ui';
import {
  createApplication,
  deleteSkillOffer,
  deleteSkillRequest,
  getEducations,
  getProfile,
  getProofs,
  getReviews,
  getSkillOffers,
  getSkillRequests,
  getUserSkills,
  resolveAssetUrl,
} from '../lib/api';
import { formatDate, formatDateOnly, formatSkillLevel } from '../lib/format';
import { parseTelegramInput } from '../lib/telegram';
import { useAsyncData } from '../lib/useAsyncData';

const profileSectionPageSize = 4;
const educationSectionPageSize = 6;
const defaultApplicationMessage = 'Привет! Хочу обсудить карточку и договориться о формате общения.';

type ComposerTarget = {
  id: string;
  kind: 'offer' | 'request';
  title: string;
};

type AdminDeleteTarget = {
  id: string;
  kind: 'offer' | 'request';
  title: string;
};

type NoticeState = { message: string; tone: 'danger' | 'info' | 'success' } | null;

function renderContactInfo(contactInfo: string | null) {
  if (!contactInfo) {
    return null;
  }

  const parsedContact = parseTelegramInput(contactInfo);

  if (parsedContact.kind === 'username') {
    return (
      <a className="status-tag status-tag--accent" href={parsedContact.link} rel="noreferrer" target="_blank">
        {parsedContact.displayValue}
      </a>
    );
  }

  return <StatusTag label={contactInfo} tone="accent" />;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { accountId = '' } = useParams();
  const { session } = useAuth();
  const [skillPage, setSkillPage] = useState(1);
  const [educationPage, setEducationPage] = useState(1);
  const [offerPage, setOfferPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [composer, setComposer] = useState<ComposerTarget | null>(null);
  const [applicationMessage, setApplicationMessage] = useState(defaultApplicationMessage);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [adminDeleteTarget, setAdminDeleteTarget] = useState<AdminDeleteTarget | null>(null);
  const [adminDeletionReason, setAdminDeletionReason] = useState('');
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  const profileState = useAsyncData([accountId, session?.token ?? 'anonymous'], () => getProfile(accountId, session?.token));
  const offersState = useAsyncData([accountId, offerPage], () =>
    getSkillOffers({ accountId, isActive: true, page: offerPage, pageSize: profileSectionPageSize }),
  );
  const requestsState = useAsyncData([accountId, requestPage], () =>
    getSkillRequests({ accountId, page: requestPage, pageSize: profileSectionPageSize, status: 0 }),
  );
  const reviewsState = useAsyncData([accountId], () => getReviews(accountId));
  const profileSkillsState = useAsyncData([accountId, session?.token ?? 'anonymous'], () =>
    session?.token ? getUserSkills(accountId, session.token) : Promise.resolve([]),
  );
  const viewerSkillsState = useAsyncData([session?.accountId ?? 'anonymous', session?.token ?? 'anonymous'], () =>
    session?.token ? getUserSkills(session.accountId, session.token) : Promise.resolve([]),
  );
  const proofsState = useAsyncData([accountId, session?.token ?? 'anonymous'], () =>
    session?.token ? getProofs(accountId, session.token) : Promise.resolve([]),
  );
  const educationState = useAsyncData([accountId, session?.token ?? 'anonymous'], () =>
    session?.token ? getEducations(accountId, session.token) : Promise.resolve([]),
  );

  const profileSkills = profileSkillsState.data ?? [];
  const viewerSkillIds = useMemo(
    () => new Set((viewerSkillsState.data ?? []).map((skill) => skill.skillId)),
    [viewerSkillsState.data],
  );
  const educationItems = educationState.data ?? [];
  const skillTotalPages = Math.max(1, Math.ceil(profileSkills.length / profileSectionPageSize));
  const educationTotalPages = Math.max(1, Math.ceil(educationItems.length / educationSectionPageSize));
  const pagedSkills = profileSkills.slice((skillPage - 1) * profileSectionPageSize, skillPage * profileSectionPageSize);
  const pagedEducations = educationItems.slice(
    (educationPage - 1) * educationSectionPageSize,
    educationPage * educationSectionPageSize,
  );

  function getProofsForSkill(skillId: string) {
    return (proofsState.data ?? []).filter((proof) => proof.skillId === skillId);
  }

  function openComposer(target: ComposerTarget) {
    if (!session) {
      navigate('/auth');
      return;
    }

    setComposer(target);
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
    setAdminDeleteTarget(target);
    setAdminDeletionReason('');
    setNotice(null);
  }

  function closeAdminDelete() {
    setAdminDeleteTarget(null);
    setAdminDeletionReason('');
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
        message: target.kind === 'offer' ? 'Запрос к предложению отправлен.' : 'Предложение помощи отправлено.',
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

  async function handleAdminCardDelete(event: FormEvent<HTMLFormElement>, target: AdminDeleteTarget) {
    event.preventDefault();

    if (!session?.isAdmin) {
      return;
    }

    setIsDeletingCard(true);
    setNotice(null);

    try {
      const deletionReason = adminDeletionReason.trim() || undefined;
      if (target.kind === 'offer') {
        await deleteSkillOffer(session.token, target.id, deletionReason);
      } else {
        await deleteSkillRequest(session.token, target.id, deletionReason);
      }

      closeAdminDelete();
      if (composer?.kind === target.kind && composer.id === target.id) {
        closeComposer();
      }
      if (target.kind === 'offer') {
        await offersState.reload();
      } else {
        await requestsState.reload();
      }
      setNotice({
        message: `${target.kind === 'offer' ? 'Предложение' : 'Запрос'} «${target.title}» удалено.`,
        tone: 'success',
      });
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Не удалось удалить карточку.',
        tone: 'danger',
      });
    } finally {
      setIsDeletingCard(false);
    }
  }

  useEffect(() => {
    setSkillPage(1);
    setEducationPage(1);
    setOfferPage(1);
    setRequestPage(1);
    closeComposer();
    closeAdminDelete();
  }, [accountId]);

  useEffect(() => {
    if (skillPage > skillTotalPages) {
      setSkillPage(skillTotalPages);
    }
  }, [skillPage, skillTotalPages]);

  useEffect(() => {
    if (educationPage > educationTotalPages) {
      setEducationPage(educationTotalPages);
    }
  }, [educationPage, educationTotalPages]);

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
    closeComposer();
    closeAdminDelete();
  }, [offerPage, requestPage]);

  if (!accountId) {
    return (
      <Surface title="Профиль не найден">
        <EmptyState
          action={
            <Link className="button button--primary" to="/explore">
              Вернуться в каталог
            </Link>
          }
          description="В адресе не хватает идентификатора аккаунта."
          title="Некорректный маршрут"
        />
      </Surface>
    );
  }

  return (
    <div className="page-stack">
      {notice ? <Notice message={notice.message} tone={notice.tone} /> : null}

      <Surface className="profile-hero">
        {profileState.loading ? (
          <LoadingBlock label="Загружаем профиль..." />
        ) : profileState.data ? (
          <div className="profile-hero-grid">
            <div className="profile-hero-main">
              <Avatar imageUrl={resolveAssetUrl(profileState.data.photoUrl)} name={profileState.data.fullName} size="lg" />
              <div className="profile-hero-copy">
                <p className="eyebrow">Публичная карточка</p>
                <h1>{profileState.data.fullName || 'Профиль без имени'}</h1>
                <p className="hero-text">{profileState.data.description || 'Пользователь пока не добавил описание.'}</p>
                <div className="button-row">
                  {renderContactInfo(profileState.data.contactInfo)}
                  <StatusTag label={profileState.data.isActive ? 'Active' : 'Inactive'} tone={profileState.data.isActive ? 'success' : 'warning'} />
                </div>
              </div>
            </div>
            <div className="detail-panel">
              <span className="eyebrow">Метаданные</span>
              <p>Дата рождения: {formatDateOnly(profileState.data.dateOfBirth)}</p>
              <p>Отзывы: {reviewsState.data?.averageRating.toFixed(1) ?? '0.0'} / 5</p>
            </div>
          </div>
        ) : (
          <EmptyState description="Backend не вернул данные по этому пользователю." title="Профиль пуст" />
        )}
      </Surface>

      <div className="profile-sections-grid">
        <Surface className="profile-section-card" description="Навыки пользователя. Для чтения этой части нужна авторизация." title="Навыки">
          {session ? (
            profileSkillsState.loading || proofsState.loading ? (
              <LoadingBlock label="Смотрим навыки..." />
            ) : profileSkillsState.error || proofsState.error ? (
              <EmptyState
                action={
                  <button
                    className="button button--ghost"
                    onClick={() => {
                      profileSkillsState.reload();
                      proofsState.reload();
                    }}
                    type="button"
                  >
                    Повторить
                  </button>
                }
                description={profileSkillsState.error || proofsState.error || 'Не удалось загрузить навыки пользователя.'}
                title="Не удалось загрузить навыки"
              />
            ) : profileSkills.length > 0 ? (
              <div className="list-stack">
                <div className="profile-card-grid">
                  {pagedSkills.map((skill) => {
                    const skillProofs = getProofsForSkill(skill.skillId);
                    const verifiedProofs = skillProofs.filter((proof) => proof.isVerified);

                    return (
                      <article className="list-card skill-card profile-card-grid__item" key={skill.skillId}>
                        <div className="list-card-top">
                          <strong>{skill.skillName}</strong>
                          {skillProofs.length > 0 ? (
                            <StatusTag
                              label={skill.isVerified ? 'Подтверждён' : 'Требует подтверждения'}
                              tone={skill.isVerified ? 'success' : 'warning'}
                            />
                          ) : null}
                        </div>
                        <p className="meta-line">{formatSkillLevel(skill.level)}</p>
                        <p>{skill.description || 'Краткое описание не указано.'}</p>
                        <p className="meta-line">Где изучал: {skill.learnedAt || 'Не указано'}</p>
                        {verifiedProofs.length > 0 ? (
                          <div className="skill-card__proofs">
                            {verifiedProofs.map((proof, index) => (
                              <a
                                className="skill-proof-link"
                                href={resolveAssetUrl(proof.fileUrl)}
                                key={proof.proofId}
                                rel="noreferrer"
                                target="_blank"
                              >
                                Приложение {index + 1}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
                <Pagination onPageChange={setSkillPage} page={skillPage} totalPages={skillTotalPages} />
              </div>
            ) : (
              <EmptyState description="Пользователь ещё не добавил навыки." title="Список пуст" />
            )
          ) : (
            <EmptyState description="Войди в систему, чтобы увидеть закрытые разделы профиля." title="Нужна авторизация" />
          )}
        </Surface>

        <Surface className="profile-section-card" description="Образование пользователя." title="Образование">
          {session ? (
            educationState.loading ? (
              <LoadingBlock label="Проверяем образование..." />
            ) : educationState.error ? (
              <EmptyState
                action={
                  <button className="button button--ghost" onClick={() => educationState.reload()} type="button">
                    Повторить
                  </button>
                }
                description={educationState.error}
                title="Не удалось загрузить образование"
              />
            ) : educationItems.length > 0 ? (
              <div className="list-stack">
                <div className="profile-card-grid">
                  {pagedEducations.map((education) => (
                    <article className="list-card skill-card profile-card-grid__item profile-card-grid__item--education" key={education.educationId}>
                      <div className="list-card-top">
                        <strong>{education.institutionName}</strong>
                        <StatusTag label={education.yearCompleted ? String(education.yearCompleted) : 'Не указано'} tone="accent" />
                      </div>
                      <p>{education.degreeField || 'Направление не указано'}</p>
                    </article>
                  ))}
                </div>
                <Pagination onPageChange={setEducationPage} page={educationPage} totalPages={educationTotalPages} />
              </div>
            ) : (
              <EmptyState description="Записей об образовании пока нет." title="Список пуст" />
            )
          ) : (
            <EmptyState description="Этот раздел открывается только после авторизации." title="Нужна авторизация" />
          )}
        </Surface>

        <Surface className="profile-section-card" description="Только активные предложения пользователя." title="Предложения">
          {offersState.loading ? (
            <LoadingBlock label="Смотрим предложения..." />
          ) : offersState.error ? (
            <EmptyState
              action={
                <button className="button button--ghost" onClick={() => offersState.reload()} type="button">
                  Повторить
                </button>
              }
              description={offersState.error}
              title="Не удалось загрузить предложения"
            />
          ) : offersState.data && offersState.data.items.length > 0 ? (
            <div className="list-stack">
              {offersState.data.items.map((offer) => {
                const composerTarget: ComposerTarget = {
                  id: offer.offerId,
                  kind: 'offer',
                  title: offer.title,
                };
                const composerOpen = composer?.kind === 'offer' && composer.id === offer.offerId;
                const iHaveOfferSkill = viewerSkillIds.has(offer.skillId);
                const adminOfferDeleteTarget: AdminDeleteTarget = { id: offer.offerId, kind: 'offer', title: offer.title };
                const adminDeleteOpen = adminDeleteTarget?.kind === 'offer' && adminDeleteTarget.id === offer.offerId;

                return (
                  <article className="list-card" key={offer.offerId}>
                    <div className="list-card-top">
                      <strong>{offer.title}</strong>
                      <StatusTag label={offer.skillName} tone="accent" />
                    </div>
                    <p>{offer.details || 'Подробности не добавлены.'}</p>
                    <div className="card-actions">
                      {session?.accountId === offer.accountId ? (
                        <StatusTag label="Моя карточка" tone="accent" />
                      ) : session ? (
                        <>
                          <StatusTag
                            label={viewerSkillsState.loading ? 'Проверяем мои навыки' : iHaveOfferSkill ? 'Навык уже у меня' : 'Навыка у меня нет'}
                            tone={viewerSkillsState.loading ? 'neutral' : iHaveOfferSkill ? 'warning' : 'success'}
                          />
                          <button
                            className="button button--ghost"
                            disabled={viewerSkillsState.loading}
                            onClick={() => (composerOpen ? closeComposer() : openComposer(composerTarget))}
                            type="button"
                          >
                            {composerOpen ? 'Скрыть форму' : 'Отправить запрос'}
                          </button>
                        </>
                      ) : (
                        <button className="button button--ghost" onClick={() => navigate('/auth')} type="button">
                          Войти, чтобы откликнуться
                        </button>
                      )}
                      {session?.isAdmin ? (
                        <button
                          className="button button--ghost"
                          disabled={isDeletingCard}
                          onClick={() =>
                            adminDeleteOpen ? closeAdminDelete() : openAdminDelete(adminOfferDeleteTarget)
                          }
                          type="button"
                        >
                          {adminDeleteOpen ? 'Скрыть удаление' : 'Удалить'}
                        </button>
                      ) : null}
                    </div>

                    {adminDeleteOpen ? (
                      <form className="inline-composer" onSubmit={(event) => handleAdminCardDelete(event, adminOfferDeleteTarget)}>
                        <label>
                          <span>Причина удаления</span>
                          <textarea
                            onChange={(event) => setAdminDeletionReason(event.target.value)}
                            placeholder="Например: карточка нарушает правила или содержит некорректные данные."
                            rows={4}
                            value={adminDeletionReason}
                          />
                        </label>
                        <div className="button-row">
                          <button className="button button--primary" disabled={isDeletingCard} type="submit">
                            {isDeletingCard ? 'Удаляем...' : 'Удалить карточку'}
                          </button>
                          <button className="button button--ghost" disabled={isDeletingCard} onClick={closeAdminDelete} type="button">
                            Отмена
                          </button>
                        </div>
                      </form>
                    ) : null}

                    {composerOpen ? (
                      <form className="inline-composer" onSubmit={(event) => handleApplicationSubmit(event, composerTarget)}>
                        <label>
                          <span>Запрос к предложению</span>
                          <textarea onChange={(event) => setApplicationMessage(event.target.value)} rows={4} value={applicationMessage} />
                        </label>
                        <div className="button-row">
                          <button className="button button--primary" disabled={isApplying} type="submit">
                            {isApplying ? 'Отправляем...' : 'Отправить'}
                          </button>
                          <button className="button button--ghost" onClick={closeComposer} type="button">
                            Отмена
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </article>
                );
              })}
              <Pagination onPageChange={setOfferPage} page={offerPage} totalPages={Math.max(offersState.data.totalPages, 1)} />
            </div>
          ) : (
            <EmptyState description="Активных предложений у пользователя нет." title="Пусто" />
          )}
        </Surface>

        <Surface className="profile-section-card" description="Только открытые запросы пользователя." title="Запросы">
          {requestsState.loading ? (
            <LoadingBlock label="Смотрим запросы..." />
          ) : requestsState.error ? (
            <EmptyState
              action={
                <button className="button button--ghost" onClick={() => requestsState.reload()} type="button">
                  Повторить
                </button>
              }
              description={requestsState.error}
              title="Не удалось загрузить запросы"
            />
          ) : requestsState.data && requestsState.data.items.length > 0 ? (
            <div className="list-stack">
              {requestsState.data.items.map((request) => {
                const composerTarget: ComposerTarget = {
                  id: request.requestId,
                  kind: 'request',
                  title: request.title,
                };
                const composerOpen = composer?.kind === 'request' && composer.id === request.requestId;
                const canHelpWithRequest = viewerSkillIds.has(request.skillId);
                const adminRequestDeleteTarget: AdminDeleteTarget = { id: request.requestId, kind: 'request', title: request.title };
                const adminDeleteOpen = adminDeleteTarget?.kind === 'request' && adminDeleteTarget.id === request.requestId;

                return (
                  <article className="list-card" key={request.requestId}>
                    <div className="list-card-top">
                      <strong>{request.title}</strong>
                      <StatusTag label={request.skillName} tone="accent" />
                    </div>
                    <p>{request.details || 'Подробности не добавлены.'}</p>
                    <div className="card-actions">
                      {session?.accountId === request.accountId ? (
                        <StatusTag label="Моя карточка" tone="accent" />
                      ) : session ? (
                        <>
                          <StatusTag
                            label={
                              viewerSkillsState.loading
                                ? 'Проверяем мои навыки'
                                : canHelpWithRequest
                                  ? 'Навык у меня есть'
                                  : 'Навыка у меня нет'
                            }
                            tone={viewerSkillsState.loading ? 'neutral' : canHelpWithRequest ? 'success' : 'warning'}
                          />
                          <button
                            className="button button--ghost"
                            disabled={viewerSkillsState.loading || !canHelpWithRequest}
                            onClick={() => (composerOpen ? closeComposer() : openComposer(composerTarget))}
                            type="button"
                          >
                            {composerOpen ? 'Скрыть форму' : 'Предложить помощь'}
                          </button>
                        </>
                      ) : (
                        <button className="button button--ghost" onClick={() => navigate('/auth')} type="button">
                          Войти, чтобы предложить помощь
                        </button>
                      )}
                      {session?.isAdmin ? (
                        <button
                          className="button button--ghost"
                          disabled={isDeletingCard}
                          onClick={() =>
                            adminDeleteOpen ? closeAdminDelete() : openAdminDelete(adminRequestDeleteTarget)
                          }
                          type="button"
                        >
                          {adminDeleteOpen ? 'Скрыть удаление' : 'Удалить'}
                        </button>
                      ) : null}
                    </div>

                    {adminDeleteOpen ? (
                      <form className="inline-composer" onSubmit={(event) => handleAdminCardDelete(event, adminRequestDeleteTarget)}>
                        <label>
                          <span>Причина удаления</span>
                          <textarea
                            onChange={(event) => setAdminDeletionReason(event.target.value)}
                            placeholder="Например: карточка нарушает правила или содержит некорректные данные."
                            rows={4}
                            value={adminDeletionReason}
                          />
                        </label>
                        <div className="button-row">
                          <button className="button button--primary" disabled={isDeletingCard} type="submit">
                            {isDeletingCard ? 'Удаляем...' : 'Удалить карточку'}
                          </button>
                          <button className="button button--ghost" disabled={isDeletingCard} onClick={closeAdminDelete} type="button">
                            Отмена
                          </button>
                        </div>
                      </form>
                    ) : null}

                    {composerOpen ? (
                      <form className="inline-composer" onSubmit={(event) => handleApplicationSubmit(event, composerTarget)}>
                        <label>
                          <span>Предложение помощи</span>
                          <textarea onChange={(event) => setApplicationMessage(event.target.value)} rows={4} value={applicationMessage} />
                        </label>
                        <div className="button-row">
                          <button className="button button--primary" disabled={isApplying} type="submit">
                            {isApplying ? 'Отправляем...' : 'Отправить'}
                          </button>
                          <button className="button button--ghost" onClick={closeComposer} type="button">
                            Отмена
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </article>
                );
              })}
              <Pagination onPageChange={setRequestPage} page={requestPage} totalPages={Math.max(requestsState.data.totalPages, 1)} />
            </div>
          ) : (
            <EmptyState description="Пользователь не публиковал запросы." title="Пусто" />
          )}
        </Surface>
      </div>

      <Surface description="Отзывы по завершённым сделкам." title="Отзывы">
        {reviewsState.loading ? (
          <LoadingBlock label="Собираем отзывы..." />
        ) : reviewsState.error ? (
          <EmptyState
            action={
              <button className="button button--ghost" onClick={() => reviewsState.reload()} type="button">
                Повторить
              </button>
            }
            description={reviewsState.error}
            title="Не удалось загрузить отзывы"
          />
        ) : reviewsState.data && reviewsState.data.items.length > 0 ? (
          <div className="list-stack">
            {reviewsState.data.items.map((review) => (
              <article className="list-card" key={review.reviewId}>
                <div className="list-card-top">
                  <strong>{review.authorName}</strong>
                  <div className="button-row">
                    {review.skillName ? <StatusTag label={review.skillName} tone="accent" /> : null}
                    <StatusTag label={`${review.rating} / 5`} tone="success" />
                  </div>
                </div>
                <p>{review.comment || 'Без текстового комментария.'}</p>
                <p className="meta-line">{formatDate(review.createdAt)}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState description="Пока никто не оставил отзывы этому пользователю." title="Нет отзывов" />
        )}
      </Surface>
    </div>
  );
}

