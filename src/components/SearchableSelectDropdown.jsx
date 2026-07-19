import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const normalizeSearchableText = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

const defaultGetOptionValue = (item) => String(item?.value ?? item?.id ?? item?.code ?? '').trim();
const defaultGetOptionLabel = (item) => String(item?.label ?? item?.name ?? item?.code ?? item?.id ?? '').trim();

const SearchableSelectDropdown = ({
  value = '',
  options = [],
  placeholder = '-- Pilih --',
  searchPlaceholder = 'Ketik untuk mencari...',
  emptyText = 'Tidak ada data yang cocok.',
  disabled = false,
  onChange,
  getOptionLabel = defaultGetOptionLabel,
  getOptionValue = defaultGetOptionValue,
  className = '',
  controlClassName = '',
}) => {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedValue = String(value || '').trim();
  const selectedOption = useMemo(
    () => (Array.isArray(options) ? options : []).find((option) => getOptionValue(option) === normalizedValue) || null,
    [options, normalizedValue, getOptionValue],
  );
  const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : normalizedValue;

  useEffect(() => {
    setQuery(selectedLabel || '');
  }, [selectedLabel]);

  const filteredOptions = useMemo(() => {
    const list = Array.isArray(options) ? options : [];
    const keyword = normalizeSearchableText(query);
    if (!keyword) return list;
    return list.filter((option) => {
      const candidateText = normalizeSearchableText([
        getOptionLabel(option),
        getOptionValue(option),
        option?.code,
        option?.name,
        option?.unit,
        option?.uom,
      ].filter(Boolean).join(' '));
      return candidateText.includes(keyword);
    });
  }, [options, query, getOptionLabel, getOptionValue]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery(selectedLabel || '');
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen, selectedLabel]);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((current) => (filteredOptions.length === 0 ? 0 : Math.min(current, filteredOptions.length - 1)));
  }, [filteredOptions.length, isOpen]);

  const selectOption = (option) => {
    if (!option || disabled) return;
    const nextValue = getOptionValue(option);
    setQuery(getOptionLabel(option));
    setIsOpen(false);
    setActiveIndex(0);
    onChange?.(nextValue, option);
    requestAnimationFrame(() => inputRef.current?.blur());
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => {
        if (filteredOptions.length === 0) return 0;
        return Math.min(current + 1, filteredOptions.length - 1);
      });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      if (isOpen && filteredOptions[activeIndex]) {
        event.preventDefault();
        selectOption(filteredOptions[activeIndex]);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setQuery(selectedLabel || '');
    }
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    if (!isOpen) setIsOpen(true);
    setActiveIndex(0);
    if (!nextValue.trim() && normalizedValue) {
      onChange?.('', null);
    }
  };

  const clearSelection = () => {
    if (disabled) return;
    setQuery('');
    setIsOpen(false);
    setActiveIndex(0);
    onChange?.('', null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const showClearButton = !disabled && (normalizedValue || query);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-200 ${controlClassName} ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
        onMouseDown={(event) => {
          if (disabled) return;
          if (event.target === inputRef.current) return;
          event.preventDefault();
          inputRef.current?.focus();
          setIsOpen(true);
        }}
      >
        <Search size={14} className="shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => !disabled && setIsOpen(true)}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
        {showClearButton && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearSelection}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        )}
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">{emptyText}</div>
          ) : (
            filteredOptions.map((option, index) => {
              const optionValue = getOptionValue(option);
              const optionLabel = getOptionLabel(option);
              const isSelected = optionValue === normalizedValue;
              const isActive = index === activeIndex;
              return (
                <button
                  key={optionValue || `${optionLabel}-${index}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                  className={`w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 ${
                    isActive ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate">{optionLabel || optionValue || '-'}</span>
                    {isSelected && <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-600">Selected</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelectDropdown;
