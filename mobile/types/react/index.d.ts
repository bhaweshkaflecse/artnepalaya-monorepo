declare module 'react' {
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => ReactElement | null;
  export interface ReactElement {}
  export type ReactNode = ReactElement | string | number | boolean | null | undefined | ReactNode[];
  export type Ref<T> = ((instance: T | null) => void) | RefObject<T> | null;
  export type RefObject<T> = { current: T | null };
  export type MutableRefObject<T> = { current: T };
  export type SetStateAction<S> = S | ((prevState: S) => S);
  export type Dispatch<A> = (value: A) => void;

  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useRef<T>(initialValue: T): MutableRefObject<T>;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useMemo<T>(factory: () => T, deps: any[]): T;

  namespace JSX {
    interface Element extends ReactElement {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
