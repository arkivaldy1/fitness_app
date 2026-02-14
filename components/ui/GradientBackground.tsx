import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'full' | 'top' | 'subtle';
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  variant = 'full'
}) => {
  // Generate sine wave path
  const generateSineWave = (
    yOffset: number,
    amplitude: number,
    frequency: number,
    phase: number = 0
  ) => {
    const points: string[] = [];
    const steps = 100;

    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * width;
      const y = yOffset + Math.sin((i / steps) * Math.PI * frequency + phase) * amplitude;
      points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }

    // Close the path to fill
    points.push(`L ${width} ${height}`);
    points.push(`L 0 ${height}`);
    points.push('Z');

    return points.join(' ');
  };

  if (variant === 'subtle') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#ffffff', '#f0fdf9', '#ecfeff']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {children}
      </View>
    );
  }

  if (variant === 'top') {
    return (
      <View style={styles.container}>
        <View style={styles.topGradient}>
          <Svg width={width} height={300} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#4CFCAD" stopOpacity="0.3" />
                <Stop offset="50%" stopColor="#4CD0FC" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#4CFCAD" stopOpacity="0.3" />
              </SvgGradient>
              <SvgGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#4CD0FC" stopOpacity="0.2" />
                <Stop offset="50%" stopColor="#4CFCAD" stopOpacity="0.2" />
                <Stop offset="100%" stopColor="#4CD0FC" stopOpacity="0.2" />
              </SvgGradient>
            </Defs>
            <Path d={generateSineWave(80, 40, 2, 0)} fill="url(#wave1)" />
            <Path d={generateSineWave(120, 30, 2.5, Math.PI / 4)} fill="url(#wave2)" />
          </Svg>
        </View>
        <View style={styles.contentContainer}>
          {children}
        </View>
      </View>
    );
  }

  // Full variant with multiple sine waves
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ffffff', '#f8fffc', '#f0feff']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <Svg width={width} height={height} style={styles.svgContainer}>
        <Defs>
          <SvgGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#4CFCAD" stopOpacity="0.15" />
            <Stop offset="50%" stopColor="#4CD0FC" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#4CFCAD" stopOpacity="0.15" />
          </SvgGradient>
          <SvgGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#4CD0FC" stopOpacity="0.1" />
            <Stop offset="50%" stopColor="#4CFCAD" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#4CD0FC" stopOpacity="0.1" />
          </SvgGradient>
          <SvgGradient id="waveGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#4CFCAD" stopOpacity="0.08" />
            <Stop offset="50%" stopColor="#4CD0FC" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#4CFCAD" stopOpacity="0.08" />
          </SvgGradient>
        </Defs>
        {/* Multiple layered sine waves */}
        <Path d={generateSineWave(height * 0.3, 60, 1.5, 0)} fill="url(#waveGradient1)" />
        <Path d={generateSineWave(height * 0.45, 50, 2, Math.PI / 3)} fill="url(#waveGradient2)" />
        <Path d={generateSineWave(height * 0.6, 40, 2.5, Math.PI / 2)} fill="url(#waveGradient3)" />
      </Svg>
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  contentContainer: {
    flex: 1,
  },
});
