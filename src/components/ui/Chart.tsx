import React from 'react';

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, size = 160, thickness = 20 }) => {
  const center = size / 2;
  const radius = center - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((acc, item) => acc + item.value, 0) || 1; // prevent div by 0

  let currentOffset = 0;

  return (
    <div className="relative flex items-center justify-center animate-fade-in" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={thickness}
        />
        {data.map((item, index) => {
          const dashArray = (item.value / total) * circumference;
          const strokeDasharray = `${dashArray} ${circumference}`;
          const strokeDashoffset = -currentOffset;
          currentOffset += dashArray;

          return (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={thickness}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="chart-arc"
              strokeLinecap={dashArray > 0 ? "round" : "butt"}
            />
          );
        })}
      </svg>
    </div>
  );
};

interface BarChartProps {
  data: { label: string; value: number; color: string }[];
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, height = 200 }) => {
  const maxVal = Math.max(...data.map(d => d.value), 10);

  return (
    <div className="flex items-end justify-between w-full gap-2 animate-slide-up" style={{ height }}>
      {data.map((item, i) => {
        const barHeight = `${(item.value / maxVal) * 100}%`;
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-2 group">
            <div className="relative w-full h-full bg-slate-50 rounded-t-lg overflow-hidden flex items-end justify-center">
              <div 
                className="w-full rounded-t-lg transition-all duration-1000 ease-out opacity-80 group-hover:opacity-100"
                style={{ height: barHeight, backgroundColor: item.color }}
              >
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent"></div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};
