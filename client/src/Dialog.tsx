import type { ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from './motion';
import { color, layout, space } from './tokens';
import { Button, Heading, s } from './ui';

/**
 * One backdrop for every dialog. On the web, Modal already provides role="dialog", aria-modal, Escape,
 * a focus trap and focus return, so this only adds the accessible name and the shared look.
 */
export function Dialog({ visible, onClose, label, maxWidth = layout.dialog, animated = true, children }: { visible: boolean; onClose: () => void; label: string; maxWidth?: number; animated?: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  return <Modal visible={visible} transparent animationType={reduced || !animated ? 'none' : 'fade'} onRequestClose={onClose} {...{ 'aria-label': label }}>
    <View style={styles.backdrop}><View style={{ width: '100%', maxWidth, maxHeight: '90%' }} accessibilityViewIsModal>{children}</View></View>
  </Modal>;
}

export function ConfirmDialog({ visible, title, body, confirmLabel, cancelLabel, confirmDisabled, onConfirm, onCancel }: {
  visible: boolean; title: string; body: string; confirmLabel: string; cancelLabel: string; confirmDisabled?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return <Dialog visible={visible} onClose={onCancel} label={title}>
    <View style={s.panel}><Heading>{title}</Heading><Text style={s.body}>{body}</Text>
      <Button title={confirmLabel} disabled={confirmDisabled} onPress={onConfirm} />
      <Button secondary title={cancelLabel} onPress={onCancel} />
    </View>
  </Dialog>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: color.overlay, justifyContent: 'center', alignItems: 'center', padding: space.xl },
});
