declare module 'react-redux' {
  import React from 'react';
  
  export interface TypedUseSelectorHook<TState> {
    <TSelected>(selector: (state: TState) => TSelected): TSelected;
  }
  
  export function useDispatch<T = any>(): T;
  export function useSelector<TState = any, TSelected = any>(
    selector: (state: TState) => TSelected
  ): TSelected;
  
  export const Provider: React.FC<{ store: any; children?: React.ReactNode }>;
}
