// Serial number to site, meter group, and percentage mapping
export interface SerialMapping {
  serial: string
  site: string
  meterGroup: number
  percentage: number
  gtsdbKeys?: string[]
}

// Mapping from serial number to meter configuration
export const SERIAL_TO_METER: Record<string, SerialMapping> = {
  // The Hunt
  "ADEST-000001-0001": { serial: "ADEST-000001-0001", site: "The Hunt", meterGroup: 1, percentage: 100 },
  "ADEST-000001-0002": { serial: "ADEST-000001-0002", site: "The Hunt", meterGroup: 2, percentage: 100 },
  "ADEST-000001-0003": { serial: "ADEST-000001-0003", site: "The Hunt", meterGroup: 3, percentage: 100 },
  "ADEST-000001-0004": { serial: "ADEST-000001-0004", site: "The Hunt", meterGroup: 4, percentage: 100 },
  "ADEST-000001-0005": { serial: "ADEST-000001-0005", site: "The Hunt", meterGroup: 5, percentage: 100 },
  
  // TNL
  "ADEST-000002-0001": { serial: "ADEST-000002-0001", site: "TNL", meterGroup: 6, percentage: 6.80 },
  "ADEST-000002-0002": { serial: "ADEST-000002-0002", site: "TNL", meterGroup: 6, percentage: 7.10 },
  "ADEST-000002-0003": { serial: "ADEST-000002-0003", site: "TNL", meterGroup: 6, percentage: 7.50 },
  "ADEST-000002-0004": { serial: "ADEST-000002-0004", site: "TNL", meterGroup: 6, percentage: 6.90 },
  "ADEST-000002-0005": { serial: "ADEST-000002-0005", site: "TNL", meterGroup: 6, percentage: 7.30 },
  "ADEST-000002-0006": { serial: "ADEST-000002-0006", site: "TNL", meterGroup: 6, percentage: 7.00 },
  "ADEST-000002-0007": { serial: "ADEST-000002-0007", site: "TNL", meterGroup: 6, percentage: 7.20 },
  "ADEST-000002-0008": { serial: "ADEST-000002-0008", site: "TNL", meterGroup: 6, percentage: 7.10 },
  "ADEST-000002-0009": { serial: "ADEST-000002-0009", site: "TNL", meterGroup: 6, percentage: 7.40 },
  "ADEST-000002-0010": { serial: "ADEST-000002-0010", site: "TNL", meterGroup: 6, percentage: 7.00 },
  "ADEST-000002-0011": { serial: "ADEST-000002-0011", site: "TNL", meterGroup: 6, percentage: 7.60 },
  "ADEST-000002-0012": { serial: "ADEST-000002-0012", site: "TNL", meterGroup: 6, percentage: 6.90 },
  "ADEST-000002-0013": { serial: "ADEST-000002-0013", site: "TNL", meterGroup: 6, percentage: 7.30 },
  "ADEST-000002-0014": { serial: "ADEST-000002-0014", site: "TNL", meterGroup: 6, percentage: 7.00 },
  
  // Weave Kai Tak
  "ADEST-000003-0001": { serial: "ADEST-000003-0001", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.55 },
  "ADEST-000003-0002": { serial: "ADEST-000003-0002", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.60 },
  "ADEST-000003-0003": { serial: "ADEST-000003-0003", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.68 },
  "ADEST-000003-0004": { serial: "ADEST-000003-0004", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.72 },
  "ADEST-000003-0005": { serial: "ADEST-000003-0005", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.65 },
  "ADEST-000003-0006": { serial: "ADEST-000003-0006", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.74 },
  "ADEST-000003-0007": { serial: "ADEST-000003-0007", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.71 },
  "ADEST-000003-0008": { serial: "ADEST-000003-0008", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.66 },
  "ADEST-000003-0009": { serial: "ADEST-000003-0009", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.77 },
  "ADEST-000003-0010": { serial: "ADEST-000003-0010", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.64 },
  "ADEST-000003-0011": { serial: "ADEST-000003-0011", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.73 },
  "ADEST-000003-0012": { serial: "ADEST-000003-0012", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.69 },
  "ADEST-000003-0013": { serial: "ADEST-000003-0013", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.70 },
  "ADEST-000003-0014": { serial: "ADEST-000003-0014", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.67 },
  "ADEST-000003-0015": { serial: "ADEST-000003-0015", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.76 },
  "ADEST-000003-0016": { serial: "ADEST-000003-0016", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.59 },
  "ADEST-000003-0017": { serial: "ADEST-000003-0017", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.70 },
  "ADEST-000003-0018": { serial: "ADEST-000003-0018", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.61 },
  "ADEST-000003-0019": { serial: "ADEST-000003-0019", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.75 },
  "ADEST-000003-0020": { serial: "ADEST-000003-0020", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.68 },
  "ADEST-000003-0021": { serial: "ADEST-000003-0021", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.72 },
  "ADEST-000003-0022": { serial: "ADEST-000003-0022", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.65 },
  "ADEST-000003-0023": { serial: "ADEST-000003-0023", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.71 },
  "ADEST-000003-0024": { serial: "ADEST-000003-0024", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.63 },
  "ADEST-000003-0025": { serial: "ADEST-000003-0025", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.74 },
  "ADEST-000003-0026": { serial: "ADEST-000003-0026", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.70 },
  "ADEST-000003-0027": { serial: "ADEST-000003-0027", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.68 },
  "ADEST-000003-0028": { serial: "ADEST-000003-0028", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.66 },
  "ADEST-000003-0029": { serial: "ADEST-000003-0029", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.73 },
  "ADEST-000003-0030": { serial: "ADEST-000003-0030", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.62 },
  "ADEST-000003-0031": { serial: "ADEST-000003-0031", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.69 },
  "ADEST-000003-0032": { serial: "ADEST-000003-0032", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.71 },
  "ADEST-000003-0033": { serial: "ADEST-000003-0033", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.75 },
  "ADEST-000003-0034": { serial: "ADEST-000003-0034", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.63 },
  "ADEST-000003-0035": { serial: "ADEST-000003-0035", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.67 },
  "ADEST-000003-0036": { serial: "ADEST-000003-0036", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.72 },
  "ADEST-000003-0037": { serial: "ADEST-000003-0037", site: "Weave Kai Tak", meterGroup: 7, percentage: 2.68 },
  
  // Samdosu
  "ADEST-000004-0001": { serial: "ADEST-000004-0001", site: "Samdosu", meterGroup: 8, percentage: 9.60 },
  "ADEST-000004-0002": { serial: "ADEST-000004-0002", site: "Samdosu", meterGroup: 8, percentage: 10.30 },
  "ADEST-000004-0003": { serial: "ADEST-000004-0003", site: "Samdosu", meterGroup: 8, percentage: 9.90 },
  "ADEST-000004-0004": { serial: "ADEST-000004-0004", site: "Samdosu", meterGroup: 8, percentage: 10.20 },
  "ADEST-000004-0005": { serial: "ADEST-000004-0005", site: "Samdosu", meterGroup: 8, percentage: 9.80 },
  "ADEST-000004-0006": { serial: "ADEST-000004-0006", site: "Samdosu", meterGroup: 8, percentage: 10.50 },
  "ADEST-000004-0007": { serial: "ADEST-000004-0007", site: "Samdosu", meterGroup: 8, percentage: 9.70 },
  "ADEST-000004-0008": { serial: "ADEST-000004-0008", site: "Samdosu", meterGroup: 8, percentage: 10.40 },
  "ADEST-000004-0009": { serial: "ADEST-000004-0009", site: "Samdosu", meterGroup: 8, percentage: 9.60 },
  "ADEST-000004-0010": { serial: "ADEST-000004-0010", site: "Samdosu", meterGroup: 8, percentage: 10.00 },
  
  // Telstar Office
  "ADEST-000005-0001": { serial: "ADEST-000005-0001", site: "Telstar Office", meterGroup: 9, percentage: 3.71 },
  "ADEST-000005-0002": { serial: "ADEST-000005-0002", site: "Telstar Office", meterGroup: 9, percentage: 3.80 },
  "ADEST-000005-0003": { serial: "ADEST-000005-0003", site: "Telstar Office", meterGroup: 9, percentage: 3.89 },
  "ADEST-000005-0004": { serial: "ADEST-000005-0004", site: "Telstar Office", meterGroup: 9, percentage: 3.84 },
  "ADEST-000005-0005": { serial: "ADEST-000005-0005", site: "Telstar Office", meterGroup: 9, percentage: 3.95 },
  "ADEST-000005-0006": { serial: "ADEST-000005-0006", site: "Telstar Office", meterGroup: 9, percentage: 3.68 },
  "ADEST-000005-0007": { serial: "ADEST-000005-0007", site: "Telstar Office", meterGroup: 9, percentage: 3.91 },
  "ADEST-000005-0008": { serial: "ADEST-000005-0008", site: "Telstar Office", meterGroup: 9, percentage: 3.83 },
  "ADEST-000005-0009": { serial: "ADEST-000005-0009", site: "Telstar Office", meterGroup: 9, percentage: 3.76 },
  "ADEST-000005-0010": { serial: "ADEST-000005-0010", site: "Telstar Office", meterGroup: 9, percentage: 3.97 },
  "ADEST-000005-0011": { serial: "ADEST-000005-0011", site: "Telstar Office", meterGroup: 9, percentage: 3.85 },
  "ADEST-000005-0012": { serial: "ADEST-000005-0012", site: "Telstar Office", meterGroup: 9, percentage: 3.79 },
  "ADEST-000005-0013": { serial: "ADEST-000005-0013", site: "Telstar Office", meterGroup: 9, percentage: 3.88 },
  "ADEST-000005-0014": { serial: "ADEST-000005-0014", site: "Telstar Office", meterGroup: 9, percentage: 3.73 },
  "ADEST-000005-0015": { serial: "ADEST-000005-0015", site: "Telstar Office", meterGroup: 9, percentage: 3.92 },
  "ADEST-000005-0016": { serial: "ADEST-000005-0016", site: "Telstar Office", meterGroup: 9, percentage: 3.80 },
  "ADEST-000005-0017": { serial: "ADEST-000005-0017", site: "Telstar Office", meterGroup: 9, percentage: 3.87 },
  "ADEST-000005-0018": { serial: "ADEST-000005-0018", site: "Telstar Office", meterGroup: 9, percentage: 3.78 },
  "ADEST-000005-0019": { serial: "ADEST-000005-0019", site: "Telstar Office", meterGroup: 9, percentage: 3.93 },
  "ADEST-000005-0020": { serial: "ADEST-000005-0020", site: "Telstar Office", meterGroup: 9, percentage: 3.82 },
  "ADEST-000005-0021": { serial: "ADEST-000005-0021", site: "Telstar Office", meterGroup: 9, percentage: 3.90 },
  "ADEST-000005-0022": { serial: "ADEST-000005-0022", site: "Telstar Office", meterGroup: 9, percentage: 3.74 },
  "ADEST-000005-0023": { serial: "ADEST-000005-0023", site: "Telstar Office", meterGroup: 9, percentage: 3.86 },
  "ADEST-000005-0024": { serial: "ADEST-000005-0024", site: "Telstar Office", meterGroup: 9, percentage: 3.81 },
  "ADEST-000005-0025": { serial: "ADEST-000005-0025", site: "Telstar Office", meterGroup: 9, percentage: 3.94 },
  "ADEST-000005-0026": { serial: "ADEST-000005-0026", site: "Telstar Office", meterGroup: 9, percentage: 3.79 },
}

// Meter group to GTSDB keys mapping
export const METER_GROUP_TO_KEYS: Record<number, string[]> = {
  1: ["vertriqe_25120_cttp"],
  2: ["vertriqe_25121_cttp"],
  3: ["vertriqe_25122_cttp"],
  4: ["vertriqe_25123_cttp"],
  5: ["vertriqe_25124_cttp"],
  6: ["vertriqe_25415_cttp", "vertriqe_25416_cttp"],
  7: ["vertriqe_25245_weave"],
  8: ["vertriqe_25252_cttp"],
  9: ["vertriqe_25253_cttp", "vertriqe_25255_cttp", "vertriqe_25256_cttp", "vertriqe_25233_cttp", "vertriqe_25257_cttp", "vertriqe_25258_cttp"],
}

// Helper function to get GTSDB keys for a serial number
export function getKeysForSerial(serial: string): string[] | null {
  const mapping = SERIAL_TO_METER[serial]
  if (!mapping) return null
  
  return METER_GROUP_TO_KEYS[mapping.meterGroup] || null
}

// Helper function to get meter mapping by serial
export function getMeterMapping(serial: string): SerialMapping | null {
  return SERIAL_TO_METER[serial] || null
}
