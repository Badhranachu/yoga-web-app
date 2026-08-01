import { useEffect, useState } from 'react';
import { FormError } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { reportsApi } from '../api/reportsApi';
import { ReportTable } from '../components/ReportTable';
import type { ReportName, ReportQuery, ReportResponse } from '../types';

const REPORT_OPTIONS: { name: ReportName; label: string }[] = [
  { name: 'users', label: 'User Management' }, { name: 'bookings', label: 'Booking History' },
  { name: 'attendance', label: 'Attendance History' }, { name: 'payments', label: 'Payment History' },
  { name: 'subscriptions', label: 'Subscription History' }, { name: 'leaves', label: 'Leave History' },
  { name: 'transfers', label: 'Transfer History' },
];

export const ReportsPage = () => {
  const [reportName, setReportName] = useState<ReportName>('users');
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [query, setQuery] = useState<ReportQuery>({ page: 1, page_size: 20, order: 'desc', sort: 'created_at' });
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async (nextQuery = query, nextReport = reportName) => {
    setIsLoading(true); setError(null);
    try { setReport(await reportsApi.get(nextReport, nextQuery)); }
    catch (err) { setError(extractErrorMessage(err, 'Could not load this report.')); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { void load(); }, [reportName, query.page, query.sort, query.order, query.status, query.request_type, query.date_from, query.date_to]);

  const applyFilters = (event: React.FormEvent) => { event.preventDefault(); const next = { ...query, page: 1, search: search.trim() || undefined }; setQuery(next); void load(next); };
  const changeReport = (next: ReportName) => { setReportName(next); setSearch(''); setQuery({ page: 1, page_size: 20, order: 'desc', sort: 'created_at' }); };
  const sort = (column: string) => setQuery((current) => ({ ...current, page: 1, sort: column, order: current.sort === column && current.order === 'asc' ? 'desc' : 'asc' }));
  const updateFilter = (key: keyof ReportQuery, value: string) => setQuery((current) => ({ ...current, page: 1, [key]: value || undefined }));
  const exportReport = (format: 'csv' | 'pdf') => void reportsApi[format === 'csv' ? 'downloadCsv' : 'downloadPdf'](reportName, { ...query, search: search.trim() || undefined });
  const totalPages = report ? Math.max(1, Math.ceil(report.count / report.page_size)) : 1;

  return <div className="space-y-6"><div><h2 className="font-serif text-3xl text-dark">Reports & Management</h2><p className="mt-1 text-sm text-brown">Search, review, sort, and export studio history.</p></div>
    <div className="flex gap-2 overflow-x-auto pb-1">{REPORT_OPTIONS.map((option) => <button key={option.name} type="button" onClick={() => changeReport(option.name)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs uppercase tracking-widest transition-colors ${reportName === option.name ? 'bg-dark text-sand' : 'border border-beige text-brown hover:border-gold-dark'}`}>{option.label}</button>)}</div>
    <form onSubmit={applyFilters} className="grid gap-3 rounded-2xl border border-beige bg-cream p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" className="rounded-xl border border-beige bg-sand px-3 py-2 text-sm text-dark outline-none focus:border-gold-dark" /><select value={query.status ?? ''} onChange={(event) => updateFilter('status', event.target.value)} className="rounded-xl border border-beige bg-sand px-3 py-2 text-sm text-dark"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="booked">Booked</option><option value="attended">Attended</option><option value="cancelled">Cancelled</option><option value="successful">Successful</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="expired">Expired</option></select><input type="date" value={query.date_from ?? ''} onChange={(event) => updateFilter('date_from', event.target.value)} className="rounded-xl border border-beige bg-sand px-3 py-2 text-sm text-dark" /><input type="date" value={query.date_to ?? ''} onChange={(event) => updateFilter('date_to', event.target.value)} className="rounded-xl border border-beige bg-sand px-3 py-2 text-sm text-dark" /><button type="submit" className="rounded-xl bg-dark px-4 py-2 text-xs uppercase tracking-widest text-sand hover:bg-gold-dark">Search</button></form>
    <FormError message={error} />{isLoading && <p className="text-sm text-brown">Loading report…</p>}{report && !isLoading && <><ReportTable report={report} query={query} onSort={sort} onExport={exportReport} /><div className="flex items-center justify-between text-sm text-brown"><button type="button" disabled={(report.page ?? 1) <= 1} onClick={() => setQuery((current) => ({ ...current, page: (current.page ?? 1) - 1 }))} className="rounded-full border border-beige px-4 py-2 disabled:opacity-40">Previous</button><span>Page {report.page} of {totalPages}</span><button type="button" disabled={report.page >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: (current.page ?? 1) + 1 }))} className="rounded-full border border-beige px-4 py-2 disabled:opacity-40">Next</button></div></>}</div>;
};
