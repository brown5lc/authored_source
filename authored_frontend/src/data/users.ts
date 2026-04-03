export type Role = 'student' | 'professor' | 'ta';

export interface User {
  id: string;
  name: string;
  role: Role;
  initials: string;
  color: string;
}

export const USERS: User[] = [
  { id: 'prof-johnson', name: 'Prof. Johnson', role: 'professor', initials: 'PJ', color: '#2196f3' },
  { id: 'jane-doe',     name: 'Jane Doe',      role: 'student',   initials: 'JD', color: '#e91e63' },
  { id: 'alex-smith',   name: 'Alex Smith',    role: 'student',   initials: 'AS', color: '#ff9800' },
  { id: 'sam-rivera',   name: 'Sam Rivera',    role: 'ta',        initials: 'SR', color: '#4caf50' },
];

export function getUserById(id: string): User {
  return USERS.find((u) => u.id === id) ?? USERS[0];
}

export const STUDENTS = USERS.filter((u) => u.role === 'student');
