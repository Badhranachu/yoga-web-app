import { ArrowDown, ArrowUp, Download } from 'lucide-react';
import type { ReportQuery, ReportResponse } from '../types';

const label = (column: string) => column.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

type Props = { report: ReportResponse; query: ReportQuery; onSort: (column: string) => void; onExport: (format: 'csv' | 'pdf') => void };

export const ReportTable = ({ report, query, onSort, onExport }: Props) => (
  <div className="overflow-hidden rounded-2xl border border-beige bg-cream shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-beige px-5 py-4">
      <p className="text-sm text-brown">{report.count} record{report.count === 1 ? '' : 's'}</p>
      <div className="flex gap-2"><button type="button" onClick={() => onExport('csv')} className="inline-flex items-center gap-1 rounded-full border border-beige px-3 py-1.5 text-xs uppercase tracking-widest text-brown hover:border-gold-dark"><Download size={13} /> CSV</button><button type="button" onClick={() => onExport('pdf')} className="inline-flex items-center gap-1 rounded-full border border-beige px-3 py-1.5 text-xs uppercase tracking-widest text-brown hover:border-gold-dark"><Download size={13} /> PDF</button></div>
    </div>
    <div className="overflow-x-auto"><table aria-label={report.title} className="min-w-full text-left text-sm"><thead className="border-b border-beige bg-sand/60"><tr>{report.columns.map((column) => <th key={column} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-brown"><button type="button" onClick={() => onSort(column)} className="inline-flex items-center gap-1 hover:text-dark">{label(column)}{query.sort === column && (query.order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</button></th>)}</tr></thead><tbody className="divide-y divide-beige">{report.results.map((row, index) => <tr key={`${String(row.id ?? row.transaction_id ?? index)}`} className="hover:bg-sand/30">{report.columns.map((column) => <td key={column} className="whitespace-nowrap px-4 py-3 text-dark">{String(row[column] ?? '—')}</td>)}</tr>)}</tbody></table></div>
    {report.results.length === 0 && <p className="px-5 py-8 text-center text-sm text-brown">No matching records.</p>}
  </div>
);
