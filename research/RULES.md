# Rule set: zone ย.10, Bangkok (verified against primary text)

This file is the single source of truth for what the tool enforces. Every number below was read from the
primary legal text (Royal Gazette copies and consolidated texts hosted by the Association of Siamese
Architects, ASA), not from summaries. Quotes are kept short; clause numbers let anyone check them.

## Which law is in force (19 Nov 2026)

- **Bangkok Comprehensive Plan**: *กฎกระทรวงให้ใช้บังคับผังเมืองรวมกรุงเทพมหานคร พ.ศ. 2556*,
  Royal Gazette vol. 130 part 41 ก, 16 May 2013. Its own clause 1 says five years, but it stays in force
  until replaced (the BMA's 2026 amendment below is issued under it, citing Town Planning Act B.E. 2562).
  Source: https://download.asa.or.th/03media/04law/cpa/mr56-bma.pdf (82 pp.) and the full version with
  zone boundaries and road lists, https://download.asa.or.th/03media/04law/cpa/mr56-bma-full.pdf (287 pp.).
- **Amendment**: *ข้อบัญญัติกรุงเทพมหานคร เรื่อง ให้ใช้บังคับผังเมืองรวมกรุงเทพมหานคร พ.ศ. 2569*,
  Royal Gazette vol. 143 special part 66 ง, 13 Mar 2026, in force the next day. Read page by page: it only
  rewrites the factory exemption item (1) of each zone (adds factory type 90). **No change to FAR, OSR,
  or the condo/office/hotel conditions.** Source: https://download.asa.or.th/03media/04law/cpa/bb69-bma.pdf
- **4th revision of the plan**: still a draft (90-day public comment period, 10 Aug to 9 Nov 2026, per news and the LAD notice in R1; no Royal Gazette notice of adoption found). Not applied.
- **Building control**: Ministerial Regulations (MR) No. 55 (2000, consolidated to No. 68 / 2020), No. 33
  (1992, consolidated to 2026), No. 7 (1974, consolidated to No. 64 / 2012) under the Building Control Act
  B.E. 2522, plus the Bangkok Building Control Ordinance B.E. 2544. Consolidated texts from
  https://asa.or.th/laws-and-regulations/cba/.

## Why ย.10

ย.10 (brown, "high-density residential") is the inner-city condo zone: "to support housing in the inner
city next to the central business district and the mass-transit service area" (plan cl. 17). Condos are not
restricted there, while hotels and offices are, so the building type genuinely changes the answer.
FAR 8 is high enough that the national envelope rules (setbacks, 2:1 sky plane, the 23 m high-rise
threshold, road width) are what actually shape the building, which is the interesting part.

Demo patch: **ย.10-4**, Watthana district. Plan text (full PDF p. 71): north = Khlong Saen Saep (south
bank); east = Soi Sukhumvit 49 (west side), road ข 41, Soi Sukhumvit 55 Thong Lo (west side);
south = Sukhumvit Road (north side); west = a line 200 m east of the Asok Montri right-of-way, and
Srinakharinwirot University Prasarnmit. This is Sukhumvit sois 23–55, north side: BTS Asok, Phrom Phong,
Thong Lo, MRT Sukhumvit.

## Zone rules (plan 2556, cl. 4, 17, 36, 37, 40, 51–57)

| id | Rule | Value in ย.10 | Clause |
|---|---|---|---|
| Z-FAR | Total floor area of all floors of all buildings ÷ plot area | ≤ 8 : 1 | cl. 17 para 3 (1); def. cl. 4 |
| Z-OSR | Uncovered open space of the plot ÷ total floor area | ≥ 4 % (and never below the building-control minimum) | cl. 17 para 3 (2); def. cl. 4 |
| Z-PERM | Permeable planted ground | ≥ 50 % of the open space | cl. 17 para 3 (2) |
| Z-HOTEL | Hotels with more than 80 rooms are prohibited... | ...unless on a public road with right-of-way ≥ 12 m, or within 500 m of a mass-transit station | cl. 17 para 2 (8) |
| Z-OFFICE | Offices with more than 10,000 m² of operating area are prohibited... | ...same exceptions (ROW ≥ 12 m, or ≤ 500 m from a station) | cl. 17 para 2 (10) |
| Z-COMM | Commerce > 5,000 m² needs ROW ≥ 12 m or station; > 10,000 m² needs ROW ≥ 16 m or station | (not a building type here; noted) | cl. 17 para 2 (9) |
| Z-CONDO | Condominium / apartment | not restricted in ย.10 | (absent from cl. 17 list) |
| Z-ROAD | What "on a road with ROW ≥ X" means: a plot side ≥ 12 m (≥ 16 m for the 16 m tier) abutting that road, which runs continuously to another public road | used for Z-HOTEL / Z-OFFICE | cl. 36 |
| Z-STATION | 500 m is measured from the station platform boundary | used for Z-HOTEL / Z-OFFICE | cl. 37 |
| Z-BONUS | FAR bonuses (affordable housing, public open space, park-and-ride near stations, rainwater retention, green building) | combined ≤ +20 % | cl. 51–57 (shown, not applied) |
| Z-L2 | 2 m planting strip from the right-of-way on the 40 roads listed as ล.2 | none of them is in ย.10-4 | cl. 40 (1), open-space annex |

FAR, OSR in numbers for the whole plan (primary, cl. 8–33): ย.1 1/40 %, ย.2 1.5/20, ย.3 2.5/12.5, ย.4 3/10,
ย.5 4/7.5, ย.6 4.5/6.5, ย.7 5/6, ย.8 6/5, ย.9 7/4.5, **ย.10 8/4**, พ.1 5/6, พ.2 6/5, พ.3 7/4.5, พ.4 8/4,
พ.5 10/3, อ.1 2/15, อ.2 1.5/20, อ.3 1/40.

Parking counts toward FAR: cl. 54 exempts only the *extra public* parking from FAR and OSR, which implies
ordinary parking floors count. Applied.

## Building-control rules

| id | Rule | Value | Source |
|---|---|---|---|
| B-SETBACK-ROAD | Building line from a public road, for buildings over 2 storeys or 8 m (and all commercial/public buildings) | road < 10 m: 6 m from the **road centreline**; 10–20 m: 1/10 of the road width from the road boundary; > 20 m: 2 m from the road boundary | MR 55 cl. 41; BKK Ord. 2544 cl. 50 |
| B-SKY | Height at any point ≤ 2 × the horizontal distance, measured perpendicular, to the **opposite** boundary of the nearest public road | slope 2 : 1 | MR 55 cl. 44; BKK cl. 49 |
| B-SKY-CORNER | Corner of two unequal roads: measure from the wider road; building length along the narrower road ≤ 60 m. Two unequal parallel roads ≤ 60 m apart: wider road, building width along it ≤ 60 m | | MR 55 cl. 45, 46 |
| B-HEIGHT-DEF | Height measured from ground/road level to the highest part; gable/hip roofs to the top of the top-storey wall; rooftop structures excluded | | MR 55 cl. 44 para 2–3 |
| B-SIDE | Walls with windows, doors, vents or balconies: distance from plot boundary | building ≤ 9 m: 2 m; > 9 m and < 23 m: 3 m (blank walls may be closer, ≥ 0.5 m, or on the line up to 15 m with consent) | MR 55 cl. 50 |
| B-OPEN | Open space (uncovered) on the plot | residential/condo ≥ 30 % of the **largest single floor**; office, hotel and other non-residential ≥ 10 % | MR 55 cl. 33 |
| B-HR-DEF | High-rise: occupied building ≥ 23 m, measured from ground to roof deck (top-storey wall top for pitched roofs). Extra-large: total (or any floor) ≥ 10,000 m² | | MR 33 cl. 1 |
| B-HR-ACCESS | High-rise or extra-large: a plot side ≥ 12 m on a public road with ROW ≥ 10 m (if total ≤ 30,000 m²) or ≥ 18 m (if > 30,000 m²), continuous to another such road | | MR 33 cl. 2 |
| B-HR-CLEAR | High-rise or extra-large: outermost parts ≥ 6 m from neighbouring land **and** from public roads; plus an unroofed fire-truck road ≥ 6 m wide around the building | | MR 33 cl. 3, 4 |
| B-LARGE | Large building: total or any floor > 2,000 m², or ≥ 15 m high with > 1,000 m² | | MR 7 cl. 1 (12) |
| B-CANAL | Setback from a public waterway | < 10 m wide: 3 m; ≥ 10 m: 6 m | MR 55 cl. 42; plan cl. 40 (2) |
| B-PARK | Car parking (Bangkok) | condo: 1 per unit for units ≥ 60 m²; office: 1 per 60 m²; hotel: MR 7 (as amended by MR 64, 2555) asks 1 per 10 m² of hall + 1 per 20 m² of commercial area, while BMA Ordinance 2544 cl. 84(2) still asks 10 cars for the first 30 rooms, 1 per 5 rooms to 100, 1 per 10 beyond; any large building: at least 1 per 120 m² of building area, whichever is more. **Tool uses the larger of the two hotel rules.** | MR 7 cl. 2, 3 (1); BMA Ordinance 2544 cl. 83–85 |
| X-EIA | Environmental impact assessment | condo ≥ 80 units or ≥ 4,000 m² usable; hotel ≥ 80 rooms or ≥ 4,000 m² usable; private office that is high-rise (≥ 23 m) or extra-large (≥ 10,000 m²). Report approved before the permit | MNRE Notification B.E. 2566, Annex 4 items 31, 30, 27.3 (onep.go.th, primary) |

"Right-of-way" (เขตทาง) = full width between the property lines on both sides, including carriageway,
footpaths, planting strips and ditches (BKK Ord. 2544 cl. 5 (4)).

## Road widths: an official source for named roads

The plan annex lists public roads by right-of-way class (full PDF, lists 11–14). In and around ย.10-4:

| Road | Listed ROW class |
|---|---|
| Sukhumvit Road | ≥ 30 m (list 14) |
| Phetchaburi Road | ≥ 30 m (list 14) |
| Soi Sukhumvit 21 (Asok Montri) | ≥ 16 m (list 13) |
| Soi Sukhumvit 39 (Phrom Phong) | ≥ 16 m (list 13) |
| Soi Sukhumvit 55 (Thong Lo) | ≥ 16 m (list 13) |
| Soi Sukhumvit 63 (Ekkamai) | ≥ 16 m (list 13) |
| Rama IV Road | ≥ 16 m (list 13) |
| Other sois in ย.10-4 (23, 31, 33, 49 ...) | not listed: treat as < 10 m unless surveyed |

Soi 39 (north part) and Soi 49 / 49/11 are also planned widenings to 16 m (roads ข 38, ข 41); for these the
plan says building lines are measured from the *planned* right-of-way (cl. 36 para 2). Noted, not yet modelled.

## How the tool applies them (decisions)

1. **Two envelopes.** The 23 m high-rise threshold is a cliff, so the tool shows both: *low-rise* (roof
   deck < 23 m, MR 55 side distances) and *high-rise* (6 m clear all round, only if the site passes
   B-HR-ACCESS). Bangkok's many 8-storey condos at just under 23 m exist for exactly this reason.
2. **Extra-large trigger.** A low-rise design ≥ 10,000 m² also needs B-HR-ACCESS and B-HR-CLEAR. The design
   generator keeps low-rise options under 10,000 m² unless the site qualifies.
3. **Sky plane with several frontages.** Equal widths: nearest road governs (min of planes). Unequal widths at
   a corner: wider road governs, with a 60 m check along the narrower road (cl. 46).
4. **Road setback geometry.** The plot edge is taken as the road boundary and the road as centred on its
   right-of-way, so "6 m from centreline" becomes max(0, 6 − W/2) from the plot edge.
5. **Side distances assume windows on every façade** (true for condos, hotels and offices). The tool notes
   that blank party walls could sit closer.
6. **Height** = top of the roof slab of the highest storey. Parapets and rooftop structures are excluded
   (MR 55 cl. 44 para 3).
7. **Open space** = plot area − building footprint (ground coverage); parking and podium roofs count as
   covered. Permeable ≥ 50 % of that is reported as a landscape requirement.
8. **Not modelled**: FAR bonuses, planned road widenings, airport height zones (none over ย.10-4). EIA is
   reported as a process duty (warning), not a design limit
   (thresholds not verified from primary text; flagged as "likely required" for large condos/hotels).
