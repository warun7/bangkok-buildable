# R2: Bangkok building control rules for the buildable envelope

Date of research: 2026-11-19. Scope: Thai national and Bangkok building-control rules that limit a building's position and volume on a plot, plus parking, EIA and "large building" thresholds.

## 0. Method and confidence tags

- **[primary]**: text read from the regulation PDF. Regulation 55 and Regulation 61 were downloaded and read from the text layer (pypdf). Both copies carry the Council of State (สำนักงานคณะกรรมการกฤษฎีกา) header. The PDFs are hosted on data.yotathai.org, not on Krisdika itself. Krisdika (app-thca.krisdika.go.th) returned a TLS "unable to verify the first certificate" error, so the Krisdika copy was not compared.
- **[secondary]**: law firm, news, university thesis, journal, or forum text. Used only to corroborate, or to flag a lead.
- **[unverified]**: appears in a secondary source or is a partial extraction, and could not be checked against the primary text.
- Thai was transcribed from the PDF text layer with the encoding artefacts repaired (for example "ข>อ" became "ข้อ"). Small diacritic errors are possible. Verify against the Royal Gazette before quoting in a product.
- Local copies: `/private/tmp/claude-501/-Users-varunsg-code-general-machines/205d8ee5-9cf6-4645-9b8a-761236306ee6/scratchpad/r2/r55.txt` (Regulation 55, 13 pages) and `.../scratchpad/r2/r61.txt` (Regulation 61, 3 pages).
- Not fetched in full: Bangkok ordinance B.E. 2544, Ministerial Regulation 33 text, Ministerial Regulation 7 and 41 text, and the enacted ONEP EIA notice. Every gap is recorded as "not found".

## 1. Ministerial Regulation No. 55 (B.E. 2543) under the Building Control Act B.E. 2522

**Identity** [primary]
- Title: กฎกระทรวง ฉบับที่ ๕๕ (พ.ศ. ๒๕๔๓) ออกตามความในพระราชบัญญัติควบคุมอาคาร พ.ศ. ๒๕๒๒
- Enacting authority: Sections 5(3), 8(1), (7), (8) of the Act (preamble).
- Signed: "ให้ไว้ ณ วันที่ ๒๘ กรกฎาคม พ.ศ. ๒๕๔๓", by the Deputy Minister acting for the Minister of Interior.
- Royal Gazette citation [secondary]: Vol. 117, Part 75 Ka, pp. 16–30, 7 August 2000 (from a Thai academic citation found in search; not checked against the Gazette).
- Index page: https://www.yotathai.com/yotanews/rule55-buildinglaw (links Regulation 61 as an amendment; no other amendment seen on the page, see §1f and §7).
- Full text used: https://data.yotathai.org/d/zx9hfz.pdf (13 pages, OCS header).

### 1a. Setback from public roads (ข้อ 41) [primary]

Thai, verbatim (paraphrase of structure below):
> ข้อ ๔๑ อาคารที่ก่อสร้างหรือดัดแปลงใกล้ถนนสาธารณะที่มีความกว้างน้อยกว่า ๖ เมตร ให้ร่นแนวอาคารห่างจากกึ่งกลางถนนสาธารณะอย่างน้อย ๓ เมตร อาคารที่สูงเกินสองชั้นหรือเกิน ๘ เมตร ห้องแถว ตึกแถว บ้านแถว อาคารพาณิชย์ โรงงาน อาคารสาธารณะ ป้ายหรือสิ่งที่สร้างขึ้นสำหรับติดหรือตั้งป้ายหรือคลังสินค้า ที่ก่อสร้างหรือดัดแปลงใกล้ถนนสาธารณะ
> (๑) ถ้าถนนสาธารณะนั้นมีความกว้างน้อยกว่า ๑๐ เมตร ให้ร่นแนวอาคารห่างจากกึ่งกลางถนนสาธารณะอย่างน้อย ๖ เมตร
> (๒) ถ้าถนนสาธารณะนั้นมีความกว้างตั้งแต่ ๑๐ เมตรขึ้นไป แต่ไม่เกิน ๒๐ เมตร ให้ร่นแนวอาคารห่างจากเขตถนนสาธารณะอย่างน้อย ๑ ใน ๑๐ ของความกว้างของถนนสาธารณะ
> (๓) ถ้าถนนสาธารณะนั้นมีความกว้างเกิน ๒๐ เมตรขึ้นไป ให้ร่นแนวอาคารห่างจากเขตถนนสาธารณะอย่างน้อย ๒ เมตร

English (translation of the above):
> Clause 41. A building built or modified near a public road less than 6 m wide must be set back at least 3 m from the centreline of the public road. Buildings higher than two storeys or over 8 m, row houses, townhouses, commercial buildings, factories, public buildings, signs or structures for signs, and warehouses, when built or modified near a public road:
> (1) road width under 10 m: setback at least 6 m from the road centreline;
> (2) road width 10 m to 20 m: setback at least one-tenth of the road width from the road boundary (เขตถนนสาธารณะ);
> (3) road width over 20 m: setback at least 2 m from the road boundary.

Answers to the question:
- **Measured from:** centreline (กึ่งกลางถนน) for roads under 10 m and for the under-6 m rule; road boundary (เขตถนนสาธารณะ) for roads 10 m and wider.
- **Road width bands (user's <10 / 10–20 / >20):**
  - Under 10 m: 6 m from centreline (for the listed building types).
  - 10–20 m: 1/10 of road width from the road boundary (1 m at 10 m, 2 m at 20 m).
  - Over 20 m: 2 m from the road boundary.
- **Which buildings:** The first sentence covers any building near a road under 6 m wide (3 m from centreline). The (1)–(3) tiers apply to the listed types and to buildings over two storeys or 8 m high. Ambiguity: the clause text can also be read as applying (1)–(3) to every building. See §8.
- **How road width is measured:** not found in Regulation 55. "ถนนสาธารณะ" is defined in §1 as a road open or allowed for public passage. No width-measurement rule was found.
- **Confidence:** [primary] for the text. The interpretation of the tiers is marked [primary, interpretation].

### 1b. Height versus road width (ข้อ 44–46) [primary]

Thai, verbatim:
> ข้อ ๔๔ ความสูงของอาคารไม่ว่าจากจุดหนึ่งจุดใด ต้องไม่เกินสองเท่าของระยะราบ วัดจากจุดนั้นไปตั้งฉากกับแนวเขตด้านตรงข้ามของถนนสาธารณะที่อยู่ใกล้อาคารนั้นที่สุด
> ความสูงของอาคารให้วัดแนวดิ่งจากระดับถนนหรือระดับพื้นดินที่ก่อสร้างขึ้นไปถึงส่วนของอาคารที่สูงที่สุด สำหรับอาคารทรงจั่วหรือปั้นหยาให้วัดถึงยอดผนังของชั้นสูงสุด
>
> ข้อ ๔๕ อาคารหลังเดียวกันซึ่งมีถนนสาธารณะสองสายขนาดไม่เท่ากันขนาบอยู่ เมื่อระยะระหว่างถนนสาธารณะสองสายนั้นไม่เกิน ๖๐ เมตร และส่วนกว้างของอาคารตามแนวถนนสาธารณะที่กว้างกว่าไม่เกิน ๖๐ เมตร ความสูงของอาคาร ณ จุดใดต้องไม่เกินสองเท่าของระยะราบที่ใกล้ที่สุดจากจุดนั้นไปตั้งฉากกับแนวเขตถนนสาธารณะด้านตรงข้ามของสายที่กว้างกว่า
>
> ข้อ ๔๖ อาคารหลังเดียวกันซึ่งอยู่ที่มุมถนนสาธารณะสองสายขนาดไม่เท่ากัน ความสูงของอาคาร ณ จุดใดต้องไม่เกินสองเท่าของระยะราบที่ใกล้ที่สุด จากจุดนั้นไปตั้งฉากกับแนวเขตถนนสาธารณะด้านตรงข้ามของสายที่กว้างกว่า และความยาวของอาคารตามแนวถนนสาธารณะที่แคบกว่าต้องไม่เกิน ๖๐ เมตร สำหรับอาคารซึ่งเป็นห้องแถวหรือตึกแถว ความยาวของอาคารตามแนวถนนสาธารณะที่แคบกว่าต้องไม่เกิน ๑๕ เมตร

English:
> Clause 44. At no point may the height of a building exceed twice the horizontal distance, measured perpendicular from that point to the opposite road boundary (แนวเขต) of the public road nearest to the building. Height is measured vertically from the road or ground level at construction to the highest part of the building; for gable or pitched-roof buildings, to the top of the wall of the highest storey.
> Clause 45. For a building between two public roads of unequal width, where the roads are no more than 60 m apart and the building's frontage along the wider road is no more than 60 m, height at any point must not exceed twice the nearest horizontal distance to the opposite boundary of the wider road.
> Clause 46. For a corner building on two public roads of unequal width, the same 2× rule applies using the wider road. The building's length along the narrower road must not exceed 60 m (15 m for row houses / townhouses).

- **Confirmed:** the 2× rule (ข้อ 44). The distance is measured perpendicular to the opposite road boundary of the nearest public road. "Opposite edge" in the user's wording corresponds to "แนวเขตด้านตรงข้าม" (opposite road boundary).
- **Several roads:** the nearest road governs (ข้อ 44). Two roads of unequal width use the wider one (ข้อ 45–46). Equal-width roads are not covered by these clauses.
- **Height measure** (also in §1 definitions, "การวัดความสูงของอาคาร"): ground level at construction to roof deck; gable or pitched roof to top of wall of highest storey. [primary]

### 1c. Open space / ที่ว่าง (ข้อ 33–39; definition in ข้อ 1) [primary]

Definition (ข้อ 1):
> "ที่ว่าง" หมายความว่า พื้นที่อันปราศจากหลังคาหรือสิ่งก่อสร้างปกคลุม ซึ่งพื้นที่ดังกล่าวอาจจะจัดให้เป็นบ่อน้ำ สระว่ายน้ำ บ่อพักน้ำเสีย ที่พักมูลฝอย ที่พักรวมมูลฝอย หรือที่จอดรถ ที่อยู่ภายนอกอาคารก็ได้ และให้หมายความรวมถึงพื้นที่ของสิ่งก่อสร้าง หรืออาคารที่สูงจากระดับพื้นดินไม่เกิน ๑.๒๐ เมตร และไม่มีหลังคาหรือสิ่งก่อสร้างปกคลุมเหนือระดับนั้น

Clause 33 (the percentage rule), verbatim:
> ข้อ ๓๓ อาคารแต่ละหลังหรือหน่วยต้องมีที่ว่างตามที่กำหนด ดังต่อไปนี้
> (๑) อาคารอยู่อาศัย และอาคารอยู่อาศัยรวม ต้องมีที่ว่างไม่น้อยกว่า ๓๐ ใน ๑๐๐ ส่วนของพื้นที่ชั้นใดชั้นหนึ่งที่มากที่สุดของอาคาร
> (๒) ห้องแถว ตึกแถว อาคารพาณิชย์ โรงงาน อาคารสาธารณะ และอาคารอื่นซึ่งไม่ได้ใช้เป็นที่อยู่อาศัย ต้องมีที่ว่างไม่น้อยกว่า ๑๐ ใน ๑๐๐ ส่วนของพื้นที่ชั้นใดชั้นหนึ่งที่มากที่สุดของอาคาร แต่ถ้าอาคารดังกล่าวใช้เป็นที่อยู่อาศัยด้วยต้องมีที่ว่างตาม (๑)

English:
> Clause 33. Each building or unit must have open space as follows:
> (1) Residential buildings and collective residential buildings (อาคารอยู่อาศัยรวม): at least 30 out of 100 parts of the largest single-floor area of the building.
> (2) Row houses, townhouses, commercial buildings, factories, public buildings, and other non-residential buildings: at least 10 out of 100 parts of the largest single-floor area. If such a building is also used for residential purposes, it must meet (1), i.e. 30%.

Answers:
- **Percentage of what:** the largest single-floor area of the building (พื้นที่ชั้นใดชั้นหนึ่งที่มากที่สุด), not the plot area and not total GFA. [primary]
- **Residential:** 30%. **Commercial / non-residential:** 10%. **Mixed residential + commercial:** the (2) clause says that if a non-residential building is also used for housing, the 30% of (1) applies. [primary]
- **Condominium (อาคารอยู่อาศัยรวม):** 30% (clause 33(1)). [primary]
- **Open space must be unobstructed.** Clause 34 says the open space required for row houses and townhouses may not be built over with buildings, fences, walls, ponds or waste areas ("ที่ว่างตามวรรคหนึ่ง วรรคสอง และวรรคสาม จะก่อสร้างอาคาร รั้ว กำแพง ... ไม่ได้"). [primary]
- **Row house and townhouse specifics** (clauses 34–36, 49): front open space at least 6 m for townhouses not on a public road (ข้อ 34); rear 3 m (ข้อ 34); row-house front 3 m, rear 2 m (ข้อ 36). Side spacing for 10+ units or 40+ m total is 4 m; otherwise 2 m (ข้อ 34, 49). [primary]
- Clauses 37–39 (twin houses and warehouses/factories) set further boundary widths. Not transcribed in full. [primary, partial]

### 1d. Distance from plot boundaries for walls with openings (ข้อ 50) [primary]

Thai, verbatim:
> ข้อ ๕๐ ผนังของอาคารที่มีหน้าต่าง ประตู ช่องระบายอากาศหรือช่องแสงหรือระเบียงของอาคารต้องมีระยะห่างจากแนวเขตที่ดินดังนี้
> (๑) อาคารที่มีความสูงไม่เกิน ๙ เมตร ผนังหรือระเบียงต้องอยู่ห่างเขตที่ดินไม่น้อยกว่า ๒ เมตร
> (๒) อาคารที่มีความสูงเกิน ๙ เมตร แต่ไม่ถึง ๒๓ เมตร ผนังหรือระเบียงต้องอยู่ห่างเขตที่ดินไม่น้อยกว่า ๓ เมตร
> ผนังของอาคารที่อยู่ห่างเขตที่ดินน้อยกว่าตามที่กำหนดไว้ใน (๑) หรือ (๒) ต้องอยู่ห่างจากเขตที่ดินไม่น้อยกว่า ๕๐ เซนติเมตร เว้นแต่จะก่อสร้างชิดเขตที่ดินและอาคารดังกล่าวจะก่อสร้างได้สูงไม่เกิน ๑๕ เมตร ผนังของอาคารที่อยู่ชิดเขตที่ดินหรือห่างจากเขตที่ดินน้อยกว่าที่ระบุไว้ใน (๑) หรือ (๒) ต้องก่อสร้างเป็นผนังทึบ และดาดฟ้าของอาคารด้านนั้นให้ทำผนังทึบสูงจากดาดฟ้าไม่น้อยกว่า ๑.๘๐ เมตร ในกรณีก่อสร้างชิดเขตที่ดินต้องได้รับความยินยอมเป็นหนังสือจากเจ้าของที่ดินข้างเคียงด้านนั้นด้วย

English:
> Clause 50. Walls with windows, doors, ventilation openings, light wells, or balconies must be set back from the plot boundary as follows:
> (1) Building up to 9 m high: at least 2 m.
> (2) Building over 9 m and under 23 m high: at least 3 m.
> A wall closer than (1) or (2) must be at least 0.50 m from the boundary, unless the building is built on the boundary and is no more than 15 m high. A wall built on or closer than (1)/(2) must be solid, and the roof on that side must have a solid parapet at least 1.80 m above the roof. Building on the boundary requires the written consent of the adjacent owner.

- **Your 2 m / 3 m split is correct in substance, but the bands are:** ≤9 m → 2 m; >9 m and <23 m → 3 m. Clause 50 does not state a value for 23 m and above (see §2 and §8).
- **Walls without openings:** the main rule of clause 50 covers walls with openings. The 0.50 m / boundary-with-consent provisions apply to "ผนังของอาคารที่อยู่ห่างเขตที่ดินน้อยกว่า" the (1)/(2) distances, which can be read as covering solid walls too. The solid-wall rule is therefore ambiguous. See §8.
- **Distance to neighbouring buildings** on the same plot: see §1f (Regulation 61).

### 1e. Floor-to-ceiling / clear heights (ข้อ 22) [primary]

Thai, verbatim:
> ข้อ ๒๒ ห้องหรือส่วนของอาคารที่ใช้ในการทำกิจกรรมต่าง ๆ ต้องมีระยะดิ่งไม่น้อยกว่าตามที่กำหนดไว้ ดังต่อไปนี้
> ๑. ห้องที่ใช้เป็นที่พักอาศัย บ้านแถว ห้องพักโรงแรม ห้องเรียนนักเรียนอนุบาล ครัวสำหรับอาคารอยู่อาศัย ห้องพักคนไข้พิเศษ ช่องทางเดินในอาคาร — 2.60 ม.
> ๒. ห้องที่ใช้เป็นสำนักงาน ห้องเรียน ห้องอาหาร ห้องโถงภัตตาคาร โรงงาน — 3.00 ม.
> ๓. ห้องขายสินค้า ห้องประชุม ห้องคนไข้รวม คลังสินค้า โรงครัว ตลาด และอื่น ๆ ที่คล้ายกัน — 3.50 ม.
> ๔. ห้องแถว ตึกแถว: ๔.๑ ชั้นล่าง — 3.50 ม.; ๔.๒ ตั้งแต่ชั้นสองขึ้นไป — 3.00 ม.
> ๕. ระเบียง — 2.20 ม.
> ระยะดิ่งตามวรรคหนึ่งให้วัดจากพื้นถึงพื้น ในกรณีของชั้นใต้หลังคาให้วัดจากพื้นถึงยอดฝาหรือยอดผนังอาคาร ...
> ห้องในอาคารซึ่งมีระยะดิ่งระหว่างพื้นถึงพื้นอีกชั้นหนึ่งตั้งแต่ ๕ เมตรขึ้นไป จะทำพื้นชั้นลอยในห้องนั้นก็ได้ โดยพื้นชั้นลอยดังกล่าวนั้นต้องมีเนื้อที่ไม่เกินร้อยละสี่สิบของเนื้อที่ห้อง ... ระยะดิ่งระหว่างพื้นชั้นลอยถึงพื้นอีกชั้นหนึ่งต้องไม่น้อยกว่า ๒.๔๐ เมตร ...
> ห้องน้ำ ห้องส้วม ต้องมีระยะดิ่งระหว่างพื้นถึงเพดานไม่น้อยกว่า ๒ เมตร

English:
- Residential rooms, townhouse rooms, hotel rooms, kitchens for residential buildings, and corridors: 2.60 m.
- Offices, classrooms, dining rooms, factories: 3.00 m.
- Shops, meeting rooms, warehouses, markets and similar: 3.50 m.
- Townhouses: ground floor 3.50 m; upper floors 3.00 m.
- Balconies: 2.20 m.
- Mezzanines: allowed in rooms of 5 m or more clear height, up to 40% of room area, with at least 2.40 m clearance above and below. Toilets and bathrooms: at least 2.00 m.
- **Measurement:** floor to floor (พื้นถึงพื้น), or floor to underside of roof or wall top for the top storey under a roof (ข้อ 22 wording). The user's "floor-to-ceiling" is not the stated basis. See §8.
- The numeric-to-category mapping above was inferred from the column order of the extracted table. [primary, mapping inferred; verify]

Related habitable-room rules: [primary]
- Bedrooms (ข้อ 20): minimum width 2.50 m (narrowest side) and area 8 m².
- Condominium unit interior (ข้อ 19): text begins "อาคารอยู่อาศัยรวมต้องมีพื้นที่ภายในแต่ละหน่วยที่ใช้เพื่อการอยู่อาศัยไม่น้อยกว่า" and the extraction shows "...ไม่น้อยกว่า ๒๐ ตารางเมตร". The full sentence is partly garbled in the PDF. [primary, partial; verify 20 m²]

### 1f. Distance between buildings on the same plot (ข้อ 48, as replaced by Regulation 61) [primary]

Original clause 48 (Regulation 55) read: buildings of 9 m or less 4 m apart; 9–23 m buildings 6 m apart; exempt where the open space is used for parking. This was **replaced** by Regulation 61 (B.E. 2550).

Regulation 61 (B.E. 2550):
- Title: กฎกระทรวง ฉบับที่ ๖๑ (พ.ศ. ๒๕๕๐) ออกตามความในพระราชบัญญัติควบคุมอาคาร พ.ศ. ๒๕๒๒
- Replaces clause 48 with (Thai, verbatim, main points):
> ข้อ ๔๘ การก่อสร้างอาคารในที่ดินเจ้าของเดียวกันให้เป็นไปตามหลักเกณฑ์ดังต่อไปนี้
> (๑) ผนังของอาคารด้านที่มีหน้าต่าง ประตู ช่องระบายอากาศหรือช่องแสง หรือระเบียงของอาคาร ต้องมีระยะห่างจากผนังของอาคารอื่นด้านที่มีหน้าต่าง ประตู ช่องระบายอากาศ หรือช่องแสง หรือระเบียงของอาคารดังต่อไปนี้
>   (ก) อาคารที่มีความสูงไม่เกิน ๙ เมตร ... ไม่น้อยกว่า ๔ เมตร (ข) อาคารที่มีความสูงไม่เกิน ๙ เมตร ... อาคารอื่นที่มีความสูงเกิน ๙ เมตรแต่ไม่ถึง ๒๓ เมตร ไม่น้อยกว่า ๕ เมตร (ค) อาคารที่มีความสูงเกิน ๙ เมตรแต่ไม่ถึง ๒๓ เมตร ... อาคารอื่นที่มีความสูงเกิน ๙ เมตรแต่ไม่ถึง ๒๓ เมตร ไม่น้อยกว่า ๖ เมตร
> (๒) ผนังของอาคารด้านที่เป็นผนังทึบ ต้องมีระยะห่างจากผนังของอาคารอื่นด้านที่มีหน้าต่าง ... ดังต่อไปนี้
>   (ก) อาคารที่มีความสูงไม่เกิน ๑๕ เมตร ... อาคารอื่นที่มีความสูงไม่เกิน ๙ เมตร ไม่น้อยกว่า ๒ เมตร (ข) อาคารที่มีความสูงไม่เกิน ๑๕ เมตร ... อาคารอื่นที่มีความสูงเกิน ๙ เมตรแต่ไม่ถึง ๒๓ เมตร ไม่น้อยกว่า ๓ เมตร (ค) อาคารที่มีความสูงเกิน ๑๕ เมตรแต่ไม่ถึง ๒๓ เมตร ... อาคารอื่นที่มีความสูงไม่เกิน ๙ เมตร ไม่น้อยกว่า ๒.๕๐ เมตร (ง) อาคารที่มีความสูงเกิน ๑๕ เมตรแต่ไม่ถึง ๒๓ เมตร ... อาคารอื่นที่มีความสูงเกิน ๙ เมตรแต่ไม่ถึง ๒๓ เมตร ไม่น้อยกว่า ๓.๕๐ เมตร
> (๓) ผนังทึบของอาคารที่มีความสูงเกิน ๑๕ เมตรแต่ไม่ถึง ๒๓ เมตร ... ต่อผนังทึบของอาคารอื่นที่มีความสูงเกิน ๑๕ เมตรแต่ไม่ถึง ๒๓ เมตร ไม่น้อยกว่า ๑ เมตร
> สำหรับอาคารที่มีลักษณะตาม (๒) และ (๓) ผนังของดาดฟ้าด้านที่อยู่ใกล้กับอาคารอื่นให้ทำการก่อสร้างเป็นผนังทึบสูงจากพื้นดาดฟ้าไม่น้อยกว่า ๑.๘๐ เมตร

Summary of the replacement (distances between building walls on one plot):

| Case | Minimum distance |
|---|---|
| Opening wall, bldg ≤9 m, vs other bldg ≤9 m | 4 m |
| Opening wall, bldg ≤9 m, vs other bldg >9 to <23 m | 5 m |
| Opening wall, bldg >9 to <23 m, vs other bldg >9 to <23 m | 6 m |
| Solid wall, bldg ≤15 m, vs opening wall of other bldg ≤9 m | 2 m |
| Solid wall, bldg ≤15 m, vs opening wall of other bldg >9 to <23 m | 3 m |
| Solid wall, bldg >15 to <23 m, vs opening wall of other bldg ≤9 m | 2.5 m |
| Solid wall, bldg >15 to <23 m, vs opening wall of other bldg >9 to <23 m | 3.5 m |
| Solid wall, bldg >15 to <23 m, vs solid wall of other bldg >15 to <23 m | 1 m |

Note on the table: the rows are read from the Thai text; the distances are verbatim. Parentheses (ก)–(ง) map to the rows in the order given. [primary]

- Terraces on solid-wall sides facing a neighbour must have a solid parapet at least 1.80 m above the terrace floor. [primary]
- The original exemption for open space used as parking (Regulation 55 clause 48 second paragraph) is not in the replacement text. See §8. [primary]

### 1g. Other clauses that limit position or volume [primary unless stated]

- **Encroachment:** no building may protrude into public land without permission (ข้อ 40).
- **Street-facing projections** (ข้อ 43, partially read): architectural projections must be at least 3.25 m above the pavement (partial; verify). Decorative trim projecting up to 50 cm is excluded. Drain pipes are required.
- **Fences** (ข้อ 47): up to 3 m above the pavement or road.
- **Water bodies** (ข้อ 42): setback from the edge of a public water body (river, canal, drain): 3 m if the water body is under 10 m wide; 6 m if 10 m or wider; 12 m for lakes, reservoirs or the sea. Exempt: bridges, dams, fences, drain outlets, piers, shipyards, boat slips, signs, and open parking. This is the only canal-setback rule found in primary text. It is a national rule under the Building Control Act. Whether it applies in Bangkok, where the BMA ordinance may prevail, is not resolved (see §3).
- **Building height and roads:** see §1b (ข้อ 44–46).
- **Fire-resistant structure** (ข้อ 15): structural members, floors, stairs and walls of buildings of 3 storeys or more, theatres, factories, hotels, hospitals, department stores, large buildings, and others must be permanent fire-resistant materials. [primary]
- **Fire escape** (ข้อ 27): buildings of 4 storeys or more and up to 23 m high, or 3-storey buildings with a roof terrace over 16 m² above the third floor, need at least one fire-resistant escape stair in addition to the ordinary stair. [primary]
- **Stair and corridor widths** (ข้อ 21, 23–26, 29–32): found in text; not transcribed for this report.

### 1h. Definition of "large building" (อาคารขนาดใหญ่) (ข้อ 1) [primary]

Thai, verbatim:
> "อาคารขนาดใหญ่" หมายความว่า อาคารที่มีพื้นที่รวมกันทุกชั้นหรือชั้นหนึ่งชั้นใดในหลังเดียวกันเกิน ๒,๐๐๐ ตารางเมตร หรืออาคารที่มีความสูงตั้งแต่ ๑๕.๐๐ เมตรขึ้นไป และมีพื้นที่รวมกันทุกชั้นหรือชั้นหนึ่งชั้นใดในหลังเดียวกันเกิน ๑,๐๐๐ ตารางเมตร แต่ไม่เกิน ๒,๐๐๐ ตารางเมตร

English:
> "Large building" means a building whose total floor area, for all floors or any single floor in one building, exceeds 2,000 m²; or a building 15.00 m high or taller with total floor area, for all floors or any single floor, over 1,000 m² but not over 2,000 m².

- **Answer to Q6:** The definition is 2,000 m² (any floor or total), or ≥15 m high with floor area >1,000 m². The user's "≥2,000 m² or ≥15 m" is a partial match: the 15 m trigger only applies together with >1,000 m². [primary]
- **Extra rules tied to "large building" in Regulation 55:** the fire-resistant structure rule (ข้อ 15) names "อาคารขนาดใหญ่". Other uses are not checked. [primary]
- The ONEP EIA entry 27 (high-rise or extra-large buildings) is a different category (see §5). [secondary]

## 2. Ministerial Regulation No. 33 (B.E. 2535) on high-rise and extra-large buildings

**Status: primary text NOT FOUND.** The OPS mirror (opsmoac.go.th) and the Chula thesis PDF could not be read in full. Only search-summary text was available.

Secondary, from a Chula thesis quoted in a search summary [secondary, unverified]:
- อาคารสูง (high-rise): a building people can occupy or use with height from 23 m upwards.
- Height measured from ground level at construction to the roof deck; gable or pitched roof to the top of the highest storey wall. (Matches the Regulation 55 definition.)

Amendments and status [secondary]:
- Amended by Regulation 42 (B.E. 2537) and Regulation 50 (B.E. 2540). Not verified.
- Regulation 69 (B.E. 2564) renamed Chapter 2 and took effect 180 days after publication in Royal Gazette Vol. 138, Part 38 Ka, 4 June 2564. Source: search summary; attribution uncertain.
- A draft amendment on fire safety for high-rise and extra-large buildings received Cabinet approval in principle. Its date and status are unknown. [secondary, unverified]

Road access and open space:
- Road access: a search summary says a plot fronting a road with a right-of-way (เขตทาง) of at least 18 m is a condition for high-rise or extra-large buildings under Regulation 33. This conflicts with the user's assumed "10 m". [secondary, unverified] The summary did not name a single source; the news pages on the draft amendment are https://www.infoquest.co.th/?p=330311 and https://www.thansettakij.com/real-estate/574653, and neither was read in full.
- A 6 m road or open area around the building is referred to in consumer news as an existing requirement. Exact clause and width not found. [secondary, unverified] Source: https://www.khaosod.co.th/monitor-news/news_9815633
- Frontage length: not found.
- Boundary setbacks for high-rise buildings: not found in Regulation 33 text. Regulation 55 clause 50 covers 23 m and under only.

Answer to Q2 items: definitions (partly, secondary), height measure (secondary, matches R55), road access (conflicting, secondary), 6 m open space (secondary, unverified), boundary setbacks (not found).

## 3. Bangkok Building Control Ordinance B.E. 2544 (ข้อบัญญัติกรุงเทพมหานคร เรื่อง ควบคุมอาคาร พ.ศ. 2544)

**Status: primary text NOT FOUND.** The bangkok.go.th PDF and the Royal Gazette entry were not located.

- **FAR cap (10:1):** NOT FOUND.
- **Open space rules:** NOT FOUND in primary text.
- **Canal/river setbacks:** NOT FOUND in the BMA ordinance. A national rule exists (Regulation 55 ข้อ 42, see §1g). [primary]
- **Setback and height rules for Bangkok:** A Sarasart journal article (2024) and a Nakhara article (2025) say the setbacks, height and open space in Bangkok follow the BMA ordinance. A Chula thesis (cited in a search summary) says the current Bangkok setback, height and open-space rules follow a BMA ordinance of B.E. 2522, not 2544, and that Regulation 33 covers high-rise and extra-large buildings. These accounts conflict on which BMA ordinance applies. [secondary]
- A law-firm note says Bangkok commercial buildings have road-width-based allowances, for example at 16 m roads. Different regulation, not verified. [secondary, unverified] Lead: https://www.tilleke.com/insights/new-approach-commercial-building-rules-bangkok/3/
- Sources for the lead: https://so05.tci-thaijo.org/index.php/sarasatr/article/view/272771 (Sarasart, 2024; secondary).

## 4. Car parking requirements in Bangkok

**Status: primary text NOT FOUND.** Ministerial Regulation 7 (B.E. 2517) and its amendments were not read.

Secondary, from a teaching slide [unverified]:
- Hotel: one car per 10 m² of lobby area; one car per 20 m² of commercial area. Source: https://elca.ssru.ac.th/korkiat_ni/pluginfile.php/2/course/section/1/LECTURE-3-CARPARK-BLDG%20%281%29.pdf (text garbled in places).
- Condominium with family units of 60 m² or more: one car per family unit. Same source. [unverified]
- Office per m²: not found (the snippet was cut off).
- Condo near rail (news): one space per 120 m² of construction area. Date not shown. [secondary, unverified] Source: https://www.nationthailand.com/business/40068634 (lead only).
- Per-room hotel rate: not found.

Regulation identity and year:
- Ministerial Regulation 7 (B.E. 2517): cited in a Chula thesis as issued under the Building Control Act B.E. 2479, used with the Bangkok parking ordinance. Another source says it is under B.E. 2522. Conflict. [secondary]
- Regulation 41: one source says B.E. 2537 (1994), not 2540 as the user said. [secondary, unverified]
- Space and aisle dimensions: sources conflict. One says 2.40 × 5.00 m (reduced from 2.50 × 6.00 m). Another says the minimum is 2.50 × 6.00 m. [secondary, unverified]

## 5. EIA thresholds (ONEP notification) for condominiums, hotels and offices in Bangkok

**Status: enacted notice text NOT FOUND.** eiathailand.onep.go.th was unreachable from this network (connection failed).

Primary-government evidence:
- The ONEP consultation document (2024) for a revised notice refers to the current notice as "ประกาศ ทส. พ.ศ. ๒๕๖๖ ลงวันที่ ๒๐ ธันวาคม พ.ศ. ๒๕๖๖". It says entry 20 is highways, and entry 27 is high-rise or extra-large buildings. The draft proposes to amend entry 27 to add "ทั้งอาคารหรือที่มีพื้นที่รวมกันตั้งแต่ ๑๐,๐๐๐ ตารางเมตรขึ้นไป". It also says ห้างสรรพสินค้าที่มีพื้นที่ใช้สอยเกิน ๑๐,๐๐๐ ตารางเมตร should prepare an EIA. Source: https://www.onep.go.th/wp-content/uploads/2025/01/09075725680124.pdf [primary, draft; the enacted entry 27 wording was not confirmed].
- Earlier notice: first issued 4 January 2562, with amendments in 2563, 2564 and 2565. [secondary]

Thresholds for condominiums, hotels and offices:
- **Condominium:** 80 or more residential units, or total usable area above 4,000 m². Stated by several law firms and property sites. [secondary, unverified]
- **Hotel / resort:** conflicting. A JETRO translation of a Ministry notice says 80 rooms or total functional area of 4,000 m² and above. A Vietnamese consultancy says 60 rooms, or 4,000 m². [secondary, conflicting]
- **Newer rule (secondary):** a Bangkok hotel-industry source says an EIA is needed at 80 rooms and over, or aggregate usable floor area of 4,000 m² and above, plus buildings of 23 m or taller or total usable floor area of 10,000 m². [secondary, unverified]
- **Offices:** no office-specific threshold found.
- **Bangkok-specific EIA type or tiers:** not found. The EIA / EIE distinction was noted in passing (developers reportedly apply for EIE permits to avoid EIA). [secondary]

Lead for the user to check: the current notice in the ONEP EIA portal, looking for the "กำหนดโครงการ กิจการ หรือการดำเนินการ ซึ่งต้องจัดทำรายงาน EIA" list, the condo and hotel rows, and the entry 27 wording.

## 6. Large building definition

Answered in §1h [primary]. Summary: 2,000 m² (any floor or total), or ≥15 m high and over 1,000 m² up to 2,000 m². Extra rule in Regulation 55: fire-resistant structure (ข้อ 15). [primary]

## 7. Open questions / conflicts

1. **Clause 41 structure.** It is unclear whether the 6 m / 1-10 / 2 m tiers apply only to the listed types and buildings over two storeys or 8 m, or to all buildings. The preamble sentence (3 m from centreline for roads under 6 m) applies to all buildings near such roads. [primary; interpretation]
2. **Road width measurement.** Not defined in Regulation 55. Whether width is measured at the plan line or the surface is unknown.
3. **Height reference for clause 44.** The Regulation 55 text says "ระดับถนนหรือระดับพื้นดินที่ก่อสร้าง" (road level or ground level at construction). If the plot is above or below road level, the datum is not specified further. [primary; ambiguity]
4. **Open space denominator.** Clause 33 uses "พื้นที่ชั้นใดชั้นหนึ่งที่มากที่สุด" (largest single floor), which is unusual. Confirm whether the measurement is gross floor area or net floor area. [primary; not defined]
5. **Mixed-use open space.** The 30% rule for buildings also used for housing (clause 33(2) last sentence). The reading seems clear, but confirm with a practising architect. [primary]
6. **Walls without openings.** Clause 50's 0.50 m and boundary-with-consent provisions may or may not cover solid walls. [primary; ambiguous]
7. **Floor-to-ceiling measurement.** Clause 22 says "พื้นถึงพื้น" (floor-to-floor), not floor-to-ceiling. The user's assumption differs. [primary]
8. **Clause 48 after Regulation 61.** The original parking exemption and the 4 m / 6 m spacing were replaced. Confirm whether Regulation 61 is the current text and whether any later amendment exists. [primary; later amendments not checked]
9. **Clause 50 above 23 m.** No rule found in Regulation 55. Regulation 33 may apply but its text is not read. [primary gap]
10. **Bangkok applicability.** It is not resolved whether Regulation 55 (national) applies in full in Bangkok alongside the BMA ordinance 2544, or whether the BMA ordinance overrides the national setback and height rules. Secondary sources disagree on which governs. [conflict]
11. **Regulation 33 road width.** The user assumed a 10 m frontage. A news report cites 18 m right-of-way for high-rise or extra-large buildings. [secondary, conflict]
12. **Regulation 33 status.** The Regulation 69 amendment and any pending fire-safety draft are not confirmed. [unverified]
13. **Regulation 33 amendment numbers.** Sources cite 42 and 50 as amendments of Regulation 33, while another mentions Regulation 41 for the same subject. Not resolved. [conflict]
14. **Parking year and dimensions.** Regulation 41 year (2537 vs 2540) and space dimensions (2.40 × 5.00 m vs 2.50 × 6.00 m) conflict. [secondary, conflict]
15. **Parking enabling law.** Regulation 7 is cited under the 2479 Act and under the 2522 Act. [conflict]
16. **EIA hotel threshold.** 80 rooms vs 60 rooms. [conflict]
17. **EIA condo threshold.** 80 units / 4,000 m² is consistent across several secondary sources but not checked against the enacted notice. [unverified]
18. **Office EIA threshold.** Not found.
19. **Bangkok FAR cap (10:1), open space, canal setbacks in the BMA ordinance.** Not found.
20. **Floor clearance mapping in clause 22.** Inferred from table column order. [primary; verify]
21. **Clause 19 condo unit area.** The sentence is partly garbled in the PDF. The 20 m² figure is read from the fragment. [primary; partial]

## 8. Summary of sources

Primary (read in full or in the relevant clauses):
- Regulation 55 text: https://data.yotathai.org/d/zx9hfz.pdf (OCS header; local copy at scratchpad r2/r55.txt).
- Regulation 61 text: https://data.yotathai.org/legacy/uploads/2/8/0/3/28039899/%E0%B8%81%E0%B8%8E%E0%B8%81%E0%B8%A3%E0%B8%B0%E0%B8%97%E0%B8%A3%E0%B8%A7%E0%B8%87%E0%B8%89%E0%B8%9A%E0%B8%B1%E0%B8%9A%E0%B8%97%E0%B8%B5%E0%B9%88_61_%E0%B9%81%E0%B8%81%E0%B9%89%E0%B8%82%E0%B9%89%E0%B8%AD_48_%E0%B8%81%E0%B8%8E%E0%B8%81%E0%B8%A3%E0%B8%B0%E0%B8%97%E0%B8%A3%E0%B8%A7%E0%B8%87_55.pdf (local copy at scratchpad r2/r61.txt).
- ONEP consultation document (2024, draft): https://www.onep.go.th/wp-content/uploads/2025/01/09075725680124.pdf

Secondary (corroboration or leads only):
- https://www.yotathai.com/yotanews/rule55-buildinglaw (index for Regulation 55 and 61; Krisdika links).
- https://cuir.car.chula.ac.th/bitstream/123456789/65705/3/Chumrunpol_ch_ch2_p.pdf (thesis; redirected, not read).
- https://www.infoquest.co.th/?p=330311 (news on Regulation 33 draft).
- https://www.khaosod.co.th/monitor-news/news_9815633 (news on 6 m road).
- https://elca.ssru.ac.th/korkiat_ni/pluginfile.php/2/course/section/1/LECTURE-3-CARPARK-BLDG%20%281%29.pdf (teaching slide, parking).
- https://www.nationthailand.com/business/40068634 (news, parking lead).
- https://www.tilleke.com/insights/new-approach-commercial-building-rules-bangkok/3/ (law firm, lead).
- https://so05.tci-thaijo.org/index.php/sarasatr/article/view/272771 (journal, Bangkok ordinance).

Not reached: Krisdika site (TLS error), eiathailand.onep.go.th (connection failure), dpt.go.th (socket hang up), bangkok.go.th (not located).
