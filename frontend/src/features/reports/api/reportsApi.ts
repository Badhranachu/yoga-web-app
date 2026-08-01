import { apiClient } from '@/shared/lib/apiClient';
import type { ApiSuccess } from '@/shared/types/api';
import type { ReportName, ReportQuery, ReportResponse } from '../types';

const download = async (report: ReportName, fileFormat: 'csv' | 'pdf', query: ReportQuery) => {
  const response = await apiClient.get(`/reports/${report}/`, { params: { ...query, export: fileFormat }, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${report}-report.${fileFormat}`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const reportsApi = {
  get: async (report: ReportName, query: ReportQuery = {}): Promise<ReportResponse> => {
    const { data } = await apiClient.get<ApiSuccess<ReportResponse>>(`/reports/${report}/`, { params: query });
    return data.data;
  },
  downloadCsv: (report: ReportName, query: ReportQuery = {}) => download(report, 'csv', query),
  downloadPdf: (report: ReportName, query: ReportQuery = {}) => download(report, 'pdf', query),
};
