import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { USERS, getUserById } from '../data/users';
import type { User } from '../data/users';

const STORAGE_KEY = 'authored_current_user_id';

function loadInitialUser(): User {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return getUserById(saved);
  return USERS[0];
}

interface UserContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
}

const UserContext = createContext<UserContextType>({
  currentUser: USERS[0],
  setCurrentUser: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User>(loadInitialUser);

  function setCurrentUser(user: User) {
    localStorage.setItem(STORAGE_KEY, user.id);
    setCurrentUserState(user);
  }

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
