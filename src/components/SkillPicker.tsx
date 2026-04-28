import { SearchPicker } from './SearchPicker';

type SkillOption = {
  skillId: string;
  skillName: string;
};

interface SkillPickerProps {
  disabled?: boolean;
  emptyMessage?: string;
  onChange: (skillId: string) => void;
  options: SkillOption[];
  placeholder?: string;
  value: string;
}

export function SkillPicker({
  disabled = false,
  emptyMessage = 'Ничего не найдено. Попробуй уточнить название.',
  onChange,
  options,
  placeholder = 'Начни вводить название навыка',
  value,
}: SkillPickerProps) {
  return (
    <SearchPicker
      disabled={disabled}
      emptyMessage={emptyMessage}
      idleHint="Если ввести часть названия, поиск покажет ближайшие подходящие навыки."
      onChange={onChange}
      options={options.map((option) => ({
        label: option.skillName,
        value: option.skillId,
      }))}
      placeholder={placeholder}
      promptMessage="Напечатай хотя бы часть названия навыка."
      value={value}
    />
  );
}
