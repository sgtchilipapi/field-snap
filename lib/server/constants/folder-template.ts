export const GENERAL_BUSINESS_DOCS_FOLDER_NAME = "General Business Docs";

export const DEFAULT_CATEGORIES = [
  { name: "Landscaping", slug: "landscaping" },
  { name: "HVAC", slug: "hvac" },
  { name: "Plumbing", slug: "plumbing" },
  { name: "Electrical", slug: "electrical" },
  { name: "Cleaning", slug: "cleaning" },
  { name: "General Contracting", slug: "general-contracting" },
  { name: "Other", slug: "other" }
] as const;

export const GENERAL_FOLDER_TEMPLATES = [
  { key: "in_process", name: "00 In-Process" },
  { key: "insurance", name: "01 Insurance" },
  { key: "licenses", name: "02 Licenses" },
  { key: "tax", name: "03 Tax" },
  { key: "payroll", name: "04 Payroll" },
  { key: "bank_credit_card", name: "05 Bank and Credit Card" },
  { key: "loans_financing", name: "06 Loans and Financing" },
  { key: "contracts_legal", name: "07 Contracts and Legal" },
  { key: "needs_review", name: "99 Needs Review" }
] as const;
