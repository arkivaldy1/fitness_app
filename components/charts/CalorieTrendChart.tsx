import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import { format } from 'date-fns';
import { theme } from '../../constants/theme';

interface DataPoint {
  date: string;
  calories: number;
}

interface Props {
  data: DataPoint[];
  targetCalories?: number | null;
  title?: string;
}

export default function CalorieTrendChart({ data, targetCalories, title = 'Calorie Trend' }: Props) {
  if (data.length < 2) {
    return null;
  }

  const chartWidth = 320;
  const chartHeight = 180;
  const paddingTop = 20;
  const paddingBottom = 28;
  const paddingLeft = 44;
  const paddingRight = 12;

  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const values = data.map((d) => d.calories);
  const allValues = targetCalories ? [...values, targetCalories] : values;
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const range = maxV - minV || 200;
  const yMin = Math.max(0, minV - range * 0.15);
  const yMax = maxV + range * 0.15;
  const yRange = yMax - yMin;

  const getX = (i: number) => paddingLeft + (i / (data.length - 1)) * usableWidth;
  const getY = (v: number) => paddingTop + usableHeight - ((v - yMin) / yRange) * usableHeight;

  // Build line path
  let linePath = `M ${getX(0)} ${getY(values[0])}`;
  for (let i = 1; i < data.length; i++) {
    linePath += ` L ${getX(i)} ${getY(values[i])}`;
  }

  // Build area path
  const areaPath =
    linePath +
    ` L ${getX(data.length - 1)} ${paddingTop + usableHeight}` +
    ` L ${getX(0)} ${paddingTop + usableHeight} Z`;

  // Y-axis labels
  const yTicks: number[] = [];
  const tickCount = 4;
  for (let i = 0; i < tickCount; i++) {
    yTicks.push(yMin + (yRange / (tickCount - 1)) * i);
  }

  // X-axis labels
  const xLabelCount = Math.min(5, data.length);
  const xLabelIndices: number[] = [];
  for (let i = 0; i < xLabelCount; i++) {
    xLabelIndices.push(Math.round((i / (xLabelCount - 1)) * (data.length - 1)));
  }

  const targetY = targetCalories ? getY(targetCalories) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="calAreaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4CFCAD" stopOpacity="0.3" />
              <Stop offset="1" stopColor="#4CD0FC" stopOpacity="0.05" />
            </LinearGradient>
            <LinearGradient id="calLineGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#4CFCAD" stopOpacity="1" />
              <Stop offset="1" stopColor="#4CD0FC" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Y-axis labels */}
          {yTicks.map((tick, i) => (
            <SvgText
              key={`y-${i}`}
              x={paddingLeft - 6}
              y={getY(tick) + 4}
              fontSize={10}
              fill="#94a3b8"
              textAnchor="end"
            >
              {Math.round(tick)}
            </SvgText>
          ))}

          {/* X-axis labels */}
          {xLabelIndices.map((idx) => (
            <SvgText
              key={`x-${idx}`}
              x={getX(idx)}
              y={chartHeight - 4}
              fontSize={10}
              fill="#94a3b8"
              textAnchor="middle"
            >
              {format(new Date(data[idx].date), 'M/d')}
            </SvgText>
          ))}

          {/* Target calories dashed line */}
          {targetY !== null && targetY >= paddingTop && targetY <= paddingTop + usableHeight && (
            <>
              <Line
                x1={paddingLeft}
                y1={targetY}
                x2={chartWidth - paddingRight}
                y2={targetY}
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="6,4"
                opacity={0.7}
              />
              <SvgText
                x={chartWidth - paddingRight}
                y={targetY - 4}
                fontSize={9}
                fill="#f59e0b"
                textAnchor="end"
              >
                Target
              </SvgText>
            </>
          )}

          {/* Area fill */}
          <Path d={areaPath} fill="url(#calAreaFill)" />

          {/* Line */}
          <Path d={linePath} stroke="url(#calLineGrad)" strokeWidth={2.5} fill="none" />

          {/* Data points */}
          {data.map((_, i) => (
            <Circle
              key={i}
              cx={getX(i)}
              cy={getY(values[i])}
              r={i === data.length - 1 ? 4 : 2.5}
              fill={i === data.length - 1 ? '#4CFCAD' : '#4CD0FC'}
              stroke="#fff"
              strokeWidth={i === data.length - 1 ? 2 : 1}
            />
          ))}
        </Svg>
      </View>
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
    marginBottom: 8,
  },
  chartWrapper: {
    alignItems: 'center',
  },
});
