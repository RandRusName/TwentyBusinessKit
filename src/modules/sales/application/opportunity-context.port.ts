import type { OpportunityContext } from 'src/modules/sales/domain/opportunity-context';

export type { OpportunityContext };

export interface OpportunityContextQuery {
  getOpportunityContext(opportunityId: string): Promise<OpportunityContext>;
}
