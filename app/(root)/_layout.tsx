import { Stack } from 'expo-router';
import { RoleEditorContent } from './role-editor';
import { SessionEditorContent } from './session-editor';
import { useModalStore } from '@/stores/modal-store';
import { FullScreenModal } from '@/components/full-screen-modal';

export default function RootLayout() {
  const { roleEditor, sessionEditorId, closeRoleEditor, closeSessionEditor } = useModalStore();

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="role-stats/[id]" />
        <Stack.Screen name="logs" />
      </Stack>

      {roleEditor !== null && (
        <FullScreenModal visible onRequestClose={closeRoleEditor}>
          <RoleEditorContent id={roleEditor.id} onClose={closeRoleEditor} />
        </FullScreenModal>
      )}

      {sessionEditorId !== null && (
        <FullScreenModal visible onRequestClose={closeSessionEditor}>
          <SessionEditorContent id={sessionEditorId} onClose={closeSessionEditor} />
        </FullScreenModal>
      )}
    </>
  );
}
