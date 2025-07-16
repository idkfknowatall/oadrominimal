import React from 'react';
import { siSoundcloud } from 'simple-icons';
import SimpleIcon from '../SimpleIcon';

const SoundCloud = (props: React.SVGAttributes<SVGElement>) => (
  <SimpleIcon path={siSoundcloud.path} {...props} />
);

export default SoundCloud;
