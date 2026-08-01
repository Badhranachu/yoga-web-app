// Mirrors the envelope shape produced by the backend's shared response
// helpers: apps.core.responses.success_response and
// apps.core.exceptions.api_exception_handler. Every endpoint in the API
// returns one of these two shapes — feature API clients should type their
// responses against these instead of redefining them per feature.
export type ApiSuccess<T> = {
  success: true;
  data: T;
  message: string;
};

export type ApiError<TData = unknown> = {
  success: false;
  errors: Record<string, string[]> | string;
  code: number;
  data?: TData;
};
