declare module 'expo-constants' {
  interface ExpoConfig {
    extra?: {
      eas?: {
        projectId?: string;
      };
      [key: string]: any;
    };
    [key: string]: any;
  }

  interface Constants {
    expoConfig?: ExpoConfig | null;
    easConfig?: {
      projectId?: string;
    } | null;
  }

  const Constants: Constants;
  export default Constants;
}
