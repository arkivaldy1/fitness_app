import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { theme } from '../../constants/theme';

interface BarData {
  label: string;
  value: number;
}

interface Props {
  data: BarData[];
  highlightLast?: boolean;
}

export default function WeeklyVolumeChart({ data, highlightLast = true }: Props) {
  if (data.length < 2 || data.every((d) => d.value === 0)) {
    return null;
  }

  const chartWidth = 320;
  const chartHeight = 140;
  const paddingTop = 8;
  const paddingBottom = 24;
  const paddingX = 4;
  const barGap = 6;

  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingTop - paddingBottom;
  const barWidth = (usableWidth - barGap * (data.length - 1)) / data.length;

  const maxVal = Math.max(...data.map((d) => d.value));
  const scale = maxVal > 0 ? usableHeight / maxVal : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Volume</Text>
      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4CFCAD" stopOpacity="1" />
              <Stop offset="1" stopColor="#4CD0FC" stopOpacity="0.8" />
            </LinearGradient>
            <LinearGradient id="barGradHighlight" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4CFCAD" stopOpacity="1" />
              <Stop offset="1" stopColor="#4CD0FC" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {data.map((d, i) => {
            const barH = d.value * scale;
            const x = paddingX + i * (barWidth + barGap);
            const y = paddingTop + usableHeight - barH;
            const isHighlighted = highlightLast && i === data.length - 1;

            return (
              <React.Fragment key={i}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barH, d.value > 0 ? 2 : 0)}
                  rx={4}
                  ry={4}
                  fill={isHighlighted ? 'url(#barGradHighlight)' : 'url(#barGrad)'}
                  opacity={isHighlighted ? 1 : 0.6}
                />
                <SvgText
                  x={x + barWidth / 2}
                  y={chartHeight - 4}
                  fontSize={10}
                  fill={isHighlighted ? '#0f172a' : '#94a3b8'}
                  fontWeight={isHighlighted ? '700' : '400'}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
      <Text style={styles.maxLabel}>
        Peak: {maxVal >= 1000 ? `${(maxVal / 1000).toFixed(1)}k` : maxVal} kg
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  maxLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
});
