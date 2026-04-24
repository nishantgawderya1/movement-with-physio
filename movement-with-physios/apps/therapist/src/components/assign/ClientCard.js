// src/components/assign/ClientCard.js
// Selectable client card used in the Select Client step.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

const ClientCard = ({ client, isSelected, onPress }) => (
  <TouchableOpacity
    style={[styles.card, isSelected && styles.cardSelected]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    {/* Avatar */}
    <View style={[styles.avatar, { backgroundColor: client.avatarColor }]}>
      <Text style={styles.avatarText}>{client.initials}</Text>
    </View>

    {/* Info */}
    <View style={styles.info}>
      <Text style={styles.name}>{client.name}</Text>
      <Text style={styles.condition}>{client.condition}</Text>
    </View>

    {/* Selection indicator */}
    {isSelected ? (
      <View style={styles.checkWrap}>
        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      </View>
    ) : (
      <View style={styles.emptyCheck} />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: fonts.sm,
    fontWeight: fonts.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },

  info: { flex: 1 },
  name: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    marginBottom: 3,
  },
  condition: {
    fontSize: fonts.sm,
    color: colors.textLight,
  },

  checkWrap: {
    marginLeft: 8,
  },
  emptyCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    marginLeft: 8,
  },
});

export default ClientCard;
