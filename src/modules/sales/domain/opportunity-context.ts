export type OpportunityContext = {
  id: string;
  name: string;
  company: {
    id: string;
    name: string;
  } | null;
  amount: number | null;
  currencyCode: string | null;
};
