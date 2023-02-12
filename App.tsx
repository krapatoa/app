import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Button } from 'react-native';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeviceMotion } from 'expo-sensors';

import axios from 'axios';
import Slider from '@react-native-community/slider';
import clamp from 'clamp';

const baseUrl = 'http://raspberrypi.local';
const videoPort = ':5000';
const controlPort = ':8080';

const CAMERA_HTML = ` 
  <head>
    <meta content="width=width, initial-scale=1, maximum-scale=1" name="viewport"></meta>
  </head>
  <body style="background-image: url('${baseUrl}${videoPort}/video'); background-size:cover;"></body>
`;

function useStateAndRef(initial) {
  const [value, setValue] = useState(initial);
  const valueRef = useRef(value);
  valueRef.current = value;
  return [value, setValue, valueRef];
}

export default function App() {
  const [_position, setPosition] = useState(0);
  const position = Math.round(_position);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
  }, []);

  useEffect(() => {
    axios({
      method: 'GET',
      url: `${baseUrl}${controlPort}/getduty`,
    }).then((res) => {
      setPosition(parseInt(res.data));
    });
  }, []);

  useEffect(() => {
    let pos = 0;
    const subscription = DeviceMotion.addListener((motion) => {
      const position = clamp(motion.rotation.gamma || 0.75, 0, 1.5) / 1.5 * 100;
      pos = Math.round(position);
      // setPosition(position);
    });
    const task = setInterval(() => {
      axios({
        method: 'GET',
        url: `${baseUrl}${controlPort}/duty/${pos}`,
      });
    }, 200);
    return () => {
      DeviceMotion.removeSubscription(subscription);
      clearInterval(task);
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={[]} style={styles.container}>
        <WebView
          originWhitelist={['*']}
          scrollEnabled={false}
          source={{ html: CAMERA_HTML }}
        />
      </SafeAreaView>
      <SafeAreaView style={[styles.container, styles.overlay]}>
        <Text style={{ fontSize: 24, color: 'red' }}>{position}</Text>
        <Slider
          style={{ width: 400, height: 40 }}
          minimumValue={0}
          maximumValue={100}
          minimumTrackTintColor="#FFFFFF"
          maximumTrackTintColor="#000000"
          value={position}
          onValueChange={setPosition}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  }
});
