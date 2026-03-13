import React from "react";

const Card = ({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <div
    className={`bg-white/70 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

export default Card;
