import React from 'react';

interface SimpleIconProps extends React.SVGAttributes<SVGElement> {
  path: string;
}

const SimpleIcon: React.FC<SimpleIconProps> = ({ path, ...props }) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d={path} />
  </svg>
);

export default SimpleIcon;
