import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Animated, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * TextField — labeled text input with an animated focus border and inline
 * error text. Brand-token driven; no internal state beyond focus.
 *
 * @param {{
 *   label?: string,
 *   value: string,
 *   onChangeText: (text: string) => void,
 *   placeholder?: string,
 *   keyboardType?: string,
 *   autoCapitalize?: 'none'|'sentences'|'words'|'characters',
 *   autoComplete?: string,
 *   secureTextEntry?: boolean,
 *   maxLength?: number,
 *   rightSlot?: React.ReactNode,
 *   errorMessage?: string,
 *   autoFocus?: boolean,
 *   editable?: boolean,
 *   style?: object,
 *   inputStyle?: object,
 * }} props
 */
export default function TextField(props) {
  var [isFocused, setIsFocused] = useState(false);
  var focusAnim = useRef(new Animated.Value(0)).current;

  function animateTo(value) {
    Animated.timing(focusAnim, {
      toValue: value,
      duration: 150,
      // borderColor is a layout/paint prop — it cannot use the native driver.
      useNativeDriver: false,
    }).start();
  }

  function handleFocus() {
    setIsFocused(true);
    animateTo(1);
  }

  function handleBlur() {
    setIsFocused(false);
    animateTo(0);
  }

  var hasError = !!props.errorMessage;
  var borderColor = hasError
    ? colors.danger
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border, colors.primary],
      });

  return (
    <View style={[styles.container, props.style]}>
      {props.label ? <Text style={styles.label}>{props.label}</Text> : null}

      <Animated.View style={[styles.inputRow, { borderColor: borderColor }]}>
        <TextInput
          style={[styles.input, props.inputStyle]}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={colors.textLight}
          keyboardType={props.keyboardType}
          autoCapitalize={props.autoCapitalize}
          autoComplete={props.autoComplete}
          secureTextEntry={props.secureTextEntry}
          maxLength={props.maxLength}
          autoFocus={props.autoFocus}
          editable={props.editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {props.rightSlot ? <View style={styles.rightSlot}>{props.rightSlot}</View> : null}
      </Animated.View>

      {hasError ? <Text style={styles.errorText}>{props.errorMessage}</Text> : null}
    </View>
  );
}

var styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontFamily: fonts.body.medium,
    fontSize: fonts.sm,
    color: colors.textMedium,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    height: 52,
    fontFamily: fonts.body.regular,
    fontSize: fonts.md,
    color: colors.textDark,
  },
  rightSlot: { marginLeft: 8 },
  errorText: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: colors.danger,
    marginTop: 6,
  },
});
