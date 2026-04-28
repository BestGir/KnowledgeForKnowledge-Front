import { type ReactNode } from 'react';

import { initials } from '../lib/format';

type NoticeTone = 'danger' | 'info' | 'success';
type StatusTone = 'accent' | 'danger' | 'neutral' | 'success' | 'warning';

interface SurfaceProps {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  title?: string;
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

export function Surface({ actions, children, className, description, eyebrow, title }: SurfaceProps) {
  return (
    <section className={joinClassNames('surface', className)}>
      {(title || description || eyebrow || actions) && (
        <div className="surface-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
            {description ? <p className="surface-description">{description}</p> : null}
          </div>
          {actions ? <div className="surface-actions">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusTag({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return <span className={joinClassNames('status-tag', `status-tag--${tone}`)}>{label}</span>;
}

export function Notice({ message, tone = 'info' }: { message: string; tone?: NoticeTone }) {
  return <div className={joinClassNames('notice', `notice--${tone}`)}>{message}</div>;
}

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label = 'Загрузка данных...' }: { label?: string }) {
  return (
    <div className="loading-block">
      <span className="loading-dot" />
      <span>{label}</span>
    </div>
  );
}

export function Avatar({
  imageUrl,
  name,
  size = 'md',
}: {
  imageUrl?: string | null;
  name: string;
  size?: 'lg' | 'md' | 'sm';
}) {
  return (
    <div className={joinClassNames('avatar', `avatar--${size}`)}>
      {imageUrl ? <img alt={name} src={imageUrl} /> : <span>{initials(name) || 'K'}</span>}
    </div>
  );
}

export function Metric({
  caption,
  label,
  value,
}: {
  caption: string;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <p className="metric-value">{value}</p>
      <h3>{label}</h3>
      <p>{caption}</p>
    </div>
  );
}

type PaginationItem = number | 'ellipsis';

function buildPaginationItems(page: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
  }

  if (page >= totalPages - 3) {
    return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages];
}

export function Pagination({
  onPageChange,
  page,
  totalPages,
}: {
  onPageChange: (page: number) => void;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const items = buildPaginationItems(page, totalPages);

  return (
    <nav aria-label="Pagination" className="pagination">
      <button className="pagination__button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">
        Назад
      </button>

      {items.map((item, index) =>
        item === 'ellipsis' ? (
          <span aria-hidden="true" className="pagination__ellipsis" key={`ellipsis-${index}`}>
            ...
          </span>
        ) : (
          <button
            aria-current={item === page ? 'page' : undefined}
            className={joinClassNames('pagination__button', item === page && 'pagination__button--active')}
            key={item}
            onClick={() => onPageChange(item)}
            type="button"
          >
            {item}
          </button>
        ),
      )}

      <button className="pagination__button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button">
        Далее
      </button>
    </nav>
  );
}
