import { SkillPicker } from '../../components/SkillPicker';
import { Surface } from '../../components/Ui';
import type { PagedResult, Skill } from '../../lib/types';

interface ExploreHeroProps {
  activeSkillName: string;
  appliedSkillId: string;
  filterSkills: PagedResult<Skill> | null;
  filterSkillsLoading: boolean;
  onApplySkill: () => void;
  onSelectedSkillChange: (skillId: string) => void;
  selectedSkillId: string;
}

export function ExploreHero({
  activeSkillName,
  appliedSkillId,
  filterSkills,
  filterSkillsLoading,
  onApplySkill,
  onSelectedSkillChange,
  selectedSkillId,
}: ExploreHeroProps) {
  return (
    <Surface className="explore-hero">
      <div className="hero-grid hero-grid--compact">
        <div className="hero-copy">
          <h1>Поиск людей и сценариев обмена</h1>
          <p className="hero-text">
            Это каталог-витрина платформы: здесь можно найти предложения и запросы, отфильтровать их по теме,
            перейти в профиль автора и сразу откликнуться на подходящую карточку.
          </p>
        </div>

        <div className="filter-panel">
          <label>
            <span>Навык</span>
            <SkillPicker
              disabled={filterSkillsLoading}
              emptyMessage="В каталоге нет навыка с таким названием."
              onChange={onSelectedSkillChange}
              options={filterSkills?.items ?? []}
              placeholder="Начни вводить название навыка"
              value={selectedSkillId}
            />
            <small className="field-hint">
              {filterSkillsLoading
                ? 'Обновляем список навыков для фильтра.'
                : appliedSkillId && activeSkillName
                  ? `Сейчас витрина показывает карточки по навыку «${activeSkillName}».`
                  : 'Начни вводить название навыка, а список покажет подходящие варианты.'}
            </small>
          </label>

          <div className="button-row">
            <button
              className="button button--primary"
              disabled={filterSkillsLoading || selectedSkillId === appliedSkillId}
              onClick={onApplySkill}
              type="button"
            >
              Найти
            </button>
          </div>
        </div>
      </div>
    </Surface>
  );
}
