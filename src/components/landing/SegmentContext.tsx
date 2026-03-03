/* eslint-disable react-refresh/only-export-components -- context + hook colocated by convention */
import { createContext, useContext } from 'react';

export type Segment = 'business' | 'edu' | 'executive' | 'individuals' | 'freelancers' | 'career-changers' | 'creators' | 'personal-productivity';

const SegmentContext = createContext<Segment>('business');

export const useSegment = () => useContext(SegmentContext);
export const SegmentProvider = SegmentContext.Provider;
