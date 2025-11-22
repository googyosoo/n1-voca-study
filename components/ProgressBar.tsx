import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percentage = Math.min(100, (current / total) * 100);

  return (
    <div className="w-full mb-2">
      <div className="flex justify-between items-end mb-2 px-1">
          <span className="text-2xl font-black text-indigo-600 leading-none">
              {current}
          </span>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">
              of {total} Questions
          </span>
      </div>
      <div className="w-full bg-gray-200/50 backdrop-blur-sm rounded-full h-3 overflow-hidden shadow-inner">
        <div
          className="bg-gradient-to-r from-blue-400 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)] relative"
          style={{ width: `${percentage}%` }}
        >
            <div className="absolute top-0 right-0 bottom-0 w-full bg-gradient-to-b from-white/30 to-transparent opacity-50"></div>
            <div className="absolute top-0 right-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;