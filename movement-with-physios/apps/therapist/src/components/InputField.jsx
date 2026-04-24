import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

/**
 * InputField — reusable form input
 * Props:
 *   label, value, onChangeText, placeholder,
 *   secureTextEntry, rightIcon, onRightIconPress,
 *   errorMessage, keyboardType
 */
const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  rightIcon,
  onRightIconPress,
  errorMessage,
  keyboardType = 'default',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputRow, errorMessage ? styles.inputError : styles.inputNormal]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.icon}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 18 },
  label: {
    fontSize: fonts.sm,
    fontWeight: fonts.semibold,
    color: colors.text,
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  inputNormal: { borderColor: colors.inputBorder },
  inputError: { borderColor: colors.error },
  input: {
    flex: 1,
    height: 52,
    fontSize: fonts.md,
    color: colors.text,
  },
  icon: { padding: 6 },
  errorText: {
    color: colors.error,
    fontSize: fonts.xs,
    marginTop: 5,
    marginLeft: 2,
  },
});

export default InputField;
