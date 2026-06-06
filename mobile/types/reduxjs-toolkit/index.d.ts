declare module '@reduxjs/toolkit' {
  export interface PayloadAction<P = void, T extends string = string> {
    type: T;
    payload: P;
  }

  export interface ActionReducerMapBuilder<State> {
    addCase(actionCreator: any, reducer: (state: State, action: any) => void): ActionReducerMapBuilder<State>;
  }

  export interface SliceCaseReducers<State> {
    [key: string]: (state: State, action: any) => void | State;
  }

  interface CreateSliceOptions<State, CR extends SliceCaseReducers<State>, Name extends string> {
    name: Name;
    initialState: State;
    reducers: CR;
    extraReducers?: (builder: ActionReducerMapBuilder<State>) => void;
  }

  interface Slice<State = any, CaseReducers extends SliceCaseReducers<State> = SliceCaseReducers<State>, Name extends string = string> {
    name: Name;
    reducer: (state: State | undefined, action: any) => State;
    actions: { [key: string]: (...args: any[]) => PayloadAction<any> };
  }

  export function createSlice<State, CaseReducers extends SliceCaseReducers<State>, Name extends string = string>(
    options: CreateSliceOptions<State, CaseReducers, Name>
  ): Slice<State, CaseReducers, Name> & { actions: any };

  export function configureStore<S = any>(options: {
    reducer: any;
    middleware?: (getDefaultMiddleware: any) => any;
    devTools?: boolean;
    preloadedState?: any;
    enhancers?: any;
  }): {
    getState: () => S;
    dispatch: (action: any) => any;
    subscribe: (listener: () => void) => () => void;
  };

  export function createAsyncThunk<Returned = any, ThunkArg = void>(
    typePrefix: string,
    payloadCreator: (arg: ThunkArg, thunkAPI: any) => Promise<Returned> | Returned
  ): {
    (arg: ThunkArg): any;
    pending: { type: string };
    fulfilled: { type: string };
    rejected: { type: string };
  };
}
