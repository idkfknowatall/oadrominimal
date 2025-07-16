import React from 'react';
import { siInstagram } from 'simple-icons';
import SimpleIcon from '../SimpleIcon';

const Instagram = (props: React.SVGAttributes<SVGElement>) => (
  <SimpleIcon path={siInstagram.path} {...props} />
);

export default Instagram;
