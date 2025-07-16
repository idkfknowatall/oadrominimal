import React from 'react';
import { siTwitch } from 'simple-icons';
import SimpleIcon from '../SimpleIcon';

const Twitch = (props: React.SVGAttributes<SVGElement>) => (
  <SimpleIcon path={siTwitch.path} {...props} />
);

export default Twitch;
