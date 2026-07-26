/**
 * Sales public API.
 *
 * Stable contracts and adapters for reading Twenty Company / Opportunity
 * context. Other modules and logic functions must import Sales only through
 * this entrypoint.
 */

export type { OpportunityContextQuery } from './application/opportunity-context.port';
export { TwentySalesContextAdapter } from './infrastructure/twenty-sales-context.adapter';
