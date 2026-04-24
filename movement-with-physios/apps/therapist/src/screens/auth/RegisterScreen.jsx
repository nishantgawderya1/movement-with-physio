import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../constants/colors';

// Stub screen — UI placeholder only
const RegisterScreen = ({ navigation }) => (
  <View style={styles.container}>
    <Text style={styles.title}>Therapist Registration</Text>
    <Text style={styles.sub}>This screen will be built in the next sprint.</Text>
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Text style={styles.back}>← Back to Login</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12 },
  sub: { color: colors.subtext, textAlign: 'center', marginBottom: 24 },
  back: { color: colors.primary, fontWeight: '600', fontSize: 15 },
});

export default RegisterScreen;
