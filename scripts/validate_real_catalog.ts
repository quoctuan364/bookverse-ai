import path from "node:path";

import { loadAndValidateCategoryMapping, loadAndValidateRealCatalog } from "@/lib/real-catalog";

const sourcePath = path.resolve(process.cwd(), "data", "real-catalog", "bookverse_real_catalog.json");
const mappingPath = path.resolve(process.cwd(), "config", "real-catalog-category-mapping.json");
const validation = loadAndValidateRealCatalog(sourcePath);
const mappingValidation = validation.catalog
  ? loadAndValidateCategoryMapping(mappingPath, validation.catalog, validation.summary.catalogChecksum)
  : { mapping: null, issues: [], mappingChecksum: "NOT_AVAILABLE" };

const output = {
  ...validation.summary,
  mappingStatus: mappingValidation.mapping ? "VERIFIED" : "FAILED",
  mappingChecksum: mappingValidation.mappingChecksum,
  mappingIssues: mappingValidation.issues,
};
console.log(JSON.stringify(output, null, 2));
if (!validation.catalog || !mappingValidation.mapping) process.exitCode = 1;
