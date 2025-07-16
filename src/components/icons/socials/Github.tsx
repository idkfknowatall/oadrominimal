import React from 'react';
import { siGithub } from 'simple-icons';
import SimpleIcon from '../SimpleIcon';

const Github = (props: React.SVGAttributes<SVGElement>) => (
  <SimpleIcon path={siGithub.path} {...props} />
);

export default Github;
