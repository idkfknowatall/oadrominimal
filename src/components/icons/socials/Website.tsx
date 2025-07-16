import React from 'react';
import { siLinktree } from 'simple-icons';
import SimpleIcon from '../SimpleIcon';

const Website = (props: React.SVGAttributes<SVGElement>) => (
  <SimpleIcon path={siLinktree.path} {...props} />
);

export default Website;
