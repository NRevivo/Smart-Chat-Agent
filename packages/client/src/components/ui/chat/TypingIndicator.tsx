import React from 'react';

const TypingIndicator = () => {
   return (
      <div className="flex self-start gap-1 px-3 py-3 bg-gray-200 rounded-xl">
         <Dot />
         <Dot className="animation-delay-200" />
         <Dot className="animation-delay-400" />
      </div>
   );
};

type DotProps = {
   className?: string;
};

const Dot = ({ className }: DotProps) => (
   <div
      className={`w-2 h-2 rounded-full bg-gray-500 animate-pulse ${className}`}
   ></div>
);

export default TypingIndicator;
