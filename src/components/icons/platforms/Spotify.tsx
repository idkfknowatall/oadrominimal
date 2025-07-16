import React from 'react';
import { siSpotify } from 'simple-icons';
import SimpleIcon from '../SimpleIcon';

const Spotify = (props: React.SVGAttributes<SVGElement>) => (
  <SimpleIcon path={siSpotify.path} {...props} />
);

export default Spotify;
