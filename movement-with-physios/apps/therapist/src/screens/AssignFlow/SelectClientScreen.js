// src/screens/AssignFlow/SelectClientScreen.js
// Step 1 of the Assign Exercises flow — choose a client to assign exercises to.

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import StepProgressBar from '../../components/assign/StepProgressBar';
import ClientCard from '../../components/assign/ClientCard';
import { ROUTES } from '../../constants/routes';

// ── Mock clients — Backend developer: replace with API call ─────────────────
const MOCK_CLIENTS = [
  { id: '1', name: 'Priya Sharma',  condition: 'Lower Back Pain',       initials: 'PS', avatarColor: '#6366F1' },
  { id: '2', name: 'Rahul Patel',   condition: 'Neck Pain',              initials: 'RP', avatarColor: '#F59E0B' },
  { id: '3', name: 'Anjali Mehta',  condition: 'Shoulder Impingement',   initials: 'AM', avatarColor: '#10B981' },
  { id: '4', name: 'Vikram Singh',  condition: 'Knee Rehabilitation',    initials: 'VS', avatarColor: '#EF4444' },
  { id: '5', name: 'Neha Gupta',    condition: 'Posture Correction',     initials: 'NG', avatarColor: '#8B5CF6' },
  { id: '6', name: 'Arjun Kapoor',  condition: 'Hip Flexor Tightness',   initials: 'AK', avatarColor: '#0EA5E9' },
];

const SelectClientScreen = ({ navigation, route }) => {
  const { selectedExercises = [] } = route.params ?? {};

  const [searchText,      setSearchText]      = useState('');
  const [selectedClient,  setSelectedClient]  = useState(null);

  const filteredClients = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return MOCK_CLIENTS;
    return MOCK_CLIENTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.condition.toLowerCase().includes(q),
    );
  }, [searchText]);

  const handleNext = () => {
    if (!selectedClient) return;
    navigation.navigate(ROUTES.SET_SCHEDULE, {
      selectedExercises,
      selectedClient,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Assign Exercises</Text>
          <Text style={styles.subtitle}>
            {selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''} selected
          </Text>
        </View>
      </View>

      {/* ── Step Progress ────────────────────────────────────────────── */}
      <StepProgressBar currentStep={1} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Section Header ───────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select Client</Text>
          <Text style={styles.sectionDesc}>Choose who to assign these exercises to</Text>
        </View>

        {/* ── Search Bar ───────────────────────────────────────────── */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.placeholder} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            placeholderTextColor={colors.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={colors.placeholder} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Client List ──────────────────────────────────────────── */}
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              isSelected={selectedClient?.id === client.id}
              onPress={() =>
                setSelectedClient(selectedClient?.id === client.id ? null : client)
              }
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={colors.placeholder} />
            <Text style={styles.emptyText}>No clients found</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom Actions ──────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextButton, !selectedClient && styles.nextButtonDisabled]}
          onPress={handleNext}
          activeOpacity={selectedClient ? 0.85 : 1}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xl,
    color: colors.textDark,
    lineHeight: 26,
  },
  subtitle: { fontSize: fonts.xs, color: colors.textMedium, marginTop: 1 },

  // Scroll
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  // Section header
  sectionHeader: { marginBottom: 16 },
  sectionTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.bold,
    color: colors.textDark,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: fonts.sm,
    color: colors.textLight,
    lineHeight: 18,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: fonts.sm,
    color: colors.textDark,
    paddingVertical: 0,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: fonts.md,
    color: colors.textLight,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  backButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.textMedium,
  },
  nextButton: {
    flex: 2,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  nextButtonText: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.white,
  },
});

export default SelectClientScreen;
