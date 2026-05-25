import React, { useState, useEffect, useRef } from 'react';
import { fmtYear } from '../utils/formatters';

const PeriodRangeSlider = ({
  startYear,
  endYear,
  onRangeChange,
  minYear = -31,
  maxYear = 491,
  label = 'Period Range'
}) => {
  const [localStartYear, setLocalStartYear] = useState(startYear || minYear);
  const [localEndYear, setLocalEndYear] = useState(endYear || maxYear);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setLocalStartYear(startYear || minYear);
    setLocalEndYear(endYear || maxYear);
  }, [startYear, endYear, minYear, maxYear]);

  const formatYear = fmtYear;

  const handleStartYearChange = (e) => {
    const newStart = parseInt(e.target.value) || minYear;
    const validStart = Math.max(minYear, Math.min(newStart, localEndYear));
    setLocalStartYear(validStart);
    if (!isDragging) onRangeChange({ startYear: validStart === minYear ? undefined : validStart, endYear: localEndYear === maxYear ? undefined : localEndYear });
  };

  const handleEndYearChange = (e) => {
    const newEnd = parseInt(e.target.value) || maxYear;
    const validEnd = Math.min(maxYear, Math.max(newEnd, localStartYear));
    setLocalEndYear(validEnd);
    if (!isDragging) onRangeChange({ startYear: localStartYear === minYear ? undefined : localStartYear, endYear: validEnd === maxYear ? undefined : validEnd });
  };

  const handleTrackClick = (e) => {
    if (!sliderRef.current || isDragging) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const clickedYear = Math.round(minYear + (percentage * (maxYear - minYear)));
    const distToStart = Math.abs(clickedYear - localStartYear);
    const distToEnd = Math.abs(clickedYear - localEndYear);
    if (distToStart <= distToEnd) {
      const v = Math.max(minYear, Math.min(clickedYear, localEndYear));
      setLocalStartYear(v);
      onRangeChange({ startYear: v === minYear ? undefined : v, endYear: localEndYear === maxYear ? undefined : localEndYear });
    } else {
      const v = Math.min(maxYear, Math.max(clickedYear, localStartYear));
      setLocalEndYear(v);
      onRangeChange({ startYear: localStartYear === minYear ? undefined : localStartYear, endYear: v === maxYear ? undefined : v });
    }
  };

  const handleReset = () => {
    setLocalStartYear(minYear);
    setLocalEndYear(maxYear);
    onRangeChange({ startYear: undefined, endYear: undefined });
  };

  const totalRange = maxYear - minYear;
  const startPercentage = ((localStartYear - minYear) / totalRange) * 100;
  const endPercentage = ((localEndYear - minYear) / totalRange) * 100;

  const createDragHandler = (isStart) => (e) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startValue = isStart ? localStartYear : localEndYear;
    const rect = sliderRef.current.getBoundingClientRect();
    const handleMouseMove = (e) => {
      const deltaYear = ((e.clientX - startX) / rect.width) * totalRange;
      const newValue = Math.round(startValue + deltaYear);
      if (isStart) setLocalStartYear(Math.max(minYear, Math.min(newValue, localEndYear)));
      else setLocalEndYear(Math.min(maxYear, Math.max(newValue, localStartYear)));
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      onRangeChange({ startYear: localStartYear === minYear ? undefined : localStartYear, endYear: localEndYear === maxYear ? undefined : localEndYear });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="font-sans text-sm font-medium text-text-primary">{label}</label>
        <button
          onClick={handleReset}
          className="font-sans text-xs text-text-muted hover:text-amber transition-colors duration-150"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-sans text-xs mb-1 text-text-muted">From Year</label>
          <input
            type="number" value={localStartYear} onChange={handleStartYearChange} min={minYear} max={localEndYear}
            placeholder="Start year"
            className="w-full px-2.5 py-1.5 font-sans text-sm bg-card border border-border rounded outline-none focus:border-amber transition-colors duration-150 text-text-primary"
          />
          <div className="font-sans text-xs mt-1 text-text-muted">{formatYear(localStartYear)}</div>
        </div>
        <div>
          <label className="block font-sans text-xs mb-1 text-text-muted">To Year</label>
          <input
            type="number" value={localEndYear} onChange={handleEndYearChange} min={localStartYear} max={maxYear}
            placeholder="End year"
            className="w-full px-2.5 py-1.5 font-sans text-sm bg-card border border-border rounded outline-none focus:border-amber transition-colors duration-150 text-text-primary"
          />
          <div className="font-sans text-xs mt-1 text-text-muted">{formatYear(localEndYear)}</div>
        </div>
      </div>

      <div className="px-1 py-4">
        <div ref={sliderRef} className="relative h-5 cursor-pointer select-none" onClick={handleTrackClick}>
          <div className="absolute top-2 left-0 w-full h-1.5 rounded-full bg-border">
            <div
              className="absolute h-1.5 rounded-full bg-amber"
              style={{ left: `${startPercentage}%`, width: `${endPercentage - startPercentage}%` }}
            />
          </div>
          <div
            className="absolute w-4 h-4 rounded-full cursor-grab z-10 bg-amber"
            style={{ border: '2px solid var(--color-canvas)', boxShadow: '0 1px 4px rgba(46,40,32,0.20)', left: `calc(${startPercentage}% - 8px)`, top: '2px' }}
            onMouseDown={createDragHandler(true)}
          />
          <div
            className="absolute w-4 h-4 rounded-full cursor-grab z-10 bg-amber"
            style={{ border: '2px solid var(--color-canvas)', boxShadow: '0 1px 4px rgba(46,40,32,0.20)', left: `calc(${endPercentage}% - 8px)`, top: '2px' }}
            onMouseDown={createDragHandler(false)}
          />
        </div>
        <div className="flex justify-between font-sans text-xs mt-2 text-text-muted">
          <span>{formatYear(minYear)}</span>
          <span className="text-text-secondary">{formatYear(localStartYear)} – {formatYear(localEndYear)}</span>
          <span>{formatYear(maxYear)}</span>
        </div>
      </div>
    </div>
  );
};

export default PeriodRangeSlider;
