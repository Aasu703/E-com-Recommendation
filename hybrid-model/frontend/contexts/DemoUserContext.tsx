import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_USER_KEY = 'nepkart_demo_user_id';
const STORAGE_ONBOARDED_KEY = 'nepkart_onboarding_done';
const DEFAULT_USER_ID = 'U0001';

interface DemoUserContextType {
  userId: string;
  setUserId: (id: string) => void;
  showOnboarding: boolean;
  startAsNewVisitor: () => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
}

const DemoUserContext = createContext<DemoUserContextType>({
  userId: DEFAULT_USER_ID,
  setUserId: () => {},
  showOnboarding: false,
  startAsNewVisitor: () => {},
  completeOnboarding: () => {},
  skipOnboarding: () => {},
});

function mintGuestId(): string {
  return `GUEST-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const DemoUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserIdState] = useState(DEFAULT_USER_ID);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const storedUserId = localStorage.getItem(STORAGE_USER_KEY);
    const onboarded = localStorage.getItem(STORAGE_ONBOARDED_KEY) === 'true';

    if (storedUserId && onboarded) {
      setUserIdState(storedUserId);
      return;
    }

    // First-ever visit (or an interrupted onboarding) — mint a fresh guest and ask them.
    const guestId = storedUserId ?? mintGuestId();
    localStorage.setItem(STORAGE_USER_KEY, guestId);
    setUserIdState(guestId);
    setShowOnboarding(true);
  }, []);

  const setUserId = (id: string) => {
    localStorage.setItem(STORAGE_USER_KEY, id);
    setUserIdState(id);
  };

  const startAsNewVisitor = () => {
    const guestId = mintGuestId();
    localStorage.setItem(STORAGE_USER_KEY, guestId);
    localStorage.removeItem(STORAGE_ONBOARDED_KEY);
    setUserIdState(guestId);
    setShowOnboarding(true);
  };

  const completeOnboarding = () => {
    localStorage.setItem(STORAGE_ONBOARDED_KEY, 'true');
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem(STORAGE_USER_KEY, DEFAULT_USER_ID);
    localStorage.setItem(STORAGE_ONBOARDED_KEY, 'true');
    setUserIdState(DEFAULT_USER_ID);
    setShowOnboarding(false);
  };

  return (
    <DemoUserContext.Provider
      value={{ userId, setUserId, showOnboarding, startAsNewVisitor, completeOnboarding, skipOnboarding }}
    >
      {children}
    </DemoUserContext.Provider>
  );
};

export const useDemoUser = () => useContext(DemoUserContext);
