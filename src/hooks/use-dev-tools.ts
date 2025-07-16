'use client';

import { useState, useEffect, useCallback } from 'react';

interface DevToolsState {
  isVip: boolean;
  isModerator: boolean;
  isGuildMember: boolean;
}

const DEV_TOOLS_STORAGE_KEY = 'radio-dev-tools-roles';

export function useDevTools(userId: string | null) {
  const [devRoles, setDevRoles] = useState<DevToolsState>({
    isVip: false,
    isModerator: false,
    isGuildMember: true,
  });

  const isEmulatorMode = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

  // Load saved dev roles from localStorage on mount
  useEffect(() => {
    if (!isEmulatorMode || !userId) return;

    try {
      const saved = localStorage.getItem(`${DEV_TOOLS_STORAGE_KEY}-${userId}`);
      if (saved) {
        const parsedRoles = JSON.parse(saved);
        setDevRoles(parsedRoles);
      }
    } catch (error) {
      console.warn('Failed to load dev tools state from localStorage:', error);
    }
  }, [userId, isEmulatorMode]);

  // Save dev roles to localStorage whenever they change
  const updateDevRoles = useCallback(
    (newRoles: DevToolsState) => {
      if (!isEmulatorMode || !userId) return;

      setDevRoles(newRoles);
      try {
        localStorage.setItem(
          `${DEV_TOOLS_STORAGE_KEY}-${userId}`,
          JSON.stringify(newRoles)
        );
      } catch (error) {
        console.warn('Failed to save dev tools state to localStorage:', error);
      }
    },
    [userId, isEmulatorMode]
  );

  // Clear dev tools state (useful for logout)
  const clearDevRoles = useCallback(() => {
    if (!userId) return;

    try {
      localStorage.removeItem(`${DEV_TOOLS_STORAGE_KEY}-${userId}`);
    } catch (error) {
      console.warn('Failed to clear dev tools state from localStorage:', error);
    }
    setDevRoles({
      isVip: false,
      isModerator: false,
      isGuildMember: true,
    });
  }, [userId]);

  return {
    isEmulatorMode,
    devRoles,
    updateDevRoles,
    clearDevRoles,
  };
}
