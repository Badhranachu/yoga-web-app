export type ReportName = 'users' | 'bookings' | 'attendance' | 'payments' | 'subscriptions' | 'leaves' | 'transfers';

export type ReportRow = Record<string, string | number | null>;

export type ReportResponse = {
  report: ReportName;
  title: string;
  columns: string[];
  count: number;
  page: number;
  page_size: number;
  results: ReportRow[];
};

export type ReportQuery = {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  request_type?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
};
