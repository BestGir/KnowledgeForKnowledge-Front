import { type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Avatar, StatusTag } from '../../components/Ui';
import { resolveAssetUrl } from '../../lib/api';
import { formatRequestStatus } from '../../lib/format';
import type { Session, SkillOffer, SkillRequest } from '../../lib/types';
import type { AdminDeleteTarget, ComposerTarget } from './exploreTypes';

type SubmitHandler = (event: FormEvent<HTMLFormElement>, target: ComposerTarget) => void;

interface CardActionsProps {
  adminDeleteTarget: AdminDeleteTarget | null;
  adminDeletionReason: string;
  applicationMessage: string;
  composer: ComposerTarget | null;
  isAdminDeleting: boolean;
  isApplying: boolean;
  onAdminDeleteSubmit: SubmitHandler;
  onAdminDeletionReasonChange: (value: string) => void;
  onApplicationMessageChange: (value: string) => void;
  onApplicationSubmit: SubmitHandler;
  onAuthClick: () => void;
  onCloseAdminDelete: () => void;
  onCloseComposer: () => void;
  onOpenAdminDelete: (target: AdminDeleteTarget) => void;
  onOpenComposer: (target: ComposerTarget) => void;
  session: Session | null;
}

interface OfferCardProps extends CardActionsProps {
  iHaveOfferSkill: boolean;
  offer: SkillOffer;
}

interface RequestCardProps extends CardActionsProps {
  canHelpWithRequest: boolean;
  request: SkillRequest;
}

function AdminDeleteButton({
  isOpen,
  onCloseAdminDelete,
  onOpenAdminDelete,
  session,
  target,
}: {
  isOpen: boolean;
  onCloseAdminDelete: () => void;
  onOpenAdminDelete: (target: AdminDeleteTarget) => void;
  session: Session | null;
  target: AdminDeleteTarget;
}) {
  if (!session?.isAdmin) {
    return null;
  }

  return (
    <button
      className="button button--ghost button--danger-action"
      onClick={() => (isOpen ? onCloseAdminDelete() : onOpenAdminDelete(target))}
      type="button"
    >
      {isOpen ? 'Скрыть удаление' : 'Удалить карточку'}
    </button>
  );
}

function AdminDeletePanel({
  adminDeletionReason,
  isAdminDeleting,
  isOpen,
  onAdminDeleteSubmit,
  onAdminDeletionReasonChange,
  onCloseAdminDelete,
  session,
  target,
}: {
  adminDeletionReason: string;
  isAdminDeleting: boolean;
  isOpen: boolean;
  onAdminDeleteSubmit: SubmitHandler;
  onAdminDeletionReasonChange: (value: string) => void;
  onCloseAdminDelete: () => void;
  session: Session | null;
  target: AdminDeleteTarget;
}) {
  if (!session?.isAdmin || !isOpen) {
    return null;
  }

  return (
    <form className="inline-composer" onSubmit={(event) => onAdminDeleteSubmit(event, target)}>
      <label>
        <span>Причина удаления</span>
        <textarea
          onChange={(event) => onAdminDeletionReasonChange(event.target.value)}
          placeholder="Например: карточка нарушает правила площадки или содержит некорректные данные."
          rows={3}
          value={adminDeletionReason}
        />
      </label>
      <small className="field-hint">
        После удаления эта причина уйдёт владельцу карточки в Telegram.
      </small>
      <div className="button-row">
        <button className="button button--primary" disabled={isAdminDeleting} type="submit">
          {isAdminDeleting ? 'Удаляем...' : 'Удалить и отправить причину'}
        </button>
        <button className="button button--ghost" onClick={onCloseAdminDelete} type="button">
          Отмена
        </button>
      </div>
    </form>
  );
}

function ApplicationComposer({
  applicationMessage,
  isApplying,
  isOpen,
  label,
  onApplicationMessageChange,
  onApplicationSubmit,
  onCloseComposer,
  target,
}: {
  applicationMessage: string;
  isApplying: boolean;
  isOpen: boolean;
  label: string;
  onApplicationMessageChange: (value: string) => void;
  onApplicationSubmit: SubmitHandler;
  onCloseComposer: () => void;
  target: ComposerTarget;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <form className="inline-composer" onSubmit={(event) => onApplicationSubmit(event, target)}>
      <label>
        <span>{label}</span>
        <textarea
          onChange={(event) => onApplicationMessageChange(event.target.value)}
          rows={4}
          value={applicationMessage}
        />
      </label>
      <div className="button-row">
        <button className="button button--primary" disabled={isApplying} type="submit">
          {isApplying ? 'Отправляем...' : 'Отправить'}
        </button>
        <button className="button button--ghost" onClick={onCloseComposer} type="button">
          Отмена
        </button>
      </div>
    </form>
  );
}

export function OfferCard({
  adminDeleteTarget,
  adminDeletionReason,
  applicationMessage,
  composer,
  iHaveOfferSkill,
  isAdminDeleting,
  isApplying,
  offer,
  onAdminDeleteSubmit,
  onAdminDeletionReasonChange,
  onApplicationMessageChange,
  onApplicationSubmit,
  onAuthClick,
  onCloseAdminDelete,
  onCloseComposer,
  onOpenAdminDelete,
  onOpenComposer,
  session,
}: OfferCardProps) {
  const target: ComposerTarget = {
    id: offer.offerId,
    kind: 'offer',
    title: offer.title,
  };
  const composerOpen = composer?.kind === 'offer' && composer.id === offer.offerId;
  const adminDeleteOpen = adminDeleteTarget?.kind === 'offer' && adminDeleteTarget.id === offer.offerId;

  return (
    <article className="list-card">
      <div className="list-card-top">
        <Link className="inline-author inline-author--link" to={`/profile/${offer.accountId}`}>
          <Avatar imageUrl={resolveAssetUrl(offer.authorPhotoUrl)} name={offer.authorName} />
          <div>
            <strong>{offer.authorName}</strong>
            <span>{offer.skillName}</span>
          </div>
        </Link>
        <StatusTag label="Активно" tone="success" />
      </div>

      <h3>{offer.title}</h3>
      <p>{offer.details || 'Карточка без подробностей.'}</p>

      <div className="card-actions">
        {session?.accountId === offer.accountId ? (
          <StatusTag label="Моя карточка" tone="accent" />
        ) : session ? (
          <>
            <StatusTag
              label={iHaveOfferSkill ? 'Навык уже у меня' : 'Навыка у меня нет'}
              tone={iHaveOfferSkill ? 'warning' : 'success'}
            />
            <button
              className="button button--ghost"
              onClick={() => (composerOpen ? onCloseComposer() : onOpenComposer(target))}
              type="button"
            >
              {composerOpen ? 'Скрыть форму' : 'Отправить запрос'}
            </button>
          </>
        ) : (
          <button className="button button--ghost" onClick={onAuthClick} type="button">
            Войти, чтобы отправить запрос
          </button>
        )}
        <AdminDeleteButton
          isOpen={adminDeleteOpen}
          onCloseAdminDelete={onCloseAdminDelete}
          onOpenAdminDelete={onOpenAdminDelete}
          session={session}
          target={target}
        />
      </div>

      <ApplicationComposer
        applicationMessage={applicationMessage}
        isApplying={isApplying}
        isOpen={composerOpen}
        label="Запрос к предложению"
        onApplicationMessageChange={onApplicationMessageChange}
        onApplicationSubmit={onApplicationSubmit}
        onCloseComposer={onCloseComposer}
        target={target}
      />
      <AdminDeletePanel
        adminDeletionReason={adminDeletionReason}
        isAdminDeleting={isAdminDeleting}
        isOpen={adminDeleteOpen}
        onAdminDeleteSubmit={onAdminDeleteSubmit}
        onAdminDeletionReasonChange={onAdminDeletionReasonChange}
        onCloseAdminDelete={onCloseAdminDelete}
        session={session}
        target={target}
      />
    </article>
  );
}

export function RequestCard({
  adminDeleteTarget,
  adminDeletionReason,
  applicationMessage,
  canHelpWithRequest,
  composer,
  isAdminDeleting,
  isApplying,
  onAdminDeleteSubmit,
  onAdminDeletionReasonChange,
  onApplicationMessageChange,
  onApplicationSubmit,
  onAuthClick,
  onCloseAdminDelete,
  onCloseComposer,
  onOpenAdminDelete,
  onOpenComposer,
  request,
  session,
}: RequestCardProps) {
  const target: ComposerTarget = {
    id: request.requestId,
    kind: 'request',
    title: request.title,
  };
  const composerOpen = composer?.kind === 'request' && composer.id === request.requestId;
  const adminDeleteOpen = adminDeleteTarget?.kind === 'request' && adminDeleteTarget.id === request.requestId;

  return (
    <article className="list-card">
      <div className="list-card-top">
        <Link className="inline-author inline-author--link" to={`/profile/${request.accountId}`}>
          <Avatar imageUrl={resolveAssetUrl(request.authorPhotoUrl)} name={request.authorName} />
          <div>
            <strong>{request.authorName}</strong>
            <span>{request.skillName}</span>
          </div>
        </Link>
        <StatusTag label={formatRequestStatus(request.status)} tone="accent" />
      </div>

      <h3>{request.title}</h3>
      <p>{request.details || 'Автор пока не расписал детали.'}</p>

      <div className="card-actions">
        {session?.accountId === request.accountId ? (
          <StatusTag label="Моя карточка" tone="accent" />
        ) : session ? (
          <>
            <StatusTag
              label={canHelpWithRequest ? 'Навык у меня есть' : 'Навыка у меня нет'}
              tone={canHelpWithRequest ? 'success' : 'warning'}
            />
            <button
              className="button button--ghost"
              disabled={!canHelpWithRequest}
              onClick={() => (composerOpen ? onCloseComposer() : onOpenComposer(target))}
              type="button"
            >
              {composerOpen ? 'Скрыть форму' : 'Предложить помощь'}
            </button>
          </>
        ) : (
          <button className="button button--ghost" onClick={onAuthClick} type="button">
            Войти, чтобы предложить помощь
          </button>
        )}
        <AdminDeleteButton
          isOpen={adminDeleteOpen}
          onCloseAdminDelete={onCloseAdminDelete}
          onOpenAdminDelete={onOpenAdminDelete}
          session={session}
          target={target}
        />
      </div>

      <ApplicationComposer
        applicationMessage={applicationMessage}
        isApplying={isApplying}
        isOpen={composerOpen}
        label="Предложение помощи"
        onApplicationMessageChange={onApplicationMessageChange}
        onApplicationSubmit={onApplicationSubmit}
        onCloseComposer={onCloseComposer}
        target={target}
      />
      <AdminDeletePanel
        adminDeletionReason={adminDeletionReason}
        isAdminDeleting={isAdminDeleting}
        isOpen={adminDeleteOpen}
        onAdminDeleteSubmit={onAdminDeleteSubmit}
        onAdminDeletionReasonChange={onAdminDeletionReasonChange}
        onCloseAdminDelete={onCloseAdminDelete}
        session={session}
        target={target}
      />
    </article>
  );
}
