import { Link } from 'react-router-dom';

import { LoadingBlock, Metric, Surface } from '../components/Ui';
import { getSkillOffers, getSkillRequests } from '../lib/api';
import { formatCompactNumber } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';

export function HomePage() {
  const offersState = useAsyncData([], () => getSkillOffers({ isActive: true, pageSize: 1 }));
  const requestsState = useAsyncData([], () => getSkillRequests({ pageSize: 1, status: 0 }));

  const metricItems = [
    {
      caption: 'активные карточки от пользователей',
      label: 'Предложения',
      value: formatCompactNumber(offersState.data?.totalCount ?? 0),
    },
    {
      caption: 'открытые запросы на обучение и обмен',
      label: 'Запросы',
      value: formatCompactNumber(requestsState.data?.totalCount ?? 0),
    },
  ];

  return (
    <div className="page-stack">
      <Surface className="hero-panel">
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>Платформа для обмена знаниями и поиска людей по навыкам</h1>
            <p className="hero-text">
              KnowledgeForKnowledge помогает находить людей, которые готовы обучить навыку, принять помощь или договориться об обмене. В профиле видны навыки, образование, отзывы и подтверждения, а в каталоге можно быстро найти подходящие запросы и предложения.
            </p>

            <div className="hero-actions">
              <Link className="button button--primary" to="/explore">
                Перейти в каталог
              </Link>
              <Link className="button button--ghost" to="/dashboard">
                Открыть кабинет
              </Link>
            </div>
          </div>

          <div className="hero-preview">
            <p className="eyebrow">Что умеет платформа</p>
            <div className="preview-stack">
              <div className="preview-card">
                <strong>Понятный профиль</strong>
                <p>У каждого пользователя есть карточка с навыками, образованием, описанием, отзывами и пруфами.</p>
              </div>
              <div className="preview-card">
                <strong>Запросы и помощь</strong>
                <p>Можно написать, чему хочешь научиться, или предложить навык, с которым готов помочь.</p>
              </div>
              <div className="preview-card">
                <strong>Отклики и доверие</strong>
                <p>Люди откликаются на карточки, а админ проверяет подтверждения навыков и убирает лишнее.</p>
              </div>
            </div>
          </div>
        </div>
      </Surface>

      {offersState.loading || requestsState.loading ? (
        <Surface>
          <LoadingBlock label="Обновляем счётчики платформы..." />
        </Surface>
      ) : (
        <div className="metric-grid metric-grid--compact">
          {metricItems.map((metric) => (
            <Metric caption={metric.caption} key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>
      )}
    </div>
  );
}
