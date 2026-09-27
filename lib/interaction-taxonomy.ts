import taxonomyJson from "@/shared/interaction-taxonomy.v1.json";

export type PrivacyClassification =
  | "PSEUDONYMOUS_BEHAVIOR"
  | "POTENTIALLY_SENSITIVE_TEXT"
  | "TRANSACTIONAL"
  | "USER_GENERATED_CONTENT"
  | "SECURITY_MODERATION";

export interface TaxonomyEventDefinition {
  name: string;
  meaning: string;
  requiredFields: string[];
  optionalFields: string[];
  positiveLabel: boolean;
  positiveCondition: string | null;
  currentWeight: number | null;
  weightNote: string | null;
  privacy: PrivacyClassification;
}

export interface InteractionTaxonomy {
  version: string;
  description: string;
  events: TaxonomyEventDefinition[];
  aliases: Record<string, string>;
}

export interface EventValidationResult {
  valid: boolean;
  missingFields: string[];
}

function normalizeEventName(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function validateTaxonomy(value: InteractionTaxonomy): InteractionTaxonomy {
  if (value.version !== "interaction-taxonomy.v1") {
    throw new Error("Taxonomy version không được hỗ trợ.");
  }

  const names = value.events.map((event) => normalizeEventName(event.name));
  if (new Set(names).size !== names.length) {
    throw new Error("Canonical taxonomy có event bị trùng.");
  }

  const nameSet = new Set(names);
  for (const [alias, target] of Object.entries(value.aliases)) {
    if (!alias.trim() || !nameSet.has(normalizeEventName(target))) {
      throw new Error(`Alias taxonomy không hợp lệ: ${alias}.`);
    }
  }

  return value;
}

export const INTERACTION_TAXONOMY = validateTaxonomy(
  taxonomyJson as InteractionTaxonomy,
);
export const TAXONOMY_VERSION = INTERACTION_TAXONOMY.version;

const EVENT_BY_NAME = new Map(
  INTERACTION_TAXONOMY.events.map((event) => [normalizeEventName(event.name), event]),
);

export function mapLegacyInteractionEvent(rawEvent: string): string | null {
  const normalized = normalizeEventName(rawEvent);
  return INTERACTION_TAXONOMY.aliases[normalized] ?? null;
}

export function getTaxonomyEvent(name: string): TaxonomyEventDefinition | null {
  const canonical = mapLegacyInteractionEvent(name) ?? normalizeEventName(name);
  return EVENT_BY_NAME.get(canonical) ?? null;
}

export function validateCanonicalEventFields(
  eventName: string,
  fields: Record<string, unknown>,
): EventValidationResult {
  const definition = getTaxonomyEvent(eventName);
  if (!definition) {
    throw new Error(`Unknown interaction event: ${eventName}.`);
  }

  const missingFields = definition.requiredFields.filter((field) => {
    const value = fields[field];
    return value === undefined || value === null || (typeof value === "string" && !value.trim());
  });
  return { valid: missingFields.length === 0, missingFields };
}

export function taxonomyManifest(): {
  version: string;
  canonicalEvents: string[];
  aliases: Record<string, string>;
  checksum: string;
} {
  const canonicalEvents = [...EVENT_BY_NAME.keys()].sort();
  const aliases = Object.fromEntries(
    Object.entries(INTERACTION_TAXONOMY.aliases).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  );
  const payload = JSON.stringify({ version: TAXONOMY_VERSION, canonicalEvents, aliases });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("crypto");
  return {
    version: TAXONOMY_VERSION,
    canonicalEvents,
    aliases,
    checksum: createHash("sha256").update(payload).digest("hex"),
  };
}
