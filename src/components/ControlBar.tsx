import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, radii, spacing} from '../theme/colors';
import {ConnectionStatus} from '../services/CameraConnection';

interface Props {
  status: ConnectionStatus;
  isRecording: boolean;
  recordingSeconds: number;
  onToggleConnect: () => void;
  onCapturePhoto: () => void;
  onToggleRecord: () => void;
  photoFlash: boolean;
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export default function ControlBar({
  status,
  isRecording,
  recordingSeconds,
  onToggleConnect,
  onCapturePhoto,
  onToggleRecord,
  photoFlash,
}: Props) {
  const connected = status === 'connected';

  return (
    <View style={styles.container}>
      {isRecording && (
        <View style={styles.recordingBadge}>
          <View style={styles.recordingBadgeDot} />
          <Text style={styles.recordingBadgeText}>
            REC {formatDuration(recordingSeconds)}
          </Text>
        </View>
      )}

      <View style={styles.row}>
        <Pressable
          style={[styles.sideButton]}
          onPress={onToggleConnect}
          android_ripple={{color: colors.surfaceElevated, borderless: true}}>
          <Text style={styles.sideButtonText}>
            {connected ? 'Disconnect' : 'Connect'}
          </Text>
        </Pressable>

        <Pressable
          disabled={!connected}
          onPress={onCapturePhoto}
          style={[styles.snapshotButton, !connected && styles.disabled]}
          android_ripple={{color: colors.surfaceElevated, borderless: true}}>
          <View
            style={[styles.snapshotInner, photoFlash && styles.snapshotFlash]}
          />
        </Pressable>

        <Pressable
          disabled={!connected}
          onPress={onToggleRecord}
          style={[styles.recordButton, !connected && styles.disabled]}
          android_ripple={{color: colors.surfaceElevated, borderless: true}}>
          {isRecording ? (
            <View style={styles.recordStopIcon} />
          ) : (
            <View style={styles.recordDotIcon} />
          )}
        </Pressable>
      </View>

      <View style={styles.labelsRow}>
        <Text style={styles.label}>Session</Text>
        <Text style={styles.label}>Snapshot</Text>
        <Text style={styles.label}>{isRecording ? 'Stop' : 'Record'}</Text>
      </View>
      <Text style={styles.footnote}>
        Photos & recordings save to the camera's SD card
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recordingBadge: {
    position: 'absolute',
    top: -34,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  recordingBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    marginRight: 6,
  },
  recordingBadgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideButton: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  sideButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  snapshotButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapshotInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.textPrimary,
  },
  snapshotFlash: {
    backgroundColor: colors.brand,
  },
  recordButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordDotIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.danger,
  },
  recordStopIcon: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.35,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: 4,
  },
  label: {
    width: 68,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 10,
  },
  footnote: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
