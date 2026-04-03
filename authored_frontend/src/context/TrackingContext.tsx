import { createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';

export type TrackingEventType =
  | 'edit'
  | 'paste'
  | 'copy'
  | 'focus_lost'
  | 'focus_gained'
  | 'run'
  | 'submit';

export interface TrackingEvent {
  type: TrackingEventType;
  timestamp: number;
  detail?: string;       // pasted text, notes, etc.
  codeSnapshot?: string; // full code state at this moment
}

interface TrackingContextType {
  addEvent: (event: TrackingEvent) => void;
  clearEvents: () => void;
  initEvents: (events: TrackingEvent[]) => void;
  getEvents: () => TrackingEvent[];
}

const TrackingContext = createContext<TrackingContextType | null>(null);

export function TrackingProvider({ children }: { children: ReactNode }) {
  const eventsRef = useRef<TrackingEvent[]>([]);

  function addEvent(event: TrackingEvent) {
    eventsRef.current.push(event);
  }

  function clearEvents() {
    eventsRef.current = [];
  }

  function initEvents(events: TrackingEvent[]) {
    eventsRef.current = [...events];
  }

  function getEvents() {
    return eventsRef.current;
  }

  return (
    <TrackingContext.Provider value={{ addEvent, clearEvents, initEvents, getEvents }}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('useTracking must be used within TrackingProvider');
  return ctx;
}
