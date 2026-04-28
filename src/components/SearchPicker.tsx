import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { getBestSearchScore, normalizeSearchText } from '../lib/search';

export interface SearchPickerOption {
  aliases?: string[];
  label: string;
  value: string;
}

interface SearchPickerProps {
  disabled?: boolean;
  emptyMessage?: string;
  idleHint?: string;
  onChange: (value: string) => void;
  options: SearchPickerOption[];
  placeholder?: string;
  promptMessage?: string;
  value: string;
}

const maxVisibleOptions = 24;

export function SearchPicker({
  disabled = false,
  emptyMessage = 'Ничего не найдено. Попробуй уточнить запрос.',
  idleHint = 'Поиск терпит небольшие опечатки и поднимает самые близкие совпадения вверх.',
  onChange,
  options,
  placeholder = 'Начни вводить название',
  promptMessage = 'Напечатай хотя бы часть названия, чтобы увидеть варианты.',
  value,
}: SearchPickerProps) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const [inputQuery, setInputQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const query = isOpen ? inputQuery : selectedOption?.label ?? '';
  const normalizedQuery = normalizeSearchText(query);
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return [...options]
      .map((option) => ({
        option,
        score: getBestSearchScore(normalizedQuery, [option.label, ...(option.aliases ?? [])]),
      }))
      .filter((entry) => Number.isFinite(entry.score))
      .sort((left, right) => left.score - right.score || left.option.label.localeCompare(right.option.label, 'ru'))
      .slice(0, maxVisibleOptions)
      .map((entry) => entry.option);
  }, [normalizedQuery, options]);

  function handleInputChange(nextValue: string) {
    setInputQuery(nextValue);
    setIsOpen(true);

    if (value) {
      onChange('');
    }
  }

  function handleOptionSelect(option: SearchPickerOption) {
    onChange(option.value);
    setInputQuery(option.label);
    setIsOpen(false);
  }

  function handleClear() {
    setInputQuery('');
    setIsOpen(false);
    onChange('');
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (event.key === 'Enter' && filteredOptions[0]) {
      event.preventDefault();
      handleOptionSelect(filteredOptions[0]);
    }
  }

  return (
    <div className="skill-picker" ref={wrapperRef}>
      <div className="skill-picker__field">
        <input
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={isOpen}
          disabled={disabled}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            setInputQuery(selectedOption?.label ?? '');
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          type="text"
          value={query}
        />
        {query ? (
          <button className="skill-picker__clear" onClick={handleClear} type="button">
            Очистить
          </button>
        ) : null}
      </div>

      <div className="skill-picker__hint">
        {selectedOption ? `Выбрано: ${selectedOption.label}` : idleHint}
      </div>

      {isOpen ? (
        <div className="skill-picker__panel" id={listId} role="listbox">
          {normalizedQuery.length === 0 ? (
            <div className="skill-picker__empty">{promptMessage}</div>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                className={option.value === value ? 'skill-picker__option skill-picker__option--active' : 'skill-picker__option'}
                key={option.value}
                onClick={() => handleOptionSelect(option)}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="skill-picker__empty">{emptyMessage}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
