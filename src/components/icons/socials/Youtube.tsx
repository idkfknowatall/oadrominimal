import React from 'react';
import { siYoutube } from 'simple-icons';
import SimpleIcon from '../SimpleIcon';

const Youtube = (props: React.SVGAttributes<SVGElement>) => (
  <SimpleIcon path={siYoutube.path} {...props} />
);

export default Youtube;
