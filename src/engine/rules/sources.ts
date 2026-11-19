import type { Citation } from "../types";

// Primary legal sources (consolidated texts hosted by the Association of Siamese Architects).
// See research/RULES.md for how each was read and checked.

const ASA = "https://download.asa.or.th/03media/04law";

export const PLAN = {
  doc: "Bangkok Comprehensive Plan, Ministerial Regulation B.E. 2556 (2013)",
  url: `${ASA}/cpa/mr56-bma.pdf`,
};
export const PLAN_FULL_URL = `${ASA}/cpa/mr56-bma-full.pdf`;
export const PLAN_AMEND = {
  doc: "BMA Ordinance on the Bangkok Comprehensive Plan B.E. 2569 (2026)",
  url: `${ASA}/cpa/bb69-bma.pdf`,
};
export const MR55 = {
  doc: "Ministerial Regulation No. 55 (B.E. 2543), Building Control Act",
  url: `http://download.asa.or.th/03media/04law/cba/mr/mr43-55-upd68(bm).pdf`,
};
export const MR33 = {
  doc: "Ministerial Regulation No. 33 (B.E. 2535), Building Control Act",
  url: `http://download.asa.or.th/03media/04law/cba/mr/mr35-33-upd69.pdf`,
};
export const MR7 = {
  doc: "Ministerial Regulation No. 7 (B.E. 2517), Building Control Act",
  url: `http://download.asa.or.th/03media/04law/cba/mr/mr17-07-upd64.pdf`,
};
export const BKK2544 = {
  doc: "Bangkok Building Control Ordinance B.E. 2544 (2001)",
  url: `http://download.asa.or.th/03media/04law/cba/bb/bb44-03.pdf`,
};

export function cite(src: { doc: string; url: string }, clause: string): Citation {
  return { doc: src.doc, clause, url: src.url };
}

export const EIA2566 = {
  doc: "MNRE Notification on projects requiring an EIA, B.E. 2566 (2023)",
  url: "https://www.onep.go.th/wp-content/uploads/2024/01/2567-01-05-p240-mnre-announcement.pdf",
};
