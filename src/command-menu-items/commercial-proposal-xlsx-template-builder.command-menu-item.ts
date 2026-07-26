import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_BUILDER_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_BUILDER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineCommandMenuItem({
  universalIdentifier:
    COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_BUILDER_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Шаблоны КП (XLSX)',
  shortLabel: 'Шаблоны КП',
  isPinned: false,
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier:
    COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_BUILDER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
