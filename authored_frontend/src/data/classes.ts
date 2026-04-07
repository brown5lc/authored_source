export interface ClassInfo {
  id: string;
  name: string;
  instructor: string;
  term: string;
}

export const CLASSES: ClassInfo[] = [
  { id: 'cs101', name: 'CS 101: Intro to Programming', instructor: 'Prof. Johnson',  term: 'Spring 2026' },
  { id: 'cs201', name: 'CS 201: Data Structures',      instructor: 'Prof. Williams', term: 'Spring 2026' },
];

export function getClass(id: string): ClassInfo | undefined {
  return CLASSES.find((c) => c.id === id);
}
