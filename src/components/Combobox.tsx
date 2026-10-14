import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface ComboboxOption {
  id: string;
  label: string;
  sublabel?: string;
  raw?: any;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string, selectedOption?: ComboboxOption) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner ou saisir...',
  label,
  required,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal query with external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = query.trim() === ''
    ? options
    : options.filter((opt) =>
        opt.label.toLowerCase().includes(query.toLowerCase()) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(query.toLowerCase()))
      );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (option: ComboboxOption) => {
    setQuery(option.label);
    onChange(option.label, option);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    onChange('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full h-11 pl-3.5 pr-16 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all shadow-xs disabled:bg-slate-100 disabled:text-slate-500"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              title="Effacer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-sm">
          {filteredOptions.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-slate-500 italic flex items-center justify-between">
              <span>Aucune suggestion trouvée</span>
              <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                Valeur personnalisée conservée
              </span>
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.label.toLowerCase() === value.toLowerCase();
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-blue-50 active:bg-blue-100 transition-colors ${
                    isSelected ? 'bg-blue-50/70 font-semibold text-blue-900' : 'text-slate-800'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-sm truncate text-slate-900 font-medium">{opt.label}</div>
                    {opt.sublabel && (
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{opt.sublabel}</div>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
