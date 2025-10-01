export interface TimeEntry {
  id: string;
  description: string;
  timestamp: string;
  actualHours: number;
  billableHours: number;
  billableAmount: number;
  isBillable: boolean;
  owner: string;
  ownerName?: string;
  billReference?: string | null;
}

export interface InvoiceContext {
  actionId: string;
  matterNumber: string;
  matterName: string;
  clientName: string;
  clientEmail?: string;
  currency: string;
  totals: {
    billed: number;
    payments: number;
    outstanding: number;
  };
  timeEntries: TimeEntry[];
  disbursements?: {
    invoiced?: number;
    uninvoiced?: number;
    unpaidSupplier?: number;
  };
  trust?: {
    balance?: number;
  };
  writeOffs?: number;
}

export interface InvoiceSummaryEntry {
  id: string;
  description: string;
  date: string;
  owner: string;
  amount: number;
  isBillable: boolean;
  hours: number;
}

export interface FeeBreakdown {
  amount: number;
  hours: number;
}

export interface InvoiceFinancialPanels {
  fees: {
    invoiced: FeeBreakdown;
    uninvoiced: FeeBreakdown;
  };
  invoices: {
    invoiced: number;
    outstanding: number;
  };
  payments: {
    paidToDate: number;
    writeOffs: number;
  };
  disbursements: {
    invoiced: number | null;
    uninvoiced: number | null;
    unpaidSupplier: number | null;
  };
  trust: {
    balance: number | null;
  };
}

export interface InvoiceSummary {
  actionId: string;
  matterNumber: string;
  matterName: string;
  clientName: string;
  clientEmail?: string;
  currency: string;
  totals: {
    billable: number;
    nonBillable: number;
    billed: number;
    payments: number;
    outstanding: number;
  };
  entries: InvoiceSummaryEntry[];
  narrativeSummary: string;
  fees: InvoiceFinancialPanels['fees'];
  panels: InvoiceFinancialPanels;
  generatedAt: string;
}

export interface InvoiceEmail {
  to: string;
  subject: string;
  body: string;
}

export interface InvoiceSummaryResponse {
  summary: InvoiceSummary;
  email: InvoiceEmail | null;
}
