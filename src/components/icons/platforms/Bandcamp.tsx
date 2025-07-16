import React from 'react';
import { siBandcamp } from 'simple-icons';
import SimpleIcon from '../SimpleIcon';

const Bandcamp = (props: React.SVGAttributes<SVGElement>) => (
  <SimpleIcon path={siBandcamp.path} {...props} />
);

export default Bandcamp;
