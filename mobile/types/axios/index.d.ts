declare module 'axios' {
  export interface AxiosRequestConfig {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
    url?: string;
    method?: string;
    data?: any;
    params?: any;
  }

  export interface InternalAxiosRequestConfig extends AxiosRequestConfig {
    headers: any;
  }

  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: InternalAxiosRequestConfig;
  }

  export interface AxiosError<T = any> extends Error {
    config?: InternalAxiosRequestConfig;
    response?: AxiosResponse<T>;
    isAxiosError: boolean;
    code?: string;
  }

  export interface AxiosInterceptorManager<V> {
    use(
      onFulfilled?: (value: V) => V | Promise<V>,
      onRejected?: (error: any) => any
    ): number;
  }

  export interface AxiosInstance {
    (config: AxiosRequestConfig): Promise<AxiosResponse>;
    (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    interceptors: {
      request: AxiosInterceptorManager<InternalAxiosRequestConfig>;
      response: AxiosInterceptorManager<AxiosResponse>;
    };
  }

  export interface AxiosStatic extends AxiosInstance {
    create(config?: AxiosRequestConfig): AxiosInstance;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  }

  const axios: AxiosStatic;
  export default axios;
}
