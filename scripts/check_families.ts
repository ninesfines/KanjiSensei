import assert from "node:assert/strict";
import { queryFamily, listFamilies } from "../src/lib/families";

const water = queryFamily({ mode: "component", family: "水", language: "en" });
assert(water.some(m => m.kanji.kanji === "海"), "canonical water component includes 海");
assert(queryFamily({ mode: "component", family: "氵", language: "en" }).some(m => m.kanji.kanji === "海"), "water variant resolves to 水");
assert(queryFamily({ mode: "component", family: "水", language: "en", radicalOnly: true }).every(m => m.kanji.components.some(c => (c.character === "水" || c.canonical === "水") && c.role === "radical")), "radical-only keeps radical component records");
const allPositions = queryFamily({ mode: "component", family: "水", language: "en" });
assert(queryFamily({ mode: "component", family: "水", language: "en", position: "hen" }).every(m => m.kanji.components.some(c => c.canonical === "水" && c.position === "hen")), "position filter uses recorded position");
assert(allPositions.length >= queryFamily({ mode: "component", family: "水", language: "en", position: "hen" }).length, "position filtering only narrows");
const on = listFamilies("reading", "en").find(f => f.id === "on:セイ");
if (on) assert(queryFamily({ mode: "reading", family: "on:セイ", language: "en" }).every(m => m.kanji.onyomi.includes("セイ")), "on reading membership is exact");
const kun = listFamilies("reading", "en").find(f => f.id === "kun:ひと");
if (kun) assert(queryFamily({ mode: "reading", family: "kun:ひと", language: "en" }).every(m => m.kanji.kunyomi.includes("ひと")), "kun reading membership retains kana and reading type");
const wordFamily = listFamilies("words", "en").find(f => f.id === "日");
assert(wordFamily, "日 has compound connections");
const wordMembers = queryFamily({ mode: "words", family: "日", language: "en" });
assert(wordMembers.length > 0 && wordMembers.every(m => m.words.some(w => w.characters.includes("日") && w.characters.includes(m.kanji.kanji))), "word family has actual cooccurrence evidence");
console.log("Family checks passed.");

const blue = listFamilies("component", "es").find(f => f.id === "青");
assert(blue?.label.includes("azul") && !blue.label.includes("blue"), "component labels use Spanish data");
const bluePhonetics = queryFamily({mode:"phonetic", family:"青", language:"es"});
assert(bluePhonetics.find(m => m.kanji.kanji === "情")?.reason.includes("セイ"), "phonetic comparison includes secondary on readings");
for (const mode of ["component", "phonetic", "reading", "visual", "theme", "words"] as const) {
  for (const family of listFamilies(mode, "es")) {
    const members = queryFamily({mode, family:family.id, language:"es"});
    assert.equal(new Set(members.map(m => m.kanji.kanji)).size, members.length, `${mode}/${family.id} has no duplicate kanji`);
    assert.equal(members.length, family.count, `${mode}/${family.id} count matches its results`);
  }
}
console.log("All family counts, unique membership, and localization checks passed.");
