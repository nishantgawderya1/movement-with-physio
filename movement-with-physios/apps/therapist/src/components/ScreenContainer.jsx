import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';

/**
 * ScreenContainer — safe-area + keyboard-aware screen wrapper for the
 * therapist app. Composition: SafeAreaView → KeyboardAvoidingView →
 * (ScrollView | View). Background colors.background (#F7FAFC).
 *
 * @param {{
 *   children: React.ReactNode,
 *   style?: object,
 *   scroll?: boolean,
 *   keyboardAvoiding?: boolean,
 *   safeAreaEdges?: Array<'top'|'bottom'|'left'|'right'>,
 * }} props
 */
export default function ScreenContainer(props) {
  var scroll = props.scroll !== false; // default true
  var keyboardAvoiding = props.keyboardAvoiding !== false; // default true
  var edges = props.safeAreaEdges || ['top', 'bottom'];

  var body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, props.style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {props.children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex, props.style]}>{props.children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

var styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
});
