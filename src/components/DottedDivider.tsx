import React from 'react';

interface DottedDividerProps {
  className?: string;
}

const DottedDivider: React.FC<DottedDividerProps> = ({ className = '' }) => {
  return (
    <div 
      className={`w-full h-px border-t border-dotted border-white/20 ${className}`} 
      aria-hidden="true"
    />
  );
};

export default DottedDivider;
