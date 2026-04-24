import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryScatter } from 'victory-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { usePatient } from '../../context/PatientContext';
import { PATIENT_ROUTES } from '../../constants/routes';
import TabScreenWrapper from '../../components/navigation/TabScreenWrapper';

var SCREEN_WIDTH = Dimensions.get('window').width;
var CONTENT_PADDING = 16;
var CARD_INNER_PADDING = 16;
var CHART_WIDTH = SCREEN_WIDTH - CONTENT_PADDING * 2 - CARD_INNER_PADDING * 2;
var DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
var RING_SIZE = 100;
var RING_STROKE = 10;
var RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
var RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Circular SVG progress ring with centred percent + label text.
 * @param {{ percent: number, label: string }} props
 */
function CircularRing({ percent, label }) {
  var offset = RING_CIRCUMFERENCE * (1 - percent / 100);
  return (
    <View style={ringStyles.wrapper}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={colors.border}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={colors.primary}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={RING_CIRCUMFERENCE + ' ' + RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={'rotate(-90 ' + RING_SIZE / 2 + ' ' + RING_SIZE / 2 + ')'}
        />
      </Svg>
      <View style={ringStyles.overlay}>
        <Text style={ringStyles.percent}>{percent}%</Text>
      </View>
      <Text style={ringStyles.label}>{label}</Text>
    </View>
  );
}

var ringStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    height: RING_SIZE,
  },
  percent: {
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    color: colors.textDark,
  },
  label: {
    marginTop: 8,
    fontSize: fonts.xs,
    color: colors.textMedium,
    textAlign: 'center',
  },
});

/**
 * Home tab — dashboard overview for the patient.
 * Sections: header, today's plan card, stats row, pain trend chart,
 * week progress rings, quick actions.
 */
export default function HomeScreen({ navigation }) {
  var patient = usePatient();
  var insets = useSafeAreaInsets();
  var chartData = patient.painTrend.map(function (value, index) {
    return { x: index + 1, y: value };
  });

  return (
    <TabScreenWrapper tabIndex={0}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello, {patient.name}</Text>
            <Text style={styles.subGreeting}>Ready for today's session?</Text>
          </View>
          <View style={styles.headerRight}>
            {/* TODO: Notifications screen not yet built */}
            <Pressable style={styles.iconBtn} onPress={function () {}}>
              <Ionicons name="notifications-outline" size={22} color={colors.textDark} />
            </Pressable>
            <Pressable style={styles.avatar} onPress={function () { navigation.navigate(PATIENT_ROUTES.PROFILE); }}>
              <Text style={styles.avatarInitial}>{patient.name.charAt(0)}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── TODAY'S PLAN CARD ── */}
        <LinearGradient
          colors={[colors.planCardStart, colors.planCardEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.planCard}
        >
          <View style={styles.planCardHeader}>
            <Text style={styles.planCardLabel}>Today's Plan</Text>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.planTitle}>{patient.todayPlan.title}</Text>
          <View style={styles.planChipsRow}>
            <View style={styles.planChip}>
              <Ionicons name="time-outline" size={14} color={colors.textOnPrimary} />
              <Text style={styles.planChipText}>{patient.todayPlan.minutes} min</Text>
            </View>
            <View style={styles.planChipDivider} />
            <View style={styles.planChip}>
              <Ionicons name="barbell-outline" size={14} color={colors.textOnPrimary} />
              <Text style={styles.planChipText}>{patient.todayPlan.exercises} exercises</Text>
            </View>
          </View>
          <Pressable
            style={styles.startBtn}
            onPress={function () {
              navigation.navigate(PATIENT_ROUTES.SESSION);
            }}
          >
            <Text style={styles.startBtnText}>START SESSION</Text>
          </Pressable>
        </LinearGradient>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <Text style={styles.statNumber}>{patient.streak}</Text>
              <Ionicons name="flame" size={22} color={colors.primary} style={styles.statIcon} />
            </View>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={[styles.statCard, styles.statCardRight]}>
            <View style={styles.statTop}>
              <Text style={styles.statNumber}>{patient.adherence}%</Text>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} style={styles.statIcon} />
            </View>
            <Text style={styles.statLabel}>Adherence</Text>
          </View>
        </View>

        {/* ── PAIN LEVEL TREND ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pain Level Trend</Text>
            <Pressable onPress={function () { navigation.navigate(PATIENT_ROUTES.PROGRESS); }}>
              <Text style={styles.viewAllLink}>View All</Text>
            </Pressable>
          </View>
          <View style={styles.improvingBadge}>
            <Text style={styles.improvingText}>↗ Improving</Text>
          </View>
          <VictoryChart
            width={CHART_WIDTH}
            height={140}
            padding={{ top: 10, bottom: 28, left: 10, right: 10 }}
            domain={{ y: [0, 10] }}
          >
            <VictoryAxis
              tickValues={[1, 2, 3, 4, 5, 6, 7]}
              tickFormat={DAY_LABELS}
              style={{
                axis: { stroke: 'transparent' },
                tickLabels: {
                  fill: colors.textMedium,
                  fontSize: fonts.xs,
                },
                grid: { stroke: 'transparent' },
              }}
            />
            <VictoryLine
              data={chartData}
              style={{
                data: {
                  stroke: colors.primary,
                  strokeWidth: 2,
                },
              }}
              interpolation="monotoneX"
            />
            <VictoryScatter
              data={chartData}
              size={4}
              style={{
                data: {
                  fill: colors.primaryDark,
                  stroke: colors.surface,
                  strokeWidth: 2,
                },
              }}
            />
          </VictoryChart>
        </View>

        {/* ── WEEK'S PROGRESS ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Week's Progress</Text>
          </View>
          <View style={styles.ringsRow}>
            <CircularRing
              percent={patient.weekProgress.rangeOfMotion}
              label="Range of Motion"
            />
            <CircularRing
              percent={patient.weekProgress.painReduction}
              label="Pain Reduction"
            />
          </View>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.quickActionsRow}>
          <Pressable
            style={styles.quickActionCard}
            onPress={function () {
              navigation.navigate(PATIENT_ROUTES.BOOK_APPOINTMENT, {
                screen: PATIENT_ROUTES.BOOK_THERAPIST,
              });
            }}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickActionTitle}>Book Session</Text>
            <Text style={styles.quickActionSub}>Schedule with physio</Text>
          </Pressable>
          <Pressable
            style={[styles.quickActionCard, styles.quickActionCardRight]}
            onPress={function () { navigation.navigate(PATIENT_ROUTES.PROGRESS); }}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="bar-chart-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickActionTitle}>View Progress</Text>
            <Text style={styles.quickActionSub}>See your recovery</Text>
          </Pressable>
        </View>
        </ScrollView>
      </SafeAreaView>
    </TabScreenWrapper>
  );
}

var styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: CONTENT_PADDING,
    paddingTop: 8,
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontFamily: fonts.heading.regular,
    fontSize: 24,
    lineHeight: 24 * 1.35,
    color: colors.textDark,
  },
  subGreeting: {
    fontSize: fonts.sm,
    color: colors.textMedium,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    color: colors.textOnPrimary,
  },

  // Plan card
  planCard: {
    borderRadius: 20,
    padding: CARD_INNER_PADDING,
    marginBottom: 16,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planCardLabel: {
    fontSize: fonts.xs,
    fontWeight: fonts.semibold,
    color: colors.textOnPrimary,
    opacity: 0.85,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  planTitle: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.xl,
    lineHeight: fonts.xl * 1.35,
    color: colors.textOnPrimary,
    marginBottom: 12,
  },
  planChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planChipText: {
    fontSize: fonts.sm,
    color: colors.textOnPrimary,
    opacity: 0.9,
  },
  planChipDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.textOnPrimary,
    opacity: 0.4,
    marginHorizontal: 12,
  },
  startBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
  },
  startBtnText: {
    fontSize: fonts.sm,
    fontWeight: fonts.bold,
    color: colors.textOnPrimary,
    letterSpacing: 0.6,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardRight: {
    marginLeft: 0,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: fonts.xxl,
    fontWeight: fonts.bold,
    color: colors.textDark,
  },
  statIcon: {
    opacity: 0.9,
  },
  statLabel: {
    fontSize: fonts.sm,
    color: colors.textMedium,
  },

  // Generic card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: CARD_INNER_PADDING,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.textDark,
  },
  viewAllLink: {
    fontSize: fonts.sm,
    color: colors.primary,
    fontWeight: fonts.medium,
  },

  // Pain trend
  improvingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  improvingText: {
    fontSize: fonts.xs,
    color: colors.primary,
    fontWeight: fonts.semibold,
  },

  // Progress rings
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
    paddingBottom: 8,
  },

  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionCardRight: {
    marginLeft: 0,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: fonts.sm,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    marginBottom: 2,
  },
  quickActionSub: {
    fontSize: fonts.xs,
    color: colors.textMedium,
  },
});
