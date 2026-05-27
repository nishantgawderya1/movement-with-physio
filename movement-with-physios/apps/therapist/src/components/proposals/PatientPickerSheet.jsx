// src/components/proposals/PatientPickerSheet.jsx
// Bottom-sheet patient picker for ProposeSessionScreen. Mirrors the
// new-chat modal in MessagesScreen.jsx:197-230 (same Modal + handle +
// FlatList layout). Calls chatService.listMyClients({ includeAll: false })
// so the picker respects the S2 relationship gate the backend enforces
// on POST /proposals (NO_PRIOR_RELATIONSHIP). Without { includeAll: false }
// the list would show patients the create would 403 on.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import { chatService } from '../../services/chatService';

/**
 * Bottom-sheet patient picker. Opens when isOpen=true; fetches client list
 * on every open (cheap — list endpoint is cached server-side); calls
 * onSelect(patient) on tap, leaving sheet close-handling to the parent.
 *
 * @param {{ isOpen: boolean, onClose: () => void, onSelect: (patient: { id: string, name: string, avatarBg: string, avatarEmoji: string }) => void }} props
 */
export default function PatientPickerSheet({ isOpen, onClose, onSelect }) {
  var [clients, setClients] = useState([]);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);

  useEffect(function () {
    if (!isOpen) return;
    var cancelled = false;
    setLoading(true);
    setError(null);
    chatService.listMyClients({ includeAll: false }).then(function (res) {
      if (cancelled) return;
      if (res.success) {
        setClients(res.data || []);
      } else {
        setError(res.error || 'Failed to load patients');
      }
      setLoading(false);
    });
    return function () { cancelled = true; };
  }, [isOpen]);

  function handleSelect(patient) {
    if (onSelect) onSelect(patient);
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Choose a patient</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : clients.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptySubtitle}>
              No patients yet. Patients appear here after their first session with you.
            </Text>
          </View>
        ) : (
          <FlatList
            data={clients}
            keyExtractor={function (item) { return item.id; }}
            renderItem={function (info) {
              var item = info.item;
              return (
                <TouchableOpacity
                  style={styles.clientRow}
                  onPress={function () { handleSelect(item); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatar, { backgroundColor: item.avatarBg }]}>
                    <Text style={styles.avatarEmoji}>{item.avatarEmoji}</Text>
                  </View>
                  <Text style={styles.clientName}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

var styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingTop: 8, paddingHorizontal: 18, paddingBottom: 24,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: colors.cardBorder, marginBottom: 12,
  },
  title: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.lg, color: colors.textDark, marginBottom: 12,
  },
  clientRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 14,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 18 },
  clientName: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.textDark,
  },
  centered: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptySubtitle: {
    fontSize: fonts.sm, color: colors.textMedium,
    textAlign: 'center', lineHeight: 20,
  },
  errorText: {
    fontSize: fonts.sm, color: colors.error, textAlign: 'center',
  },
});
