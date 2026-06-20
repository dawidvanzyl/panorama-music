import noFetchInComponents from './rules/no-fetch-in-components.js';
import noDomInServices from './rules/no-dom-in-services.js';
import enforceFeatureBoundaries from './rules/enforce-feature-boundaries.js';

export const rules = {
  'no-fetch-in-components': noFetchInComponents,
  'no-dom-in-services': noDomInServices,
  'enforce-feature-boundaries': enforceFeatureBoundaries,
};

export default { rules };