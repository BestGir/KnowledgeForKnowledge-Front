import type { ExchangeFilter, OfferSkillFilter, RequestCapabilityFilter } from './exploreTypes';

interface OfferFiltersProps {
  disabled: boolean;
  exchangeFilter: ExchangeFilter;
  onExchangeFilterChange: (value: ExchangeFilter) => void;
  onSkillFilterChange: (value: OfferSkillFilter) => void;
  skillFilter: OfferSkillFilter;
}

interface RequestFiltersProps {
  capabilityFilter: RequestCapabilityFilter;
  disabled: boolean;
  exchangeFilter: ExchangeFilter;
  onCapabilityFilterChange: (value: RequestCapabilityFilter) => void;
  onExchangeFilterChange: (value: ExchangeFilter) => void;
}

export function OfferFilters({
  disabled,
  exchangeFilter,
  onExchangeFilterChange,
  onSkillFilterChange,
  skillFilter,
}: OfferFiltersProps) {
  return (
    <div className="request-filter-row">
      <div className="filter-cluster">
        <span className="meta-line">Фильтр предложений</span>
        <div className="tab-row">
          <button className={skillFilter === 'all' ? 'tab-button tab-button--active' : 'tab-button'} onClick={() => onSkillFilterChange('all')} type="button">
            Все
          </button>
          <button className={skillFilter === 'have-skill' ? 'tab-button tab-button--active' : 'tab-button'} disabled={disabled} onClick={() => onSkillFilterChange('have-skill')} type="button">
            Навык уже у меня
          </button>
          <button className={skillFilter === 'need-skill' ? 'tab-button tab-button--active' : 'tab-button'} disabled={disabled} onClick={() => onSkillFilterChange('need-skill')} type="button">
            Навыка у меня нет
          </button>
        </div>
      </div>

      <div className="filter-cluster">
        <span className="meta-line">Режим обмена</span>
        <div className="tab-row">
          <button className={exchangeFilter === 'all' ? 'tab-button tab-button--active' : 'tab-button'} onClick={() => onExchangeFilterChange('all')} type="button">
            Любые
          </button>
          <button className={exchangeFilter === 'mutual' ? 'tab-button tab-button--active' : 'tab-button'} disabled={disabled} onClick={() => onExchangeFilterChange('mutual')} type="button">
            Только взаимный обмен
          </button>
        </div>
      </div>
    </div>
  );
}

export function RequestFilters({
  capabilityFilter,
  disabled,
  exchangeFilter,
  onCapabilityFilterChange,
  onExchangeFilterChange,
}: RequestFiltersProps) {
  return (
    <div className="request-filter-row">
      <div className="filter-cluster">
        <span className="meta-line">Фильтр запросов</span>
        <div className="tab-row">
          <button className={capabilityFilter === 'all' ? 'tab-button tab-button--active' : 'tab-button'} onClick={() => onCapabilityFilterChange('all')} type="button">
            Все
          </button>
          <button className={capabilityFilter === 'can-help' ? 'tab-button tab-button--active' : 'tab-button'} disabled={disabled} onClick={() => onCapabilityFilterChange('can-help')} type="button">
            Могу помочь
          </button>
          <button className={capabilityFilter === 'cant-help' ? 'tab-button tab-button--active' : 'tab-button'} disabled={disabled} onClick={() => onCapabilityFilterChange('cant-help')} type="button">
            Не могу помочь
          </button>
        </div>
      </div>

      <div className="filter-cluster">
        <span className="meta-line">Режим обмена</span>
        <div className="tab-row">
          <button className={exchangeFilter === 'all' ? 'tab-button tab-button--active' : 'tab-button'} onClick={() => onExchangeFilterChange('all')} type="button">
            Любые
          </button>
          <button className={exchangeFilter === 'mutual' ? 'tab-button tab-button--active' : 'tab-button'} disabled={disabled} onClick={() => onExchangeFilterChange('mutual')} type="button">
            Только взаимный обмен
          </button>
        </div>
      </div>
    </div>
  );
}
