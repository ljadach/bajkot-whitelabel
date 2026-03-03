import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityDayPopover } from './ActivityDayPopover';

interface ActivityData {
  date: string;
  activities: number;
  pointsEarned: number;
}

interface ProgressChartProps {
  data: ActivityData[];
}

export function ProgressChart({ data }: ProgressChartProps) {
  const { t, i18n } = useTranslation('dashboard');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const locale = i18n.language;

  // Close popover on click outside or Escape
  const closePopover = useCallback(() => setSelectedIndex(null), []);

  useEffect(() => {
    if (selectedIndex === null) return;

    function handleClickOutside(event: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && svgRef.current && !svgRef.current.contains(event.target as Node)) {
        closePopover();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closePopover();
    }

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [selectedIndex, closePopover]);

  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm" style={{ color: '#9c9286' }}>
        {t('activity.noData')}
      </div>
    );
  }

  // Get max values for scaling
  const maxActivities = Math.max(...data.map((d) => d.activities), 1);

  // Chart dimensions
  const height = 140;
  const padding = { top: 16, right: 12, bottom: 32, left: 12 };
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate bar width based on data length
  const barWidth = Math.max(6, Math.min(24, 600 / data.length));
  const gap = Math.max(2, barWidth * 0.25);
  const totalWidth = data.length * (barWidth + gap) + padding.left + padding.right;

  // Grid lines (3 horizontal dashed lines)
  const gridLines = [0.25, 0.5, 0.75];

  // Handle bar click
  function handleBarClick(i: number) {
    if (data[i].activities === 0) return;
    setSelectedIndex((prev) => (prev === i ? null : i));
  }

  // Compute popover position
  function getPopoverStyle(): React.CSSProperties | undefined {
    if (selectedIndex === null || !svgRef.current || !containerRef.current) return undefined;

    const svgRect = svgRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Scale from SVG viewBox to pixel coordinates
    const scaleX = svgRect.width / totalWidth;
    const scaleY = svgRect.height / height;

    const barX = padding.left + selectedIndex * (barWidth + gap);
    const barCenterPx = svgRect.left - containerRect.left + (barX + barWidth / 2) * scaleX;

    const d = data[selectedIndex];
    const activityHeight = (d.activities / maxActivities) * chartHeight;
    const barTopSvg = padding.top + chartHeight - activityHeight;
    const barTopPx = svgRect.top - containerRect.top + barTopSvg * scaleY;

    const popoverWidth = 256; // w-64 = 16rem = 256px
    let left = barCenterPx - popoverWidth / 2;

    // Clamp to container edges
    const maxLeft = containerRect.width - popoverWidth - 4;
    left = Math.max(4, Math.min(left, maxLeft));

    return {
      position: 'absolute',
      left: `${left}px`,
      bottom: `${containerRect.height - barTopPx + 8}px`,
      zIndex: 50,
    };
  }

  const popoverStyle = selectedIndex !== null ? getPopoverStyle() : undefined;

  return (
    <div className="relative" ref={containerRef}>
      <svg ref={svgRef} viewBox={`0 0 ${totalWidth} ${height}`} className="w-full" style={{ height: '140px' }} preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Gradient for activity bars */}
          <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ff6b35" />
            <stop offset="100%" stopColor="#f7931e" />
          </linearGradient>
          {/* Brighter gradient for hover */}
          <linearGradient id="barGradientHover" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ff8555" />
            <stop offset="100%" stopColor="#ffad42" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {gridLines.map((ratio) => {
          const y = padding.top + chartHeight * (1 - ratio);
          return <line key={ratio} x1={padding.left} y1={y} x2={totalWidth - padding.right} y2={y} stroke="#e8e2d9" strokeWidth={0.5} strokeDasharray="4 3" />;
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = padding.left + i * (barWidth + gap);
          const activityHeight = (d.activities / maxActivities) * chartHeight;
          const rx = barWidth / 2;
          const isHovered = hoveredIndex === i;
          const isSelected = selectedIndex === i;

          return (
            <g key={d.date} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} onClick={() => handleBarClick(i)} style={{ cursor: d.activities > 0 ? 'pointer' : 'default' }}>
              {/* Ghost bar (background showing max height) */}
              <rect x={x} y={padding.top} width={barWidth} height={chartHeight} rx={rx} fill="#f0ece5" />
              {/* Activity bar */}
              {d.activities > 0 && <rect x={x} y={padding.top + chartHeight - activityHeight} width={barWidth} height={activityHeight} rx={rx} fill={isHovered || isSelected ? 'url(#barGradientHover)' : 'url(#barGradient)'} className="transition-all duration-200" />}
              {/* Selected ring */}
              {isSelected && d.activities > 0 && <rect x={x - 1.5} y={padding.top + chartHeight - activityHeight - 1.5} width={barWidth + 3} height={activityHeight + 3} rx={rx} fill="none" stroke="#ff6b35" strokeWidth={1.5} />}
              {/* Hover glow (only when not selected) */}
              {isHovered && !isSelected && d.activities > 0 && <rect x={x - 1} y={padding.top + chartHeight - activityHeight - 1} width={barWidth + 2} height={activityHeight + 2} rx={rx} fill="none" stroke="#f7931e" strokeWidth={1} strokeOpacity={0.4} />}
              {/* Invisible hit area */}
              <rect x={x - gap / 2} y={0} width={barWidth + gap} height={height} fill="transparent" />
            </g>
          );
        })}

        {/* X-axis labels (show every 7th day) */}
        {data.map((d, i) => {
          if (i % 7 !== 0 && i !== data.length - 1) return null;
          const x = padding.left + i * (barWidth + gap) + barWidth / 2;
          return (
            <text key={`label-${d.date}`} x={x} y={height - 8} textAnchor="middle" fill="#9c9286" fontSize="8" fontFamily="inherit">
              {formatShortDate(d.date, locale)}
            </text>
          );
        })}
      </svg>

      {/* Popover */}
      {selectedIndex !== null && popoverStyle && (
        <div ref={popoverRef} style={popoverStyle}>
          <ActivityDayPopover date={data[selectedIndex].date} totalPoints={data[selectedIndex].pointsEarned} locale={locale} onClose={closePopover} />
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-2 text-xs" style={{ color: '#6b6560' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(to top, #ff6b35, #f7931e)' }} />
          <span>{t('activity.legend.activities')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f0ece5' }} />
          <span>{t('activity.legend.noActivity')}</span>
        </div>
      </div>
    </div>
  );
}

function formatShortDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
    month: 'numeric',
    day: 'numeric',
  });
}
