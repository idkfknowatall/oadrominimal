import React from 'react';
import { siSuno } from 'simple-icons';
import SimpleIcon from '../SimpleIcon';

const Suno = (props: React.SVGAttributes<SVGElement>) => (
  <SimpleIcon path={siSuno.path} {...props} />
);

export default Suno;
