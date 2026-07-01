import React from 'react';
import {StatusBar} from 'react-native';
import CameraScreen from './src/screens/CameraScreen';
import {colors} from './src/theme/colors';

export default function App(): React.JSX.Element {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <CameraScreen />
    </>
  );
}
