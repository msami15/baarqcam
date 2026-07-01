import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing} from '../theme/colors';
import {ConnectionStatus} from '../services/CameraConnection';

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Live',
  error: 'Connection Error',
};

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  disconnected: colors.textMuted,
  connecting: colors.warning,
  connected: colors.success,
  error: colors.danger,
};

export default function Header({
  status,
  fps,
}: {
  status: ConnectionStatus;
  fps: number;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>B</Text>
        </View>
        <View>
          <Text style={styles.brandTitle}>BARQ TECHNOLOGIES</Text>
          <Text style={styles.appSubtitle}>BarqCam Viewer</Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        {status === 'connected' && (
          <Text style={styles.fpsText}>{fps} FPS</Text>
        )}
        <View style={styles.statusPill}>
          <View
            style={[styles.statusDot, {backgroundColor: STATUS_COLOR[status]}]}
          />
          <Text style={styles.statusText}>{STATUS_LABEL[status]}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  logoMarkText: {
    color: colors.background,
    fontWeight: '800',
    fontSize: 18,
  },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  appSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fpsText: {
    color: colors.accent,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    marginRight: spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});
