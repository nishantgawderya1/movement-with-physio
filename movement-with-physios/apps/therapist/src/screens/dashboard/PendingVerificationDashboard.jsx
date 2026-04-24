// src/screens/dashboard/PendingVerificationDashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shown after BookingConfirmed while the therapist awaits account verification.
// Replace the DEV button with a real auth signal (isVerified from backend/Clerk).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';

// ── Timeline steps ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Personal Information',     done: true  },
  { id: 2, label: 'Professional Credentials', done: true  },
  { id: 3, label: 'Identity Verification',    done: true  },
  { id: 4, label: 'Verification Call Booked', done: true  },
  { id: 5, label: 'Account Review',           done: false },
  { id: 6, label: 'Full Access Granted',      done: false },
];

// ── Locked stat preview ────────────────────────────────────────────────────────
const LOCKED_STATS = [
  { label: 'Active Clients',  value: '—', icon: 'people-outline'    },
  { label: 'Avg Adherence',   value: '—', icon: 'trending-up-outline'},
  { label: 'Total Sessions',  value: '—', icon: 'calendar-outline'  },
  { label: 'Unread Messages', value: '—', icon: 'chatbubble-outline' },
];

const PendingVerificationDashboard = ({ navigation }) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome Back 👋</Text>
            <Text style={styles.subGreeting}>Your account is being reviewed</Text>
          </View>
          {/* Brand icon */}
          <View style={styles.brandIcon}>
            <Ionicons name="pulse" size={18} color={colors.white} />
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Status Banner ───────────────────────────────────── */}
          <View style={styles.statusBanner}>
            <View style={styles.statusIconWrap}>
              <Ionicons name="time-outline" size={22} color={AMBER} />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusTitle}>Verification In Progress</Text>
              <Text style={styles.statusSub}>
                Our team is reviewing your credentials. This typically takes 1–2 business days.
              </Text>
            </View>
          </View>

          {/* ── Timeline ────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Onboarding Timeline</Text>
            {STEPS.map((step, idx) => {
              const isLast = idx === STEPS.length - 1;
              const isCurrent = !step.done && (idx === 0 || STEPS[idx - 1].done);
              return (
                <View key={step.id} style={styles.stepRow}>
                  {/* Vertical connector */}
                  <View style={styles.stepLeft}>
                    <View style={[
                      styles.stepDot,
                      step.done    && styles.stepDotDone,
                      isCurrent   && styles.stepDotCurrent,
                    ]}>
                      {step.done
                        ? <Ionicons name="checkmark" size={11} color={colors.white} />
                        : isCurrent
                          ? <View style={styles.stepDotInner} />
                          : null
                      }
                    </View>
                    {!isLast && <View style={[styles.stepLine, step.done && styles.stepLineDone]} />}
                  </View>

                  <View style={styles.stepContent}>
                    <Text style={[
                      styles.stepLabel,
                      step.done    && styles.stepLabelDone,
                      isCurrent   && styles.stepLabelCurrent,
                      !step.done && !isCurrent && styles.stepLabelPending,
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.stepHint}>In review — usually 1–2 business days</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── Locked Dashboard Preview ─────────────────────────── */}
          <Text style={styles.sectionLabel}>Dashboard Preview</Text>
          <Text style={styles.sectionSub}>Available once your account is verified</Text>
          <View style={styles.lockedGrid}>
            {LOCKED_STATS.map((s) => (
              <View key={s.label} style={styles.lockedCard}>
                <View style={styles.lockedIconWrap}>
                  <Ionicons name={s.icon} size={18} color={colors.textLight} />
                </View>
                <Text style={styles.lockedValue}>{s.value}</Text>
                <Text style={styles.lockedLabel}>{s.label}</Text>
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={10} color={colors.textLight} />
                </View>
              </View>
            ))}
          </View>

          {/* ── What to expect ───────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>What happens next?</Text>
            {[
              "You'll receive a call on your scheduled date",
              'Our team verifies your credentials and credentials',
              'Your account gets activated with full access',
              'Start managing clients, sessions, and messages',
            ].map((item, i) => (
              <View key={i} style={styles.expectRow}>
                <View style={styles.expectNum}>
                  <Text style={styles.expectNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.expectText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* ── Contact Support ──────────────────────────────────── */}
          <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.8}>
            <Ionicons name="mail-outline" size={16} color={colors.primary} />
            <Text style={styles.outlineBtnText}>Contact Support</Text>
          </TouchableOpacity>

          {/* ── DEV ONLY: jump to full dashboard ───────────────── */}
          {/* TODO: Remove this button and route via real auth state */}
          <TouchableOpacity
            style={styles.devBtn}
            onPress={() => navigation.replace('Dashboard')}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.white} />
            <Text style={styles.devBtnText}>[DEV] Go to Full Dashboard</Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Constants ──────────────────────────────────────────────────────────────────
const AMBER = '#D97706';
const AMBER_LIGHT = '#FEF3C7';

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xxl,
    color: colors.textDark,
  },
  subGreeting: {
    fontSize: fonts.sm,
    color: colors.textMedium,
    marginTop: 2,
  },
  brandIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },

  // Status banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: AMBER_LIGHT,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
    gap: 12,
  },
  statusIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FDE68A',
    justifyContent: 'center', alignItems: 'center',
  },
  statusTextWrap:  { flex: 1 },
  statusTitle: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: '#92400E',
    marginBottom: 4,
  },
  statusSub: {
    fontSize: fonts.sm,
    color: '#78350F',
    lineHeight: 19,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  // Section labels
  sectionLabel: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: fonts.xs,
    color: colors.textLight,
    marginBottom: 12,
  },

  // Timeline
  stepRow:     { flexDirection: 'row', marginBottom: 0 },
  stepLeft:    { alignItems: 'center', width: 28, marginRight: 12 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.cardBorder,
    borderWidth: 2, borderColor: colors.inputBorder,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 1,
  },
  stepDotDone:    { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotCurrent: { backgroundColor: colors.white, borderColor: AMBER, borderWidth: 2 },
  stepDotInner:   { width: 8, height: 8, borderRadius: 4, backgroundColor: AMBER },
  stepLine:     { width: 2, flex: 1, backgroundColor: colors.cardBorder, minHeight: 24, marginVertical: 2 },
  stepLineDone: { backgroundColor: colors.primary },
  stepContent:  { flex: 1, paddingBottom: 20, paddingTop: 1 },
  stepLabel:        { fontSize: fonts.sm, color: colors.textMedium },
  stepLabelDone:    { color: colors.textDark, fontWeight: fonts.semibold },
  stepLabelCurrent: { color: AMBER,           fontWeight: fonts.semibold },
  stepLabelPending: { color: colors.textLight },
  stepHint: {
    fontSize: fonts.xs, color: AMBER, marginTop: 2, fontStyle: 'italic',
  },

  // Locked stats grid
  lockedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  lockedCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    opacity: 0.6,
    position: 'relative',
  },
  lockedIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  lockedValue: {
    fontSize: fonts.xl,
    fontWeight: fonts.bold,
    color: colors.textLight,
    marginBottom: 2,
  },
  lockedLabel: { fontSize: fonts.xs, color: colors.textLight },
  lockBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },

  // What to expect
  expectRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: 12,
  },
  expectNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 1,
  },
  expectNumText: { fontSize: fonts.xs, fontWeight: fonts.bold, color: colors.primary },
  expectText:    { flex: 1, fontSize: fonts.sm, color: colors.textMedium, lineHeight: 20 },

  // Buttons
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    height: 50,
    borderRadius: 28, borderWidth: 1.5, borderColor: colors.primary,
    marginBottom: 14,
  },
  outlineBtnText: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.primary,
  },
  devBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    height: 44,
    borderRadius: 28, backgroundColor: '#6B7280',
    marginBottom: 8,
  },
  devBtnText: { fontSize: fonts.sm, color: colors.white, fontWeight: fonts.medium },
});

export default PendingVerificationDashboard;
