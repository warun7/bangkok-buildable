# R1: Bangkok Comprehensive Plan (ผังเมืองรวมกรุงเทพมหานคร), research as of 19 Nov 2026

Scope: which plan is legally in force, zone codes with FAR and OSR, use conditions for ย.8–ย.10 and พ.3–พ.5, bonuses, height controls, example locations.

Tags: [primary] = official text or official host; [secondary] = law firm, property site, news, or blog; [unverified] = found only in a snippet or not checked against a source.

## 0. Method and limits (read first)

- **Primary PDFs could not be read as text.** The 2556 Royal Gazette scan (ASA host), the 2569 BMA ordinance draft and the ISA 2556 land-use table all came back as compressed PDF binaries from WebFetch. No `pdftotext`, `pypdf` or OCR is installed here, so I did not install anything.
- **Partial decode of the 2556 gazette.** I decoded the text layer with Python's standard library (zlib plus ToUnicode maps). Headers and a few clause fragments are legible, for example the zone-definition clause naming ย.8 to ย.10 and พ.1 to พ.5. But the glyph mapping is lossy, so the FAR/OSR table and the road-width clauses are not reliably readable. **No Thai text in this file comes from the decoded gazette**, and no figure is attributed to it.
- **Not reached:** cpd.bangkok.go.th (connection reset), dpt.go.th (not fetched), krisdika.go.th and ocs.go.th (not searched directly), ratchakitcha.soc.go.th (not searched directly), and the Bangkok Post article (redirected to a tollbit URL, not followed).
- **Consequence:** every FAR/OSR figure below is [secondary], based on property and law-firm articles that agree with each other on most codes. The numbers must be checked against the gazette zone table before any client-facing use.
- Thai quotes are copied from the tool outputs shown, with English translations. Where a source paraphrased a clause, I say so.

---

## 1. Which plan is in force on 19 Nov 2026

**Answer: the 2013 (B.E. 2556) Ministerial Regulation is in force. The 4th revision is a draft and is not in force.** [secondary, high confidence on status; primary for the title and gazette date below]

### 1a. The 2556 regulation: title and gazette

- **Exact title (Thai):** กฎกระทรวงให้ใช้บังคับผังเมืองรวมกรุงเทพมหานคร พ.ศ. 2556
  - English: Ministerial Regulation to enforce the Bangkok Metropolitan Comprehensive Plan, B.E. 2556 (2013).
  - Source: ASA legal index, https://asa.or.th/laws-and-regulations/cpa/ [primary index, hosted by the Siam Architects Association]. The index lists the PDF at https://download.asa.or.th/03media/04law/cpa/mr56-bma.pdf.
  - Other English names in circulation (Wikipedia, LAD, Anderson) differ slightly; use the Thai title above. [secondary]
- **Royal Gazette:** เล่ม 130 ตอนที่ 41 ก (Volume 130, Part 41 A), dated 16 May 2556 (16 May 2013). Source: page title of the gazette scan, "หน้า ๑ เล่ม ๑๓๐ ตอนที่ ๔๑ ก ราชกิจจานุเบกษา ๑๖ พฤษภาคม ๒๕๕๖", at https://download.asa.or.th/03media/04law/cpa/mr56-bma-full.pdf and https://download.asa.or.th/03media/04law/cpa/mr56-bma.pdf. [primary copy, title confirmed in search result; pages 1–81 per the secondary article Sarasat, https://so05.tci-thaijo.org/index.php/sarasatr/article/download/290218/190623/1307489]
- **Effective date:** not confirmed. A secondary summary says the previous 2549 plan ended on 15 May 2556, which suggests the 2556 plan took effect on or about 16 May 2556. [unverified]
- **Correction sheet:** ใบแก้คำผิด dated 9 Oct 2556, https://download.asa.or.th/03media/04law/cpa/mr56-correction.pdf (listed in the ASA index). I did not read it. [primary index, content unverified]
- **Thai status statement** (thaipropertymentor, undated, https://thaipropertymentor.com/archives/36461): "ผังเมืองรวมกรุงเทพมหานคร พ.ศ.2556 ที่บังคับใช้อยู่ในปัจจุบัน" = "the Bangkok Comprehensive Plan B.E. 2556, which is in force at present." [secondary]

### 1b. Evidence it is still in force as of Oct–Nov 2026

- Anderson Land Specialist, 10 Oct 2569 (2026), updated 14 Oct 2569, https://www.andersonlandspecialist.com/guide/bangkok-zoning-colors: "Bangkok currently uses the city plan of 2556." [secondary]
- Thansettakij, 2 Sep 2026, https://www.thansettakij.com/real-estate/667968: compares "the in-force Bangkok Comprehensive Plan of 2556 (2013)" with the draft. [secondary]
- Nation Thailand, 25 Sep 2026, https://www.nationthailand.com/thailand/bangkok/40071451: describes the 4th revision as a draft that "is expected to take effect around mid-2027". [secondary]
- LAD, Aug 2026, https://www.lad.co.th/en/post/what-changes-in-the-draft-bangkok-comprehensive-plan-2026-10-key-issues-to-review-before-the-90-day: "The '2556' plan is the current 2013 Bangkok Comprehensive Plan. Everything else described is the draft." [secondary]

### 1c. The 4th revision (ร่างผังเมืองรวมกรุงเทพมหานคร ฉบับปรับปรุงครั้งที่ 4): status and dates

Timeline, most recent first:

| Date | Event | Source | Tag |
|---|---|---|---|
| 19 Nov 2026 (today) | Public comment window already closed on 9 Nov 2026. No gazette notice of adoption found. | LAD (window 10 Aug to 9 Nov 2026); Anderson; search summary | [secondary] |
| 25 Sep 2026 | Nation: BMA "officially opened the 90-day public-notice process for the fourth revision in August 2026"; draft "expected to take effect around mid-2027" | Nation, https://www.nationthailand.com/thailand/bangkok/40071451 | [secondary] |
| 14 Oct 2026 (update) | Anderson: draft "in the public comment stage"; "expected to take effect in late 2570" (2027) | Anderson | [secondary] |
| Oct 2569 (2026) | MGR Online: a citizen network submits a letter to the Governor asking that the draft be stopped. The draft is described as an ordinance "to replace the Ministerial Regulation of 2556". | https://mgronline.com/onlinesection/detail/9690000098240 (summary from search; exact date not read) | [secondary, paraphrase] |
| 2 Sep 2026 | Thansettakij: draft "open for a 90-day public comment period starting 10 August" | Thansettakij, https://www.thansettakij.com/real-estate/667968 | [secondary] |
| Aug 2026 | LAD: exhibition window "August 10 – November 9, 2026" | LAD | [secondary] |
| Date unknown | Siamrath: BMA says it followed the process under the Town Planning Act B.E. 2562; a lawsuit at the Administrative Court seeks to halt the process | https://siamrath.co.th/quality-of-life/news/131116 (not read in full) | [secondary, paraphrase, unverified] |
| Date unknown | Bangkok Metropolitan Council sets up an ad-hoc committee to review the draft ordinance | BMC https://bmc.go.th/en/prbmcnews-290168-08/ ; Matichon https://www.matichon.co.th/local/quality-life/news_5029384 (not read in full) | [unverified] |
| 13 Mar 2026 | PDF metadata date of the 2569 BMA ordinance draft (see 1d) | TCPDF metadata in the PDF itself, read via WebFetch | [primary metadata] |
| 10 Aug 2026 | Draft public comment window opens (see above) | LAD, Thansettakij | [secondary] |
| 16 Jan 2024 | thelegal.co.th: BMA is proposer; hearing "open until February 29, 2024"; "BMA anticipates... enforced by 2025" (since missed) | https://thelegal.co.th/2024/01/16/proposed-4th-revision-of-the-bangkok-unitary-town-plan-and-its-implications/ | [secondary] |
| 8 Dec 2023 | Governor announces the draft (per Wikipedia citing Bangkok Post, 12 Feb 2024; not verified) | https://en.wikipedia.org/wiki/Bangkok_Comprehensive_Plan | [unverified] |

Wikipedia (https://en.wikipedia.org/wiki/Bangkok_Comprehensive_Plan) states the draft's "final 90-day public notice period starts in June 2026". Its citation for that claim is a Soiciety article whose title is about Thonburi canal boats, so the citation does not support the claim. The Thansettakij and Nation dates (August 2026) are preferred. [conflict, see section 8]

### 1d. The BMA 2569 ordinance (ข้อบัญญัติ) that "amends" the 2556 plan

- ASA index lists: "ข้อบัญญัติกรุงเทพมหานคร เรื่อง ให้ใช้บังคับผังเมืองรวมกรุงเทพมหานคร พ.ศ. 2569" (2569 = 2026), and describes it as "แก้ไขผังเมืองรวมกรุงเทพมหานคร 2556" ("amending the Bangkok Comprehensive Plan 2556"). PDF: https://download.asa.or.th/03media/04law/cpa/bb69-bma.pdf (6 pages; TCPDF metadata date 13 Mar 2026). [primary index; text not readable]
- Whether this ordinance has been enacted, gazetted or has an effective date: **not found**. Search results describe it as the draft 4th revision that would replace the 2556 regulation. [unverified]
- **Open legal question:** the 4th revision seems to be moving from a ministerial regulation to a BMA ordinance under the Town Planning Act B.E. 2562 (2019). The change of instrument is inferred from the sources and is not confirmed in any primary text. [unverified]

### 1e. Bottom line for the tool

- Build against the **2556 ministerial regulation**. Flag the 4th revision as a draft with a pending decision. Do not use draft numbers for a live output.

---

## 2. Zone codes, colours, names, FAR and OSR (2556 plan)

### 2a. Full zone list

Colour and Thai names: wazzadu (21 Aug 2025, https://www.wazzadu.com/article/7308) and Anderson (https://www.andersonlandspecialist.com/guide/bangkok-zoning-colors). FAR and OSR for specific codes: thaipropertymentor (https://thaipropertymentor.com/archives/36461), cross-checked against Thansettakij (https://www.thansettakij.com/real-estate/667968). OSR is a minimum; FAR is a maximum.

| Code | Colour | Thai name (wazzadu/Anderson) | Max FAR (2556) | Min OSR (2556) | Tag |
|---|---|---|---|---|---|
| ย.1 | Yellow | ที่อยู่อาศัยหนาแน่นน้อย (low-density residential) | 1 | 40% | [secondary] |
| ย.2 | Yellow | low-density residential | 1.5 | 20% | [secondary] |
| ย.3 | Yellow | low-density residential | 2.5 | 12.5% | [secondary] |
| ย.4 | Yellow | low-density residential, mostly suburban | 3 | 10% | [secondary; FAR 3 / OSR 10% confirmed for Lat Phrao and Srinakarin by Thansettakij] |
| ย.5 | Orange | ที่อยู่อาศัยหนาแน่นปานกลาง (medium-density residential) | 4 | 7.5% | [secondary] |
| ย.6 | Orange | medium-density residential | 4.5 | 6.5% | [secondary; Min Buri confirmed by Thansettakij] |
| ย.7 | Orange | medium-density residential | 5 | 6% | [secondary] |
| ย.8 | Brown | ที่อยู่อาศัยหนาแน่นมาก เมืองชั้นใน (very-high-density residential, inner city) | 6 | 5% | [secondary] |
| ย.9 | Brown | very-high-density residential | 7 | 4.5% | [secondary] |
| ย.10 | Brown | very-high-density residential | 8 | 4% | [secondary] |
| พ.1 | Red | พาณิชยกรรม (commercial) | 5 | 6% | [secondary; Don Mueang red zone FAR 5 per Thansettakij] |
| พ.2 | Red | commercial | 6 | 5% | [secondary] |
| พ.3 | Red | commercial | 7 | 4.5% | [secondary] |
| พ.4 | Red | commercial | 8 | 4% | [secondary] |
| พ.5 | Red | commercial | **not found** | **not found** | Anderson gives a range of 5 to 10 for all of พ.1 to พ.5, with chart max 10. MGR Online gives an example of a red zone with FAR 10 and OSR 3%, without a code. Neither identifies พ.5. [unverified] |
| อ.1 | Purple | อุตสาหกรรม (industry) | 1.5–2 (range) | not found | [secondary, Anderson range] |
| อ.2 | Purple | industry | 1.5–2 (range) | not found | [secondary, Anderson range] |
| อ.3 | Light purple (mapraang) | คลังสินค้า (warehouse) | 1 | not found | [secondary, Anderson] |
| ก.1 | White with green diagonal lines | อนุรักษ์ชนบทและเกษตรกรรม (rural and agricultural conservation) | 0.5 | 100% | [secondary; Nong Chok 0.5 / 100% per Thansettakij] |
| ก.2 | White with green diagonal lines | rural and agricultural conservation | 1 | 40% | [secondary] |
| ก.3 | White with green diagonal lines | rural and agricultural conservation | 0.5 | 100% | [secondary; Anderson range 0.5–1] |
| ก.4 | Green | ชนบทและเกษตรกรรม (rural and agricultural) | 1 | 40% | [secondary] |
| ก.5 | Green | rural and agricultural | 1 | 40% | [secondary] |
| ศ.1 | Light brown | อนุรักษ์เอกลักษณ์ศิลปวัฒนธรรมไทย (conservation of Thai cultural identity) | 3 | 10% | [secondary; Rattanakosin confirmed FAR 3/4 by Thansettakij] |
| ศ.2 | Light brown | conservation of Thai cultural identity | 4 | 7.5% | [secondary] |
| ส. | Blue | สถาบันราชการและสาธารณูปการ (government institutions and public utilities) | not found | not found | [secondary] |

Notes:
- thaipropertymentor lists "พ.5" with no values, and gives the same 0.5 / 100% pair for both ก.1 and ก.3 (two separate rows). Its codes are cross-checked above. [secondary]
- Thansettakij's ก.1 and ก.2 sub-codes (for example "ก.1-1", "ก.1-5") are not standard codes and are not used here. [secondary]

Exact Thai colour definitions quoted from wazzadu (secondary), with translations:
- "ผังเมืองสีเหลือง (รหัส ย.1-ย.4) = ที่ดินประเภทที่อยู่อาศัยหนาแน่นน้อย" = Yellow (codes ย.1 to ย.4) = land for low-density housing.
- "ผังเมืองสีน้ำตาล (รหัส ย.8-ย.10) = ที่ดินประเภทที่อยู่อาศัยหนาแน่นสูง" = Brown (codes ย.8 to ย.10) = land for high-density housing.
- "ผังเมืองสีแดง (รหัส พ.1-พ.5) = ที่ดินประเภทพาณิชยกรรม" = Red (codes พ.1 to พ.5) = commercial land.
- "ผังเมืองสีน้ำเงิน (รหัส ส.) = ที่ดินประเภทสถาบันราชการ การสาธารณูปโภคและสาธารณูปการ" = Blue (code ส.) = land for government institutions, utilities and public services.

### 2b. FAR and OSR definitions

- **FAR:** อัตราส่วนพื้นที่อาคารรวมต่อพื้นที่ดิน = total building floor area divided by plot area. [secondary: wazzadu; thelegal.co.th, which gives the same definition in English]
- **OSR:** "พื้นที่ว่างต่อพื้นที่อาคารรวม" (per wazzadu) = open space divided by total building floor area, expressed as a percentage. This matches the wording in the request. [secondary]
  - **Ambiguity:** "OSR is a percentage of what" is only confirmed by secondary sources. Their wording is consistent, but the gazette definition clause is not readable, so this stays [unverified] until checked.
- **What counts as floor area for FAR (parking, basements, balconies, roof structures):** not found. [unverified: not in any source read]
- **What counts as open space for OSR:** not found. [unverified: not in any source read]

---

## 3. Use conditions for ย.8, ย.9, ย.10, พ.3, พ.4, พ.5 (2556 plan)

Summary: **none of the sources read gives verified use conditions under the 2556 plan for these codes** (road width, floor-area thresholds, large or extra-large buildings, transit distance). The only conditions found are for the draft 4th revision, or are unverified blog claims. Treat this section as a list of leads, not as rules.

Zone purposes (secondary, wazzadu, Anderson):
- ย.8 to ย.10 (brown): high-density residential, inner city. [secondary]
- พ.1 to พ.5 (red): commercial. [secondary]
- Thai purpose clause for ย.10, as paraphrased in a search summary (not a verified quote): intended for housing in inner-city areas adjoining central commercial districts and mass-transit service areas. [secondary, paraphrase]

(a) **Condominium / residential building (อาคารชุด / อาคารอยู่อาศัยรวม):** no verified 2556 condition found.
(b) **Office (สำนักงาน):** no verified 2556 condition found.
(c) **Hotel (โรงแรม):** no verified 2556 condition found for these codes. The only hotel rule found is a DRAFT Zone 11 condition (see below). [draft, secondary]

**Draft conditions (NOT in force; for context only):**
- Thansettakij, 2 Sep 2026: hotels with "โรงแรมที่มีจำนวนห้องพักเกิน 80 ห้อง" (more than 80 rooms) may be built on roads at least 16 m wide, within 650 m of a transit station, within 800 m of a joint station, or on roads at least 12 m wide within 250 m of a public pier. [draft, secondary, Zone 11 only]
- Thansettakij, same article: mixed residential and commercial floor area of 5,000 to 10,000 m² needs a road of at least 16 m, or a site within 650 m of a transit station, 800 m of a joint station, or 250 m of a pier (road at least 12 m). Above 10,000 m², the article requires a road of at least 30 m, or a site within 500 m of a transit station, 800 m of a joint station, or 250 m of a pier (road at least 16 m). [draft, secondary, Zone 11 only]
- LAD, Aug 2026: soi (lane) width under 10 to 12 m restricts extra-large buildings in Sukhumvit and Sathon areas. [draft, secondary, no code given]
- Nation, 25 Sep 2026: minimum parking requirements drop 25% within 500 m of 20 major stations. [draft, secondary]

**Items not found at all (for 2556):** the 12 m road width rule, the 10,000 m² "large building" threshold, and transit-distance rules tied to these codes. Whether any of these numbers exist in the 2556 text could not be verified. The decoded gazette shows the word "เขตทาง" (road right-of-way) 334 times, but in clauses on fuel stations, factories and similar uses, and the decode is too garbled to attribute any figure. [unverified]

---

## 4. FAR bonus and incentive provisions

### 4a. 2556 plan
- A secondary blog (tooktee102.blogspot.com, July 2020, https://tooktee102.blogspot.com/2020/07/far-bonus-8.html) describes "FAR Bonus เงื่อนไข 8 ข้อ" (8 conditions) under the "กฎหมายผังเมืองใหม่" (new planning law). Not read in full. [unverified]
- Another blog (safetyenvi.blogspot.com, April 2020, http://safetyenvi.blogspot.com/2020/04/2556.html) says a detention pond of about 1 to 4 m³ per 50 m² of plot can earn a bonus of 5% to 20%, citing "ข้อ 55 ของกฎกระทรวง" (clause 55 of the regulation). The clause number is not checked against the gazette. [unverified]
- An article quoted in a search summary says extra floor area from a bonus may not exceed five times the public open space provided. Source not confirmed. [unverified]
- Maximum bonus under the 2556 plan: **not verified**. The 20% figure below is for the draft.

### 4b. Draft 4th revision (NOT in force)
- Up to 20% extra FAR, under 10 measures: thelist.group (2566) and LAD say "up to 20%"; thelegal.co.th (Jan 2024) says the bonus rate "is expected to increase by up to 20%". [draft, secondary]
- Nation (25 Sep 2026): "Developers could gain 20–25% more floor space under 10 conditions tied to public benefits." This conflicts with the 20% cap above. [draft, secondary, conflict]
- LAD lists four conditions (secondary): (1) public open space, (2) a skywalk to transit, (3) a retention basin, (4) green-building certification (LEED, or TREES Gold or higher). LAD says "can earn an increased building-to-land area ratio of up to 20%". LAD uses "building-to-land area ratio" for FAR. Its "10 measures" count differs from the "four conditions" it lists. [draft, secondary]
- Parking reduction near transit: LAD says "800 m" radius in one place and "500–800 m" in another. Nation says 500 m for a 25% reduction at 20 stations. [draft, secondary, conflict]

Thai quote: ร่างผังเมืองใหม่ ... "เพิ่มมาตรการ FAR Bonus เป็น 10 มาตรการ โดยให้โบนัสสูงสุดไม่เกินร้อยละ 20" = "the new draft plan adds 10 FAR-bonus measures, with a maximum bonus of not more than 20%." (paraphrased in a search summary, not a verbatim quote). [draft, secondary, paraphrase]

---

## 5. Height controls

- **Height limits set by the comprehensive plan itself:** not found. [unverified]
- Thansettakij lists "Height limits near Don Mueang airport" as a feature of the draft's Don Mueang–Lak Si zone (zone 3). It does not give numbers or a legal basis. [draft, secondary, no legal basis]
- DDproperty (not read; blocked, 403) and wazzadu say yellow, orange and brown zones have progressively higher FAR and height limits, with orange more lenient than yellow and brown higher than orange. No numbers. [secondary, unverified]
- **Rattanakosin:** the draft keeps Rattanakosin's FAR at 3 and 4 (ศ.1 and ศ.2), but the Thansettakij article says it is "still limited by other rules, such as the natural resources map and the building control act". The article does not give height numbers. [draft, secondary]
- **Legal basis for airport or heritage height limits:** not found. Do not assume the Building Control Act or aviation rules without a source. [unverified]

---

## 6. Example locations and typical zone

Confirmed locations (secondary, from Thansettakij, 2 Sep 2026, and the Thai and English articles above):

| Area | Current (2556) zone | Draft zone | Tag |
|---|---|---|---|
| Chao Phraya riverside, Charoen Nakhon | Brown, high-density residential ย.8 (FAR 6) | Red commercial พ.6 (riverside side only) | [secondary] |
| Lat Phrao | Yellow ย.4 (FAR 3, OSR 10%) | Orange, medium density; some red commercial | [secondary] |
| Srinakarin, Srinakarin–Rom Klao road | Yellow ย.4 (FAR 3, OSR 10%) | Orange ย.7 (FAR 4) | [secondary] |
| Min Buri | Orange ย.6 (FAR 4.5, OSR 6.5%) | Red commercial พ.5 (FAR 7) | [secondary] |
| Rama Intra | Yellow ย.4-10, ย.4-11, ย.4-12 (sub-codes as printed) | Orange ย.6-7 | [secondary] |
| Ratchayothin (Chatuchak) | Orange ย.5, ย.7 (FAR 4 and 5) | Brown ย.11, ย.13 | [secondary] |
| Don Mueang, Lak Si | Yellow ย.3, ย.5; red พ.1 (FAR 5) | Orange ย.7; red พ.3 | [secondary] |
| Rattanakosin island | Light brown ศ.1, ศ.2 (conservation) | Dense residential ย.11; commercial พ.1, พ.2 | [secondary] |

Zone codes with no confirmed street-level location in the current plan:
- **ย.10:** no street found. [unverified]
- **พ.4:** no current location found. Draft พ.4 appears in the Taling Chan and Thawi Watthana area and in Boromrat Chonnani, Ratchaphruek and Phutthamonthon 1 (Thansettakij). [draft, secondary]
- **พ.5:** no current location found. Draft พ.5 appears in Min Buri (Thansettakij), and LAD says North Park and Thung Song Hong remain red P.5 in the draft. [draft, secondary]
- **Sukhumvit, Ekkamai, Phra Khanong (Watthana):** LAD says some brown zones here are proposed to become red in the draft, and that "many areas in the Watthana District were designated as Brown Zones". Whether this describes the current plan or the draft is unclear. [secondary, unclear]
- **Ratchadaphisek / Rama 9 corridor:** a search summary says the draft turns Ratchadaphisek in Chatuchak from orange to brown or red. Not checked. [unverified]

**Which zone would a condo developer most typically face?** Not stated in any source. Inference only: the brown ย.8 to ย.10 zones are described as high-density residential in the inner city, which is the zone type condo projects use. But I found no source that says condos are concentrated in these zones. [inference, unverified]

**Demo recommendation:** the Charoen Nakhon riverside is the only location in this research with a confirmed current brown zone (ย.8). Before using any location, check the parcel's code on the BMA zoning map (cpd.bangkok.go.th / "Check ผังเมือง กทม." app). Not verified in this session.

---

## 7. Open questions and conflicts

1. **Timeline conflict, 4th revision public notice:** Wikipedia says June 2026. Nation (25 Sep 2026) and Thansettakij (2 Sep 2026) say the 90-day period started 10 August 2026; LAD says the window ran 10 Aug to 9 Nov 2026. Preferred: August. The Wikipedia citation (a canal-boat article) does not support its claim.
2. **Effective-date conflict:** "mid-2027" (Nation, Wikipedia) vs "late 2570 BE / 2027" (Anderson). Both point to 2027. Enactment has not happened as of 19 Nov 2026 according to all sources read.
3. **Instrument conflict:** the draft is described as a BMA ordinance (MGR Online, ASA index) but also as a revision of the ministerial regulation. Which instrument will be used is not confirmed.
4. **2569 ordinance status:** the ASA index lists the ordinance and its PDF metadata date (13 Mar 2026). Whether it has been enacted or gazetted is not found. [unverified]
5. **พ.5 values under 2556:** not found. Anderson says the red range is 5 to 10. MGR's example red zone is FAR 10 and OSR 3%, but it does not name a code. Whether that is พ.5 is unknown.
6. **พ.4 values:** thaipropertymentor gives FAR 8 and OSR 4%. Anderson's range would allow it, but it is not confirmed by a primary source.
7. **ย.8 FAR:** thaipropertymentor and the search summary agree at 6, but the draft figures for ย.8 differ across sources (4.5 in one, "6 to 8" range in another). Only the 2556 figures are used here.
8. **Bonus cap:** 20% (LAD, thelist, thelegal) vs 20–25% (Nation). Draft only.
9. **Bonus measure count:** 10 measures (Nation, thelist) vs 4 listed conditions (LAD). Draft only.
10. **OSR base:** "% of total building floor area" is supported only by secondary sources. Not checked against the gazette.
11. **FAR floor-area inclusions and exclusions (parking, basements, balconies):** not found.
12. **Road-width, 10,000 m² and transit-distance rules for the 2556 plan:** not found. Only draft Zone 11 conditions (see section 3) were found, and they are not in force.
13. **Height limits:** not found, apart from a secondary mention of Don Mueang airport.
14. **Gazette table not readable:** the FAR/OSR table in the 2556 gazette (and the ISA summary table) could not be read. Everything in section 2 is secondary. This is the main gap. Next step: read the gazette zone table in the PDF, using a PDF text extractor such as `pdftotext -layout` on mr56-bma.pdf or the ISA table, or check the BMA zone map.
15. **Not checked directly:** cpd.bangkok.go.th, dpt.go.th, krisdika.go.th, ocs.go.th, ratchakitcha.soc.go.th. These are the primary sites the brief asked for. They should be checked next.
16. **Bangkok Post article (3255824):** redirected to tollbit.bangkokpost.com and not read. The Bangkok Post publication date is unknown.
17. **Siamrath lawsuit and BMC/Matichon committee:** dates not confirmed. The lawsuit is paraphrased from a search summary.
18. **Stale 2024 dates:** thelegal.co.th's "enforced by 2025" target was missed. Plan dates in older articles should be treated as out of date.
