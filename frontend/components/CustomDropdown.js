import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomDropdown = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => { onChange(val); setIsOpen(false); };
  const selectedOption = options.find(option => option.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2.5 pr-8 text-left font-sans text-sm bg-card rounded-md outline-none transition-colors duration-150 ${isOpen ? 'border border-amber' : 'border border-border'} ${selectedOption ? 'text-text-primary' : 'text-text-muted'}`}
      >
        <span className="block truncate">{selectedOption ? selectedOption.label : placeholder}</span>
      </button>
      <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted" />
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden border border-border rounded-md bg-card shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`px-3 py-2 cursor-pointer font-sans text-sm transition-colors duration-100 ${option.value === value ? 'bg-amber-bg text-text-primary' : 'text-text-secondary hover:bg-surface-alt'}`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
