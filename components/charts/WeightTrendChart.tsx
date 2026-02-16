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
  weight: number;
}

interface Props {
  data: DataPoint[];
  goalWeight?: number | null;
  unit?: 'kg' | 'lb';
}

export default function WeightTrendChart({ data, goalWeight, unit = 'kg' }: Props) {
  if (data.length < 2) {
    return null;
  }

  const convertWeight = (kg: number) => (unit === 'lb' ? kg * 2.20462 : kg);

  const chartWidth = 320;
  const chartHeight = 180;
  const paddingTop = 20;
  const paddingBottom = 28;
  const paddingLeft = 44;
  const paddingRight = 12;

  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const weights = data.map((d) => convertWeight(d.weight));
  const allValues = goalWeight ? [...weights, convertWeight(goalWeight)] : weights;
  const minW = Math.min(...allValues);
  const maxW = Math.max(...allValues);
  const range = maxW - minW || 1;
  const yMin = minW - range * 0.1;
  const yMax = maxW + range * 0.1;
  const yRange = yMax - yMin;

  const getX = (i: number) => paddingLeft + (i / (data.length - 1)) * usableWidth;
  const getY = (w: number) => paddingTop + usableHeight - ((w - yMin) / yRange) * usableHeight;

  // Build line path
  let linePath = `M ${getX(0)} ${getY(weights[0])}`;
  for (let i = 1; i < data.length; i++) {
    linePath += ` L ${getX(i)} ${getY(weights[i])}`;
  }

  // Build area path (fill under line)
  const areaPath =
    linePath +
    ` L ${getX(data.length - 1)} ${paddingTop + usableHeight}` +
    ` L ${getX(0)} ${paddingTop + usableHeight} Z`;

  // Y-axis labels (3-4 ticks)
  const yTicks: number[] = [];
  const tickCount = 4;
  for (let i = 0; i < tickCount; i++) {
    yTicks.push(yMin + (yRange / (tickCount - 1)) * i);
  }

  // X-axis labels (show ~5 evenly spaced dates)
  const xLabelCount = Math.min(5, data.length);
  const xLabelIndices: number[] = [];
  for (let i = 0; i < xLabelCount; i++) {
    xLabelIndices.push(Math.round((i / (xLabelCount - 1)) * (data.length - 1)));
  }

  const goalY = goalWeight ? getY(convertWeight(goalWeight)) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>30-Day Trend</Text>
      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4CFCAD" stopOpacity="0.3" />
              <Stop offset="1" stopColor="#4CD0FC" stopOpacity="0.05" />
            </LinearGradient>
            <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
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
              {tick.toFixed(1)}
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

          {/* Goal weight dashed line */}
          {goalY !== null && goalY >= paddingTop && goalY <= paddingTop + usableHeight && (
            <>
              <Line
                x1={paddingLeft}
                y1={goalY}
                x2={chartWidth - paddingRight}
                y2={goalY}
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="6,4"
                opacity={0.7}
              />
              <SvgText
                x={chartWidth - paddingRight}
                y={goalY - 4}
                fontSize={9}
                fill="#f59e0b"
                textAnchor="end"
              >
                Goal
              </SvgText>
            </>
          )}

          {/* Area fill */}
          <Path d={areaPath} fill="url(#areaFill)" />

          {/* Line */}
          <Path d={linePath} stroke="url(#lineGrad)" strokeWidth={2.5} fill="none" />

          {/* Data points */}
          {data.map((_, i) => (
            <Circle
              key={i}
              cx={getX(i)}
              cy={getY(weights[i])}
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
