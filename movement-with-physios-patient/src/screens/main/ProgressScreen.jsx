import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  VictoryChart,
  VictoryArea,
  VictoryLine,
  VictoryAxis,
} from 'victory-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import AchievementIcon from '../../components/ui/AchievementIcon';
import TabScreenWrapper from '../../components/navigation/TabScreenWrapper';

var SCREEN_WIDTH = Dimensions.get('window').width;
var CONTENT_PADDING = 16;
var CARD_INNER = 16;
var CHART_WIDTH = SCREEN_WIDTH - CONTENT_PADDING * 2 - CARD_INNER * 2;

// Pain over 8 weeks (starting high, trending down)
var PAIN_DATA = [
  { x: 1, y: 9 }, { x: 2, y: 8 }, { x: 3, y: 7 },
  { x: 4, y: 6 }, { x: 5, y: 5 }, { x: 6, y: 4 },
  { x: 7, y: 3.5 }, { x: 8, y: 3 },
];
var WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

// Adherence dot grid: 5 rows × 7 cols = 35 dots
var DOT_ROWS = 5;
var DOT_COLS = 7;
var TOTAL_DOTS = DOT_ROWS * DOT_COLS;
var COMPLETED_DOTS = 28; // ~80%
var MISSED_DOTS = 4;
// Remaining = future

var DOT_STATUS = Array.from({ length: TOTAL_DOTS }, function (_, i) {
  if (i < COMPLETED_DOTS) return 'completed';
  if (i < COMPLETED_DOTS + MISSED_DOTS) return 'missed';
  return 'future';
});

var ACHIEVEMENTS = [
  { type: 'flame',  label: 'Consistent', sub: '7 Days'  },
  { type: 'star',   label: 'Streak',     sub: 'Level 2' },
  { type: 'trophy', label: 'Milestone',  sub: '1 Month' },
];

// SVG dot grid dimensions
var DOT_R = 6;
var DOT_SPACING_X = Math.floor(CHART_WIDTH / DOT_COLS);
var DOT_SPACING_Y = 24;
var GRID_SVG_WIDTH = CHART_WIDTH;
var GRID_SVG_HEIGHT = (DOT_ROWS - 1) * DOT_SPACING_Y + DOT_R * 2 + 4;

/**
 * Progress tab screen.
 * Shows pain trend chart, adherence dot grid, and achievements.
 */
export default function ProgressScreen() {
  var insets = useSafeAreaInsets();
  return (
    <TabScreenWrapper tabIndex={3}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Your Progress</Text>
          <View style={styles.reductionBadge}>
            <Text style={styles.reductionText}>↓ 82% reduction</Text>
          </View>
        </View>

        {/* Pain over time chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pain Level Trend</Text>
          <VictoryChart
            width={CHART_WIDTH}
            height={160}
            padding={{ top: 12, bottom: 30, left: 12, right: 12 }}
            domain={{ y: [0, 10] }}
          >
            <VictoryAxis
              tickValues={[1, 2, 3, 4, 5, 6, 7, 8]}
              tickFormat={WEEK_LABELS}
              style={{
                axis: { stroke: 'transparent' },
                tickLabels: { fill: colors.textMedium, fontSize: fonts.xs },
                grid: { stroke: 'transparent' },
              }}
            />
            <VictoryArea
              data={PAIN_DATA}
              interpolation="monotoneX"
              style={{
                data: {
                  fill: colors.primaryLight,
                  fillOpacity: 1,
                  stroke: 'transparent',
                },
              }}
            />
            <VictoryLine
              data={PAIN_DATA}
              interpolation="monotoneX"
              style={{
                data: { stroke: colors.primary, strokeWidth: 2 },
              }}
            />
          </VictoryChart>

          {/* Starting / Current pain labels */}
          <View style={styles.painLabelsRow}>
            <View style={styles.painLabel}>
              <Text style={styles.painLabelNum}>9/10</Text>
              <Text style={styles.painLabelDesc}>Starting Pain</Text>
            </View>
            <View style={styles.painArrow}>
              <Ionicons name="arrow-forward" size={16} color={colors.textMedium} />
            </View>
            <View style={styles.painLabel}>
              <Text style={[styles.painLabelNum, styles.painLabelNumPrimary]}>3/10</Text>
              <Text style={styles.painLabelDesc}>Current Pain</Text>
            </View>
          </View>
        </View>

        {/* Exercise adherence */}
        <View style={styles.card}>
          <View style={styles.adherenceHeader}>
            <View style={styles.adherenceTitleRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.cardTitle}>Exercise Adherence</Text>
            </View>
            <View style={styles.fractionRow}>
              <Text style={styles.fractionNumer}>8</Text>
              <Text style={styles.fractionSlash}>/10</Text>
            </View>
          </View>

          {/* SVG dot grid */}
          <Svg width={GRID_SVG_WIDTH} height={GRID_SVG_HEIGHT} style={styles.dotSvg}>
            {DOT_STATUS.map(function (status, i) {
              var col = i % DOT_COLS;
              var row = Math.floor(i / DOT_COLS);
              var cx = col * DOT_SPACING_X + DOT_SPACING_X / 2;
              var cy = row * DOT_SPACING_Y + DOT_R + 2;

              if (status === 'completed') {
                return (
                  <Circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={DOT_R}
                    fill={colors.primary}
                  />
                );
              }
              if (status === 'missed') {
                return (
                  <Circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={DOT_R}
                    fill={colors.danger}
                    fillOpacity={0.3}
                  />
                );
              }
              // future
              return (
                <Circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={DOT_R - 1}
                  fill="none"
                  stroke={colors.border}
                  strokeWidth={1.5}
                />
              );
            })}
          </Svg>

          {/* Legend */}
          <View style={styles.dotLegend}>
            <DotLegendItem color={colors.primary} label="Completed" />
            <DotLegendItem color={colors.danger} opacity={0.3} label="Missed" />
            <DotLegendItem color="transparent" borderColor={colors.border} label="Upcoming" />
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.achievementsSection}>
          <Text style={styles.cardTitle}>Achievements</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScroll}
          >
            {ACHIEVEMENTS.map(function (a) {
              return (
                <View key={a.label} style={styles.badgeCard}>
                  <AchievementIcon type={a.type} size={44} />
                  <Text style={styles.badgeLabel}>{a.label}</Text>
                  <Text style={styles.badgeSub}>{a.sub}</Text>
                </View>
              );
            })}
          </ScrollView>
          <Text style={styles.nudgeText}>
            Keep going! You're 3 days away from unlocking the 'Dedicated' badge
          </Text>
        </View>
      </ScrollView>
      </SafeAreaView>
    </TabScreenWrapper>
  );
}

/**
 * A small legend item for the dot grid.
 * @param {{ color: string, borderColor?: string, opacity?: number, label: string }} props
 */
function DotLegendItem({ color, borderColor, opacity, label }) {
  return (
    <View style={legendStyles.item}>
      <View
        style={[
          legendStyles.dot,
          {
            backgroundColor: color,
            opacity: opacity || 1,
            borderWidth: borderColor ? 1.5 : 0,
            borderColor: borderColor || 'transparent',
          },
        ]}
      />
      <Text style={legendStyles.label}>{label}</Text>
    </View>
  );
}

var legendStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: fonts.xs,
    color: colors.textMedium,
  },
});

var styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: CONTENT_PADDING,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heading: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.xxl,
    lineHeight: fonts.xxl * 1.35,
    color: colors.textDark,
  },
  reductionBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reductionText: {
    fontSize: fonts.sm,
    color: colors.primary,
    fontWeight: fonts.semibold,
  },

  // Generic card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: CARD_INNER,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    marginBottom: 12,
  },

  // Pain labels
  painLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  painLabel: {
    alignItems: 'center',
  },
  painLabelNum: {
    fontSize: fonts.lg,
    fontWeight: fonts.bold,
    color: colors.textDark,
  },
  painLabelNumPrimary: {
    color: colors.primary,
  },
  painLabelDesc: {
    fontSize: fonts.xs,
    color: colors.textMedium,
    marginTop: 2,
  },
  painArrow: {
    opacity: 0.5,
  },

  // Adherence
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  adherenceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fractionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  fractionNumer: {
    fontSize: fonts.xxl,
    fontWeight: fonts.bold,
    color: colors.primary,
  },
  fractionSlash: {
    fontSize: fonts.lg,
    fontWeight: fonts.medium,
    color: colors.textDark,
  },
  dotSvg: {
    marginBottom: 12,
  },
  dotLegend: {
    flexDirection: 'row',
    marginTop: 4,
  },

  // Achievements
  achievementsSection: {
    marginBottom: 8,
  },
  badgesScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  badgeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  badgeLabel: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: colors.textDark,
    marginTop: 10,
    marginBottom: 2,
  },
  badgeSub: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.primary,
  },
  nudgeText: {
    fontSize: fonts.sm,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: fonts.sm * 1.6,
  },
});
