/**
 * God roll definitions from three community sources.
 * Source labels: 'TRUEGaming', 'Reddit', 'TRUEGaming + Reddit', 'Last City Discord'
 * Each entry is a single definition OR an array of definitions.
 * All four columns must be satisfied by ONE definition — no mixing.
 *
 * Last City Discord entries live in god-rolls-lcd.js and are merged in below.
 */

import { LCD_PVE } from './god-rolls-lcd.js';

export const CLOSE_THRESHOLD = 3;

/**
 * Merge LCD additions into the base PVE table.
 * - New weapon names are added as-is.
 * - Existing single-object entries are promoted to arrays with the LCD
 *   definition appended.
 * - Existing array entries receive the LCD definition appended.
 */
function mergeLCD(base, additions) {
  const out = { ...base };
  for (const [name, def] of Object.entries(additions)) {
    if (out[name] === undefined) {
      out[name] = def;
    } else {
      const existing = Array.isArray(out[name]) ? out[name] : [out[name]];
      const add      = Array.isArray(def)        ? def        : [def];
      out[name] = [...existing, ...add];
    }
  }
  return out;
}

export const PVP = {
  // Scout Rifles
  "Angel's Advocate":      { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Life Support", "Zen Moment"], col3: ["Perfect Balance"], col4: ["Hidden Hand"] },
  "Badger CCL":            { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Crowd Control"], col3: ["Hand-laid Stock"], col4: ["Hidden Hand"] },
  "Burning Eye":           { source: 'TRUEGaming', col1: ["Accurized Ballistics"], col2: ["Smallbore"], col3: ["Explosive Rounds"], col4: ["Third Eye", "Zen Moment"] },
  "Cocytus SR4":           { source: 'TRUEGaming + Reddit', col1: ["Torch HS2"], col2: ["Life Support"], col3: ["Hand-laid Stock"], col4: ["Eye of the Storm"] },
  "Colovance's Duty":      { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Crowd Control"], col3: ["Hand-laid Stock"], col4: ["Hidden Hand"] },
  "Cryptic Dragon":        { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Crowd Control"], col3: ["Braced Frame"], col4: ["Reactive Reload"] },
  "The Distant Star": [
    { source: 'TRUEGaming', col1: ["Iron Ranged Scope"], col2: ["Perfect Balance"], col3: ["High Caliber Rounds"], col4: ["Zen Moment", "Hidden Hand"] },
    { source: 'Reddit',     col1: ["Iron Ranged Scope"], col2: ["Perfect Balance"], col3: ["Full Auto", "Explosive Rounds"], col4: ["Zen Moment", "Hidden Hand"] },
  ],
  "Hand of Judgement":     { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Hand-laid Stock"], col3: ["High Caliber Rounds", "Explosive Rounds"], col4: ["Hidden Hand", "Zen Moment"] },
  "The Hero Formula":      { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Life Support", "Zen Moment"], col3: ["Braced Frame"], col4: ["Hidden Hand"] },
  "Keystone 01": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["High Caliber Rounds", "Explosive Rounds"], col3: ["Perfect Balance"], col4: ["Hidden Hand"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Explosive Rounds"], col3: ["Perfect Balance"], col4: ["Hidden Hand"] },
  ],
  "Lethe Noblesse":        { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Crowd Control"], col3: ["Hand-laid Stock"], col4: ["Hidden Hand"] },
  "NL Shadow 701X":        { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Zen Moment"], col3: ["Explosive Rounds"], col4: ["Hidden Hand"] },
  "Not Like the Others":   { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Zen Moment"], col3: ["High Caliber Rounds"], col4: ["Hidden Hand"] },
  "The Saterienne Rapier": { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Crowd Control"], col3: ["Explosive Rounds"], col4: ["Reactive Reload"] },
  "SUROS DIS-43":          { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance", "Hammer Forged"], col3: ["Hidden Hand"], col4: ["Smallbore", "Hand-laid Stock"] },
  "SUROS DIS-47":          { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance", "Hammer Forged"], col3: ["Full Auto"], col4: ["Smallbore", "Hand-laid Stock"] },
  "Treads Upon Stars":     { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Crowd Control"], col3: ["Braced Frame"], col4: ["Hidden Hand"] },
  "Tuonela SR4":           { source: 'TRUEGaming + Reddit', col1: ["Torch HS2"], col2: ["Life Support"], col3: ["Extended Mag"], col4: ["Zen Moment", "Third Eye"] },
  "The Wounded":           { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["High Caliber Rounds", "Explosive Rounds"], col3: ["Perfect Balance"], col4: ["Hidden Hand"] },

  // Pulse Rifles
  "Aegis of the Reef":     { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS", "SureShot IS"], col2: ["Perfect Balance"], col3: ["High Caliber Rounds"], col4: ["Counterbalance"] },
  "Apple of Discord":      { source: 'TRUEGaming + Reddit', col1: ["SC Holo"], col2: ["Headseeker"], col3: ["Counterbalance"], col4: ["Hand-laid Stock"] },
  "Blind Perdition":       { source: 'TRUEGaming', col1: ["Smooth Ballistics", "Smart Drift Control"], col2: ["Hand-laid Stock", "Smallbore"], col3: ["High Caliber Rounds", "Hand Loaded"], col4: ["Outlaw", "Counterbalance"] },
  "B-29 Party Favor":      { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Feeding Frenzy"], col3: ["Perfect Balance", "Hand-laid Stock"], col4: ["Counterbalance", "Rangefinder"] },
  "The Clever Dragon":     { source: 'TRUEGaming + Reddit', col1: ["Iron Red Dot"], col2: ["Smallbore"], col3: ["High Caliber Rounds"], col4: ["Counterbalance"] },
  "Final Duty": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["Headseeker"], col3: ["Perfect Balance"], col4: ["Glass Half Full"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Headseeker"], col3: ["Perfect Balance"], col4: ["Feeding Frenzy"] },
  ],
  "Grasp of Malok": [
    { source: 'TRUEGaming', col1: ["Red Dot-OAS"], col2: ["Counterbalance"], col3: ["Braced Frame", "Smallbore", "Perfect Balance"], col4: ["Glass Half Full"] },
    { source: 'Reddit',     col1: ["Red Dot-OAS"], col2: ["Counterbalance"], col3: ["Braced Frame", "Smallbore", "Perfect Balance"], col4: ["Feeding Frenzy"] },
  ],
  "Hawksaw":               { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance"], col3: ["Counterbalance"], col4: ["Rifled Barrel"] },
  "Herja-D":               { source: 'TRUEGaming + Reddit', col1: ["SC Holo"], col2: ["Headseeker"], col3: ["Counterbalance"], col4: ["Hand-laid Stock"] },
  "Hopscotch Pilgrim": [
    { source: 'TRUEGaming', col1: ["Red Dot-OAS"], col2: ["Headseeker"], col3: ["Perfect Balance"], col4: ["Third Eye", "Glass Half Full"] },
    { source: 'Reddit',     col1: ["Red Dot-OAS"], col2: ["Headseeker"], col3: ["Perfect Balance"], col4: ["Full Auto"] },
  ],
  "Lyudmila-D":            { source: 'TRUEGaming + Reddit', col1: ["SC Holo"], col2: ["Headseeker"], col3: ["Counterbalance"], col4: ["Hand-laid Stock"] },
  "Nirwen's Mercy": [
    { source: 'TRUEGaming', col1: ["Red Dot-OAS"], col2: ["Counterbalance"], col3: ["Braced Frame"], col4: ["Glass Half Full"] },
    { source: 'Reddit',     col1: ["Red Dot-OAS"], col2: ["Counterbalance"], col3: ["Braced Frame"], col4: ["Feeding Frenzy"] },
  ],
  "Parthian Shot":         { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Feeding Frenzy"], col3: ["Hand-laid Stock"], col4: ["Headseeker"] },
  "Spare Change .25": [
    { source: 'TRUEGaming', col1: ["Red Dot-OAS"], col2: ["Counterbalance"], col3: ["Braced Frame"], col4: ["Glass Half Full"] },
    { source: 'Reddit',     col1: ["Red Dot-OAS"], col2: ["Counterbalance"], col3: ["Braced Frame"], col4: ["Feeding Frenzy"] },
  ],
  "SUROS PDX-41":          { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance"], col3: ["Hidden Hand"], col4: ["Smallbore"] },
  "SUROS PDX-45":          { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance"], col3: ["Counterbalance"], col4: ["Rifled Barrel", "Smallbore"] },
  "The Villainy": [
    { source: 'TRUEGaming', col1: ["Red Dot-OAS"], col2: ["Counterbalance"], col3: ["Braced Frame"], col4: ["Glass Half Full"] },
    { source: 'Reddit',     col1: ["Red Dot-OAS"], col2: ["Counterbalance"], col3: ["Braced Frame"], col4: ["Feeding Frenzy"] },
  ],
  "The Waltz":             { source: 'Reddit', col1: ["Reflex"], col2: ["High Caliber Rounds"], col3: ["Smallbore"], col4: ["Counterbalance"] },

  // Hand Cannons
  "Byronic Hero":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Hidden Hand"] },
  "The Devil You Know":    { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Icarus"] },
  "Down and Doubt 00-0":   { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Luck in the Chamber"], col3: ["Rifled Barrel"], col4: ["Icarus"] },
  "Exile's Student":       { source: 'TRUEGaming', col1: ["Accurized Ballistics"], col2: ["Hammer Forged"], col3: ["Explosive Rounds"], col4: ["Hidden Hand"] },
  "Eyasluna":              { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Hidden Hand"] },
  "Finnala's Peril":       { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Hidden Hand"] },
  "Free Will III":         { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Explosive Rounds"], col3: ["Hammer Forged"], col4: ["Rangefinder"] },
  "Gaheris-D":             { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Crowd Control"], col3: ["Rangefinder"], col4: ["Reinforced Barrel"] },
  "Her Revenge":           { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Hidden Hand", "Icarus"] },
  "How Dare You":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Icarus"], col3: ["Rifled Barrel"], col4: ["Rangefinder"] },
  "Ill Will":              { source: 'TRUEGaming + Reddit', col1: ["SureShot IS"], col2: ["Rangefinder"], col3: ["Braced Frame"], col4: ["Luck in the Chamber"] },
  "Imago Loop":            { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Hidden Hand", "Icarus"] },
  "Judith-D":              { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Crowd Control"], col3: ["Final Round", "Reactive Reload"], col4: ["Speed Reload"] },
  "Kumakatok HC-4":        { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Luck in the Chamber"], col3: ["Braced Frame"], col4: ["Icarus"] },
  "The Lingering Song":    { source: 'TRUEGaming', col1: ["Iron Lordly Sights"], col2: ["Braced Frame"], col3: ["Feather Mag"], col4: ["Luck in the Chamber"] },
  "Lord High Fixer":       { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Hidden Hand", "Icarus"] },
  "The Palindrome":        { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Icarus"], col3: ["Rifled Barrel"], col4: ["Rangefinder"] },
  "The Revelator":         { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Hidden Hand"] },
  "Stolen Pride":          { source: 'TRUEGaming + Reddit', col1: ["TrueSight IS"], col2: ["Rifled Barrel"], col3: ["Explosive Rounds"], col4: ["Rangefinder"] },
  "The Vanity":            { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Luck in the Chamber"], col3: ["Rifled Barrel"], col4: ["Icarus"] },
  "Uffern HC4":            { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Luck in the Chamber"], col3: ["Rifled Barrel"], col4: ["Icarus"] },
  "The Wail":              { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Outlaw"], col3: ["Hammer Forged"], col4: ["Rangefinder"] },

  // Auto Rifles
  "An Answering Chord":    { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance"], col3: ["Smallbore"], col4: ["Rangefinder"] },
  "Antipodal Hindsight":   { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Hidden Hand"] },
  "Arminius-D":            { source: 'TRUEGaming + Reddit', col1: ["SC Holo"], col2: ["Crowd Control"], col3: ["Counterbalance"], col4: ["Braced Frame"] },
  "Assembly II":           { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["High Caliber Rounds"], col3: ["Perfect Balance"], col4: ["Counterbalance"] },
  "The Continental":       { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Crowd Control"], col3: ["Braced Frame"], col4: ["Counterbalance"] },
  "The Dealbreaker":       { source: 'TRUEGaming + Reddit', col1: ["SC Holo"], col2: ["Crowd Control"], col3: ["Rangefinder"], col4: ["Rifled Barrel"] },
  "Does Not Bow":          { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Rangefinder"], col3: ["Perfect Balance"], col4: ["Hidden Hand"] },
  "Extremophile 011":      { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["High Caliber Rounds"], col3: ["Perfect Balance"], col4: ["Counterbalance"] },
  "Grim Citizen III":      { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Rangefinder"], col3: ["Perfect Balance"], col4: ["Hidden Hand"] },
  "Haakon's Hatchet":      { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Rangefinder"], col3: ["Smallbore"], col4: ["Counterbalance"] },
  "Her Memory":            { source: 'TRUEGaming + Reddit', col1: ["Reflex", "SureShot IS"], col2: ["Rangefinder"], col3: ["Perfect Balance"], col4: ["Counterbalance"] },
  "Hex Caster ARC":        { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Persistence"], col3: ["Perfect Balance"], col4: ["Life Support"] },
  "Paleocontact JPK-43":   { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Counterbalance"] },
  "Red Spectre":           { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Rangefinder"], col3: ["Perfect Balance"], col4: ["Hidden Hand"] },
  "Shadow Price":          { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Rangefinder"], col3: ["Perfect Balance"], col4: ["Hidden Hand"] },
  "Soulstealer's Claw":    { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Perfect Balance"], col3: ["Single Point Sling"], col4: ["Counterbalance"] },
  "SUROS ARI-41":          { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance"], col3: ["Rifled Barrel"], col4: ["Counterbalance"] },
  "SUROS ARI-45":          { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance"], col3: ["Rifled Barrel"], col4: ["Counterbalance"] },
  "The Unbent Tree":       { source: 'TRUEGaming + Reddit', col1: ["Iron Ranged Scope"], col2: ["Braced Frame"], col3: ["Single Point Sling"], col4: ["Counterbalance"] },
  "Vision Stone":          { source: 'TRUEGaming + Reddit', col1: ["Smart Drift Control"], col2: ["Send It"], col3: ["Hand Loaded"], col4: ["Crowd Control"] },
  "Zarinaea-D":            { source: 'TRUEGaming + Reddit', col1: ["SC Holo"], col2: ["Crowd Control"], col3: ["Rangefinder"], col4: ["Braced Frame"] },
  "Zero-Day Dilemma":      { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Crowd Control"], col3: ["Perfect Balance"], col4: ["Hidden Hand"] },

  // Sniper Rifles
  "1000-Yard Stare":       { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Eye of the Storm"], col3: ["Quickdraw"], col4: ["Hidden Hand"] },
  "20/20 AMR7":            { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Unflinching"], col3: ["Skip Rounds"], col4: ["Hidden Hand"] },
  "Antinomy XVI":          { source: 'TRUEGaming + Reddit', col1: ["ATA Scout"], col2: ["Unflinching"], col3: ["Performance Bonus"], col4: ["Quickdraw"] },
  "Aoife Rua-D":           { source: 'TRUEGaming + Reddit', col1: ["ATA Scout"], col2: ["Unflinching"], col3: ["Performance Bonus"], col4: ["Quickdraw"] },
  "Bitter Edge 010":       { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Quickdraw"], col3: ["Life Support"], col4: ["Hidden Hand"] },
  "But Not Forgotten":     { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Braced Frame"], col3: ["Quickdraw"], col4: ["Hidden Hand"] },
  "Deposition VII":        { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Snapshot"], col3: ["Mulligan"], col4: ["Unflinching"] },
  "Devil's Dawn":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Life Support"], col3: ["Quickdraw"], col4: ["Firefly"] },
  "Eirene RR4":            { source: 'TRUEGaming + Reddit', col1: ["Faucon SS1"], col2: ["Performance Bonus"], col3: ["Quickdraw"], col4: ["Unflinching"] },
  "Event Horizon":         { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Grenadier", "Spray and Pray"], col3: ["Quickdraw"], col4: ["Hidden Hand"] },
  "Extrasolar RR4":        { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Eye of the Storm"], col3: ["Quickdraw"], col4: ["Hidden Hand"] },
  "Her Fury":              { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Life Support"], col3: ["Quickdraw"], col4: ["Hidden Hand"] },
  "The Laughing Heart":    { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Injection Mold"], col3: ["Quickdraw"], col4: ["Hidden Hand"] },
  "LDR 5001":              { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Life Support"], col3: ["Quickdraw"], col4: ["Hidden Hand"] },
  "Seventh Sense":         { source: 'TRUEGaming + Reddit', col1: ["ViewTac SLH20", "Ambush SLH25"], col2: ["Grenadier"], col3: ["Quickdraw"], col4: ["Firefly"] },
  "Tamar-D":               { source: 'TRUEGaming + Reddit', col1: ["ATA Scout"], col2: ["Unflinching"], col3: ["Performance Bonus"], col4: ["Quickdraw"] },
  "Tao Hua Yuan":          { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Eye of the Storm"], col3: ["Quickdraw"], col4: ["Hidden Hand"] },
  "Uzume RR4":             { source: 'TRUEGaming + Reddit', col1: ["Faucon SS1"], col2: ["Performance Bonus"], col3: ["Quickdraw"], col4: ["Unflinching"] },
  "Weyloran's March":      { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Eye of the Storm"], col3: ["Quickdraw"], col4: ["Hidden Hand"] },
  "Y-09 Longbow Synthesis":{ source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Life Support"], col3: ["Quickdraw"], col4: ["Hidden Hand"] },

  // Shotguns
  "44 Curtain Call":       { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Performance Bonus"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Rangefinder"] },
  "Bad Counsel IV":        { source: 'TRUEGaming + Reddit', col1: ["Aggressive Ballistics"], col2: ["Close and/or Personal", "Close and Personal"], col3: ["Quickdraw", "Snapshot"], col4: ["Rangefinder"] },
  "Burden of Proof XI":    { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Rangefinder"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Performance Bonus"] },
  "The Comedian":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Full Auto"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Performance Bonus"] },
  "Conspiracy Theory-D":   { source: 'TRUEGaming + Reddit', col1: ["Field Choke"], col2: ["Rangefinder"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Performance Bonus"] },
  "Her Champion":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Rangefinder"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Performance Bonus"] },
  "Jingukogo-D":           { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Final Round"], col3: ["Rangefinder"], col4: ["Rifled Barrel"] },
  "Last-Ditch 001":        { source: 'TRUEGaming + Reddit', col1: ["CQB Ballistics"], col2: ["Quickdraw"], col3: ["Hammer Forged"], col4: ["Rangefinder"] },
  "Matador 64":            { source: 'TRUEGaming + Reddit', col1: ["Aggressive Ballistics"], col2: ["Performance Bonus"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Rangefinder"] },
  "The Next Big Thing":    { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Close and/or Personal", "Close and Personal"] },
  "Occam's Razor":         { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Performance Bonus"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Rangefinder"] },
  "Patch-A":               { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Close and/or Personal", "Close and Personal"] },
  "Party Crasher +1":      { source: 'TRUEGaming + Reddit', col1: ["Aggressive Ballistics"], col2: ["Rangefinder"], col3: ["Rifled Barrel", "Reinforced Barrel"], col4: ["Performance Bonus"] },
  "The Proud Spire":       { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Reinforced Barrel", "Rifled Barrel"], col3: ["Quickdraw", "Snapshot"], col4: ["Rangefinder"] },
  "Stolen Will":           { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Rangefinder"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Performance Bonus"] },
  "Strongbow-D":           { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Close and/or Personal", "Close and Personal"], col3: ["Rangefinder"], col4: ["Rifled Barrel"] },
  "Two to the Morgue":     { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Rangefinder"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Performance Bonus"] },
  "Unraveling Thread":     { source: 'TRUEGaming + Reddit', col1: ["CQB Ballistics"], col2: ["Hammer Forged"], col3: ["Hand Loaded"], col4: ["Rangefinder"] },
  "Winter's End":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Rifled Barrel"], col3: ["Lightweight"], col4: ["Life Support", "Performance Bonus"] },

  // Fusion Rifles
  "77 Wizard": [
    { source: 'TRUEGaming', col1: ["Red Dot-OAS"], col2: ["Rangefinder"], col3: ["Braced Frame", "Rifled Barrel"], col4: ["Grenadier"] },
    { source: 'Reddit',     col1: ["Red Dot-OAS"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Grenadier"] },
  ],
  "Ashraven's Flight": [
    { source: 'TRUEGaming', col1: ["Red Dot-OAS"], col2: ["Hipfire", "Hip Fire"], col3: ["Braced Frame"], col4: ["Hot Swap"] },
    { source: 'Reddit',     col1: ["Red Dot-OAS"], col2: ["Danger Close"], col3: ["Rifled Barrel"], col4: ["Rangefinder"] },
  ],
  "The Branded Lord": [
    { source: 'TRUEGaming', col1: ["Linear Compensator"], col2: ["Braced Frame"], col3: ["Accelerated Coils"], col4: ["Rangefinder"] },
    { source: 'Reddit',     col1: ["Linear Compensator"], col2: ["Rifled Barrel"], col3: ["Quickdraw"], col4: ["Rangefinder"] },
  ],
  "Darkblade's Spite": [
    { source: 'TRUEGaming', col1: ["Red Dot-OAS"], col2: ["Hidden Hand"], col3: ["Braced Frame", "Rifled Barrel"], col4: ["Rangefinder"] },
    { source: 'Reddit',     col1: ["Red Dot-OAS"], col2: ["Danger Close"], col3: ["Rifled Barrel"], col4: ["Rangefinder"] },
  ],
  "Each New Day": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["Unflinching"], col3: ["Snapshot", "Hand-laid Stock"], col4: ["Counterbalance"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Life Support"], col3: ["Rifled Barrel"], col4: ["Rangefinder"] },
  ],
  "Ex Astris": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["Hip Fire"], col3: ["Braced Frame"], col4: ["Hidden Hand"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Life Support"], col3: ["Rifled Barrel"], col4: ["Rangefinder"] },
  ],
  "Hitchhiker FR4": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["Hip Fire"], col3: ["Braced Frame"], col4: ["Hot Swap"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Danger Close"], col3: ["Rifled Barrel"], col4: ["Rangefinder"] },
  ],
  "Long Far Gone": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["Hip Fire"], col3: ["Braced Frame"], col4: ["Hot Swap"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Danger Close"], col3: ["Braced Frame"], col4: ["Rangefinder"] },
  ],
  "Phanta Rei": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["Hip Fire"], col3: ["Braced Frame"], col4: ["Hot Swap"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Danger Close"], col3: ["Rifled Barrel"], col4: ["Rangefinder"] },
  ],
  "Saladin's Vigil":       { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Rifled Barrel"], col3: ["Quickdraw"], col4: ["Rangefinder"] },
  "Split Shifter Pro":     { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Hip Fire"], col3: ["Braced Frame"], col4: ["Hot Swap"] },
  "Techuen Rage": [
    { source: 'TRUEGaming', col1: ["SureShot IS", "Reflex"], col2: ["Hidden Hand"], col3: ["Braced Frame", "Rifled Barrel"], col4: ["Rangefinder"] },
    { source: 'Reddit',     col1: ["SureShot IS", "Reflex"], col2: ["Danger Close"], col3: ["Rifled Barrel"], col4: ["Rangefinder"] },
  ],
  "Thesan FR4": [
    { source: 'TRUEGaming', col1: ["Torch HS2"], col2: ["Hot Swap"], col3: ["Braced Frame", "Accelerated Coils"], col4: ["Rangefinder"] },
    { source: 'Reddit',     col1: ["Torch HS2"], col2: ["Hot Swap"], col3: ["Quickdraw"], col4: ["Rangefinder"] },
  ],
  "The Vacancy": [
    { source: 'TRUEGaming', col1: ["Torch HS2"], col2: ["Hot Swap"], col3: ["Braced Frame"], col4: ["Rangefinder"] },
    { source: 'Reddit',     col1: ["Torch HS2"], col2: ["Hot Swap"], col3: ["Quickdraw"], col4: ["Rangefinder"] },
  ],
  "The Vortex": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["Hip Fire"], col3: ["Braced Frame"], col4: ["Hot Swap", "Hotswap"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Danger Close"], col3: ["Rifled Barrel"], col4: ["Rangefinder"] },
  ],
  "The Waiting": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["Accelerated Coils"], col3: ["Perfect Balance", "Kneepads"], col4: ["Rangefinder"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Quickdraw"], col3: ["Hammer Forged"], col4: ["Rangefinder"] },
  ],
  "Worlds to Come 001": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["Snapshot"], col3: ["Hammer Forged"], col4: ["Hidden Hand"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Snapshot"], col3: ["Hammer Forged"], col4: ["Rangefinder"] },
  ],

  // Sidearms
  "Anton's Rule":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Zen Moment"], col3: ["Hand Loaded"], col4: ["Rangefinder", "Hidden Hand"] },
  "The Binding Blaze":     { source: 'TRUEGaming + Reddit', col1: ["Iron Lordly Sights"], col2: ["Hand Loaded", "Fitted Stock"], col3: ["High Caliber Rounds"], col4: ["Rangefinder", "Hidden Hand", "Zen Moment"] },
  "Conviction II":         { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Zen Moment"], col3: ["Hot Swap"], col4: ["High Caliber Rounds"] },
  "Crow's Eye":            { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Hand Loaded"], col3: ["High Caliber Rounds"], col4: ["Rangefinder"] },
  "Havoc Pigeon":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Zen Moment"], col3: ["Hot Swap"], col4: ["High Caliber Rounds"] },
  "Impeacher V":           { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["High Caliber Rounds", "Quickdraw"], col3: ["Hand Loaded"], col4: ["Rangefinder", "Hidden Hand"] },
  "Ironwreath-D":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Zen Moment"], col3: ["Hot Swap"], col4: ["High Caliber Rounds"] },
  "JabberHakke-D":         { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Zen Moment"], col3: ["Hot Swap"], col4: ["High Caliber Rounds"] },
  "Teacup Tempest":        { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Zen Moment"], col3: ["High Caliber Rounds"], col4: ["Rangefinder"] },
  "Queen's Choice":        { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Rangefinder", "Zen Moment"], col3: ["High Caliber Rounds"], col4: ["Hot Swap"] },
  "The Wormwood":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["High Caliber Rounds", "Quickdraw"], col3: ["Hand Loaded"], col4: ["Rangefinder", "Hidden Hand"] },

  // Machine Guns
  "Bane of the Taken":     { source: 'TRUEGaming + Reddit', col1: ["Smooth Ballistics"], col2: ["Counterbalance"], col3: ["Perfect Balance"], col4: ["Hidden Hand"] },
  "Baron's Ambition":      { source: 'TRUEGaming + Reddit', col1: ["Accurized Ballistics", "Linear Compensator"], col2: ["Counterbalance", "Life Support"], col3: ["Perfect Balance"], col4: ["Hidden Hand"] },
  "Bonekruscher":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Feeding Frenzy"], col3: ["Quickdraw", "Hand-laid Stock"], col4: ["Crowd Control"] },
  "Bretomart's Stand":     { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Hip Fire"], col3: ["Rifled Barrel"], col4: ["Hidden Hand"] },
  "Chaotic Neutral":       { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Hip Fire"], col3: ["Rifled Barrel"], col4: ["Hidden Hand"] },
  "Diluvian 10/4X":        { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Hip Fire"], col3: ["Braced Frame"], col4: ["Persistence"] },
  "First Citizen IX":      { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Hip Fire"], col3: ["Perfect Balance"], col4: ["Persistence"] },
  "Ruin Wake":             { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Hip Fire"], col3: ["Rifled Barrel"], col4: ["Hidden Hand"] },
  "Objection IV":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Hip Fire"], col3: ["Rifled Barrel"], col4: ["Hidden Hand"] },
  "The Silvered Dread":    { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Perfect Balance"], col3: ["Field Scout"], col4: ["Hidden Hand"] },
  "The Swarm":             { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Life Support"], col3: ["Rifled Barrel"], col4: ["Rangefinder"] },
  "Unending Deluge III":   { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Counterbalance"], col3: ["Perfect Balance"], col4: ["Rangefinder"] },
  "The Variable":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Hip Fire"], col3: ["Braced Frame"], col4: ["Persistence"] },
  "Zombie Apocalypse WF47":{ source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Life Support", "Counterbalance"], col3: ["Perfect Balance"], col4: ["Hidden Hand"] },

  // Rocket Launchers
  "The Ash Factory":       { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Tripod"], col3: ["Javelin"], col4: ["Grenades and Horseshoes"] },
  "Disassembly Required":  { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Battle Runner"], col3: ["Javelin"], col4: ["Grenades and Horseshoes"] },
  "The Nightmare":         { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Tripod"], col3: ["Field Scout"], col4: ["Grenades and Horseshoes"] },
  "Something Wicked":      { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Battle Runner"], col3: ["Heavy Payload"], col4: ["Grenades and Horseshoes"] },
  "SUROS JLB-42":          { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Heavy Payload"], col3: ["Grenades and Horseshoes"], col4: ["Javelin"] },
  "SUROS JLB-47":          { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Heavy Payload"], col3: ["Grenades and Horseshoes"], col4: ["Javelin"] },
  "Steel Oracle Z-11":     { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Tripod"], col3: ["Field Scout"], col4: ["Grenades and Horseshoes"] },
  "The Titanium Orchid":   { source: 'TRUEGaming + Reddit', col1: ["Hard Launch", "Aggressive Launch"], col2: ["Heavy Payload"], col3: ["Speed Reload", "Flared Magwell"], col4: ["Grenades and Horseshoes"] },
  "Tormod's Bellows":      { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Tripod"], col3: ["Heavy Payload"], col4: ["Grenades and Horseshoes"] },
  "Unto Dust 00":          { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Field Scout"], col3: ["Heavy Payload"], col4: ["Grenades and Horseshoes"] },
  "The Vertigo":           { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Heavy Payload"], col3: ["Grenades and Horseshoes"], col4: ["Javelin"] },
  "The Warpath":           { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Field Scout"], col3: ["Javelin"], col4: ["Grenades and Horseshoes"] },
};

const PVE_BASE = {
  // Scout Rifles
  "Angel's Advocate": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["Outlaw"], col3: ["High Caliber Rounds"], col4: ["Firefly"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Outlaw"], col3: ["Explosive Rounds"], col4: ["Firefly"] },
  ],
  "Badger CCL": [
    { source: 'TRUEGaming', col1: ["Red Dot-OAS"], col2: ["Triple Tap"], col3: ["Field Scout"], col4: ["Army of One"] },
    { source: 'Reddit',     col1: ["Red Dot-OAS"], col2: ["Triple Tap"], col3: ["Explosive Rounds"], col4: ["Army of One"] },
  ],
  "Burning Eye":           { source: 'TRUEGaming', col1: ["Accurized Ballistics"], col2: ["Smallbore"], col3: ["Explosive Rounds"], col4: ["Third Eye", "Zen Moment"] },
  "Cocytus SR4":           { source: 'TRUEGaming + Reddit', col1: ["Torch HS2"], col2: ["Triple Tap"], col3: ["Extended Mag"], col4: ["Firefly"] },
  "Colovance's Duty":      { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Triple Tap"], col3: ["Field Scout"], col4: ["Firefly"] },
  "Cryptic Dragon": [
    { source: 'TRUEGaming', col1: ["Red Dot-OAS"], col2: ["Triple Tap"], col3: ["High Caliber Rounds"], col4: ["Firefly"] },
    { source: 'Reddit',     col1: ["Red Dot-OAS"], col2: ["Triple Tap"], col3: ["Explosive Rounds"], col4: ["Firefly"] },
  ],
  "The Distant Star":      { source: 'TRUEGaming + Reddit', col1: ["Iron Ranged Scope"], col2: ["Triple Tap"], col3: ["Perfect Balance"], col4: ["Extended Mag"] },
  "Hand of Judgement":     { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Perfect Balance"], col3: ["Explosive Rounds"], col4: ["Firefly"] },
  "The Hero Formula": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["Outlaw"], col3: ["High Caliber Rounds"], col4: ["Firefly"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Outlaw"], col3: ["Explosive Rounds"], col4: ["Firefly"] },
  ],
  "Keystone 01":           { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Triple Tap"], col3: ["Extended Mag"], col4: ["Firefly"] },
  "Lethe Noblesse": [
    { source: 'TRUEGaming', col1: ["Reflex"], col2: ["Triple Tap"], col3: ["High Caliber Rounds"], col4: ["Army of One"] },
    { source: 'Reddit',     col1: ["Reflex"], col2: ["Triple Tap"], col3: ["Explosive Rounds"], col4: ["Army of One"] },
  ],
  "NL Shadow 701X":        { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Triple Tap"], col3: ["Field Scout"], col4: ["Army of One"] },
  "Not Like the Others":   { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Triple Tap"], col3: ["Perfect Balance"], col4: ["Firefly"] },
  "The Saterienne Rapier": { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Triple Tap"], col3: ["Field Scout"], col4: ["Army of One"] },
  "SUROS DIS-43":          { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance"], col3: ["Spray and Play"], col4: ["Speed Reload"] },
  "SUROS DIS-47":          { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance"], col3: ["Spray and Play"], col4: ["Speed Reload"] },
  "Treads Upon Stars":     { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Triple Tap"], col3: ["Field Scout"], col4: ["Army of One"] },
  "Tuonela SR4":           { source: 'TRUEGaming + Reddit', col1: ["Torch HS2"], col2: ["Triple Tap"], col3: ["Extended Mag"], col4: ["Firefly"] },
  "The Wounded":           { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Triple Tap"], col3: ["Extended Mag"], col4: ["Firefly"] },

  // Pulse Rifles
  "Aegis of the Reef":     { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS", "SureShot IS"], col2: ["Perfect Balance"], col3: ["High Caliber Rounds"], col4: ["Counterbalance"] },
  "Apple of Discord":      { source: 'TRUEGaming + Reddit', col1: ["SC Holo"], col2: ["Headseeker"], col3: ["Counterbalance"], col4: ["Hand-laid Stock"] },
  "Blind Perdition":       { source: 'TRUEGaming', col1: ["Smooth Ballistics", "Smart Drift Control"], col2: ["Hand-laid Stock", "Smallbore"], col3: ["High Caliber Rounds", "Hand Loaded"], col4: ["Outlaw", "Counterbalance"] },
  "B-29 Party Favor":      { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Feeding Frenzy"], col3: ["Perfect Balance"], col4: ["Headseeker"] },
  "The Clever Dragon":     { source: 'TRUEGaming + Reddit', col1: ["Iron Red Dot"], col2: ["Smallbore"], col3: ["High Caliber Rounds"], col4: ["Counterbalance"] },
  "Final Duty":            { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Counterbalance"], col3: ["Braced Frame"], col4: ["Feeding Frenzy"] },
  "Grasp of Malok":        { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Counterbalance"], col3: ["Braced Frame", "Smallbore", "Perfect Balance"], col4: ["Feeding Frenzy"] },
  "Hawksaw":               { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance"], col3: ["Counterbalance"], col4: ["Rifled Barrel"] },
  "Herja-D":               { source: 'TRUEGaming + Reddit', col1: ["SC Holo"], col2: ["Headseeker"], col3: ["Counterbalance"], col4: ["Hand-laid Stock"] },
  "Hopscotch Pilgrim":     { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Headseeker"], col3: ["Perfect Balance"], col4: ["Feeding Frenzy"] },
  "Lyudmila-D":            { source: 'TRUEGaming + Reddit', col1: ["SC Holo"], col2: ["Headseeker"], col3: ["Counterbalance"], col4: ["Hand-laid Stock"] },
  "Nirwen's Mercy":        { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Counterbalance"], col3: ["Braced Frame"], col4: ["Feeding Frenzy"] },
  "Parthian Shot":         { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Feeding Frenzy"], col3: ["Hand-laid Stock"], col4: ["Headseeker"] },
  "Spare Change .25":      { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Counterbalance"], col3: ["Braced Frame"], col4: ["Feeding Frenzy"] },
  "SUROS PDX-41":          { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance"], col3: ["Counterbalance"], col4: ["Rifled Barrel", "Smallbore"] },
  "SUROS PDX-45":          { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance"], col3: ["Counterbalance"], col4: ["Rifled Barrel", "Smallbore"] },
  "The Villainy":          { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Counterbalance"], col3: ["Braced Frame"], col4: ["Feeding Frenzy"] },
  "The Waltz":             { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Feeding Frenzy"], col3: ["High Caliber Rounds"], col4: ["Headseeker"] },

  // Hand Cannons
  "Byronic Hero":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Spray and Play"], col3: ["Extended Mag"], col4: ["Luck in the Chamber"] },
  "The Devil You Know":    { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Outlaw"], col3: ["Explosive Rounds"], col4: ["Luck in the Chamber"] },
  "Down and Doubt 00-0":   { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Luck in the Chamber"], col3: ["Extended Mag"], col4: ["Firefly"] },
  "Eyasluna":              { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Spray and Play"], col3: ["Extended Mag"], col4: ["Army of One"] },
  "Finnala's Peril":       { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Spray and Play"], col3: ["Extended Mag"], col4: ["Army of One"] },
  "Free Will III":         { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Outlaw"], col3: ["Explosive Rounds"], col4: ["Firefly"] },
  "Gaheris-D":             { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Army of One"], col3: ["Spray and Play"], col4: ["Speed Reload"] },
  "Her Revenge":           { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Spray and Play"], col3: ["Extended Mag"], col4: ["Army of One"] },
  "How Dare You":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Spray and Play"], col3: ["High Caliber Rounds"], col4: ["Luck in the Chamber"] },
  "Ill Will":              { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Outlaw"], col3: ["Extended Mag"], col4: ["Luck in the Chamber"] },
  "Imago Loop (Fatebringer Roll)": { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Outlaw"], col3: ["Explosive Rounds"], col4: ["Firefly"] },
  "Judith-D":              { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Army of One"], col3: ["Spray and Play"], col4: ["Speed Reload"] },
  "Kumakatok HC-4":        { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Luck in the Chamber"], col3: ["Extended Mag"], col4: ["Firefly"] },
  "The Lingering Song":    { source: 'TRUEGaming + Reddit', col1: ["Iron Lordly Sights"], col2: ["Firefly"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["High Caliber Rounds"] },
  "Lord High Fixer":       { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Outlaw"], col3: ["Explosive Rounds"], col4: ["Luck in the Chamber"] },
  "The Palindrome":        { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Spray and Play"], col3: ["High Caliber Rounds"], col4: ["Luck in the Chamber"] },
  "The Revelator":         { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Spray and Play"], col3: ["Extended Mag"], col4: ["Army of One"] },
  "Stolen Pride":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Spray and Play"], col3: ["Extended Mag"], col4: ["High Caliber Rounds"] },
  "The Vanity":            { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Luck in the Chamber"], col3: ["Extended Mag"], col4: ["Firefly"] },
  "Uffern HC4":            { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Luck in the Chamber"], col3: ["Extended Mag"], col4: ["Firefly"] },
  "The Wail":              { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Outlaw"], col3: ["Explosive Rounds"], col4: ["Firefly"] },

  // Auto Rifles
  "An Answering Chord":    { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["Perfect Balance"], col3: ["Reinforced Barrel"], col4: ["Spray and Play"] },
  "Antipodal Hindsight":   { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Speed Reload"], col4: ["Army of One"] },
  "Arminius-D":            { source: 'TRUEGaming + Reddit', col1: ["SC Holo"], col2: ["Crowd Control"], col3: ["Counterbalance"], col4: ["High Caliber Rounds"] },
  "Assembly II":           { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Extended Mag"], col3: ["Crowd Control"], col4: ["Counterbalance"] },
  "The Continental":       { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Rifled Barrel"], col4: ["Persistence"] },
  "The Dealbreaker":       { source: 'TRUEGaming + Reddit', col1: ["SC Holo"], col2: ["Crowd Control"], col3: ["Spray and Play"], col4: ["Rifled Barrel"] },
  "Doctrine of Passing":   { source: 'TRUEGaming', col1: ["FastDraw IS"], col2: ["Persistence"], col3: ["Braced Frame"], col4: ["Counterbalance"] },
  "Does Not Bow":          { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Spray and Play"], col3: ["Perfect Balance"], col4: ["Army of One"] },
  "Extremophile 011":      { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Extended Mag"], col3: ["Spray and Play"], col4: ["Persistence"] },
  "Grim Citizen III":      { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Crowd Control"], col3: ["Perfect Balance"], col4: ["Army of One"] },
  "Haakon's Hatchet":      { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Crowd Control"], col3: ["Perfect Balance"], col4: ["Army of One"] },
  "Her Memory":            { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Perfect Balance"], col4: ["Army of One"] },
  "Hex Caster ARC":        { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Rangefinder"], col3: ["Perfect Balance"], col4: ["Spray and Play"] },
  "Paleocontact JPK-43":   { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Crowd Control"], col3: ["Perfect Balance"], col4: ["Army of One"] },
  "Red Spectre":           { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Crowd Control"], col3: ["Perfect Balance"], col4: ["Army of One"] },
  "Shadow Price":          { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Crowd Control"], col3: ["Perfect Balance"], col4: ["Army of One"] },
  "Soulstealer's Claw":    { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Perfect Balance"], col3: ["Single Point Sling"], col4: ["Spray and Play"] },
  "SUROS ARI-41":          { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["High Caliber Rounds"], col3: ["Rifled Barrel"], col4: ["Spray and Play"] },
  "SUROS ARI-45":          { source: 'TRUEGaming + Reddit', col1: ["SPO-28"], col2: ["High Caliber Rounds"], col3: ["Rifled Barrel"], col4: ["Spray and Play"] },
  "The Unbent Tree":       { source: 'TRUEGaming + Reddit', col1: ["Iron Ranged Scope"], col2: ["Perfect Balance"], col3: ["Appended Mag"], col4: ["Counterbalance"] },
  "Vision Stone":          { source: 'TRUEGaming + Reddit', col1: ["Smart Drift Control"], col2: ["Injection Mold"], col3: ["Hand Loaded"], col4: ["Crowd Control"] },
  "Zarinaea-D":            { source: 'TRUEGaming + Reddit', col1: ["SC Holo"], col2: ["Crowd Control"], col3: ["Spray and Play"], col4: ["Rifled Barrel"] },
  "Zero-Day Dilemma":      { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Perfect Balance"], col4: ["Counterbalance"] },

  // Sniper Rifles
  "1000 Yard Stare":       { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Triple Tap"], col3: ["Casket Mag"], col4: ["Spray and Play"] },
  "20/20 AMR7":            { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Unflinching"], col3: ["Skip Rounds"], col4: ["Firefly"] },
  "Antinomy XVI":          { source: 'TRUEGaming + Reddit', col1: ["ATA Scout"], col2: ["Surplus"], col3: ["Spray and Play"], col4: ["Appended Magazine"] },
  "Aoife Rua-D":           { source: 'TRUEGaming + Reddit', col1: ["ATA Scout"], col2: ["Surplus"], col3: ["Spray and Play"], col4: ["Appended Magazine"] },
  "Bitter Edge 010":       { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Skip Rounds"], col3: ["Triple Tap"], col4: ["Firefly"] },
  "But Not Forgotten":     { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Perfect Balance"], col3: ["Explosive Rounds"], col4: ["Triple Tap"] },
  "Deposition VII":        { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Skip Rounds"], col3: ["Triple Tap"], col4: ["Firefly"] },
  "Devil's Dawn":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Life Support"], col3: ["Quickdraw"], col4: ["Firefly"] },
  "Eirene RR4":            { source: 'TRUEGaming + Reddit', col1: ["Faucon SS1"], col2: ["Triple Tap"], col3: ["Casket Mag"], col4: ["Clown Cartridge"] },
  "Event Horizon": [
    { source: 'TRUEGaming', col1: ["ShortGaze SLH10"], col2: ["Triple Tap"], col3: ["Casket Mag"], col4: ["Unflinching"] },
    { source: 'Reddit',     col1: ["ShortGaze SLH10"], col2: ["Triple Tap"], col3: ["Casket Mag"], col4: ["Firefly"] },
  ],
  "Extrasolar RR4":        { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Triple Tap"], col3: ["Casket Mag"], col4: ["Spray and Play", "Firefly"] },
  "Her Fury":              { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Triple Tap"], col3: ["Casket Mag"], col4: ["Spray and Play"] },
  "The Laughing Heart":    { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Injection Mold"], col3: ["Explosive Rounds"], col4: ["Triple Tap"] },
  "LDR 5001":              { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Triple Tap"], col3: ["Hand-laid Stock"], col4: ["Firefly"] },
  "Seventh Sense":         { source: 'TRUEGaming + Reddit', col1: ["ViewTac SLH20", "Ambush SLH25"], col2: ["Triple Tap"], col3: ["Casket Mag"], col4: ["Firefly"] },
  "Tamar-D":               { source: 'TRUEGaming + Reddit', col1: ["ATA Scout"], col2: ["Surplus"], col3: ["Spray and Play"], col4: ["Appended Magazine"] },
  "Tao Hua Yuan":          { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Triple Tap"], col3: ["Casket Mag"], col4: ["Spray and Play"] },
  "Uzume RR4":             { source: 'TRUEGaming + Reddit', col1: ["Faucon SS1"], col2: ["Triple Tap"], col3: ["Casket Mag"], col4: ["Clown Cartridge"] },
  "Weyloran's March":      { source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Triple Tap"], col3: ["Casket Mag"], col4: ["Spray and Play"] },
  "Y-09 Longbow Synthesis":{ source: 'TRUEGaming + Reddit', col1: ["ShortGaze SLH10"], col2: ["Triple Tap"], col3: ["Casket Mag"], col4: ["Firefly"] },

  // Shotguns
  "44 Curtain Call":       { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Army of One"], col3: ["Rifled Barrel"], col4: ["Crowd Control"] },
  "Bad Counsel IV":        { source: 'TRUEGaming + Reddit', col1: ["Aggressive Ballistics"], col2: ["Hammer Forged"], col3: ["Extended Mag"], col4: ["Crowd Control"] },
  "Burden of Proof XI":    { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Army of One"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Performance Bonus"] },
  "The Comedian":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Crowd Control"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Performance Bonus"] },
  "Conspiracy Theory-D":   { source: 'TRUEGaming + Reddit', col1: ["Field Choke"], col2: ["Army of One"], col3: ["Rifled Barrel"], col4: ["Performance Bonus"] },
  "Her Champion":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Army of One"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Crowd Control"] },
  "Jingukogo-D":           { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Army of One"] },
  "Last-Ditch 001":        { source: 'TRUEGaming + Reddit', col1: ["CQB Ballistics"], col2: ["Rangefinder"], col3: ["Close and/or Personal", "Close and Personal"], col4: ["Extended Mag"] },
  "Matador 64":            { source: 'TRUEGaming + Reddit', col1: ["Aggressive Ballistics"], col2: ["Performance Bonus"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Crowd Control"] },
  "The Next Big Thing":    { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Spray and Play"], col3: ["Rifled Barrel"], col4: ["Army of One"] },
  "Occam's Razor":         { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Army of One"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Crowd Control"] },
  "Patch-A":               { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Spray and Play"], col3: ["Rifled Barrel"], col4: ["Army of One"] },
  "Party Crasher +1":      { source: 'TRUEGaming + Reddit', col1: ["Aggressive Ballistics"], col2: ["Army of One"], col3: ["Rifled Barrel"], col4: ["Performance Bonus"] },
  "The Proud Spire":       { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Army of One"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Performance Bonus"] },
  "Stolen Will":           { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Army of One"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Performance Bonus"] },
  "Strongbow-D":           { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Rangefinder"], col3: ["Rifled Barrel"], col4: ["Army of One"] },
  "Two to the Morgue":     { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Army of One"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Performance Bonus"] },
  "Unraveling Thread":     { source: 'TRUEGaming + Reddit', col1: ["CQB Ballistics"], col2: ["Hammer Forged"], col3: ["Hand Loaded"], col4: ["Rangefinder"] },
  "Winter's End":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Appended Mag"], col3: ["Reinforced Barrel", "Rifled Barrel"], col4: ["Army of One"] },

  // Fusion Rifles
  "77 Wizard":             { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Grenadier"] },
  "Ashraven's Flight":     { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Army of One"] },
  "The Branded Lord":      { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Enhanced Battery"], col3: ["Reinforced Barrel"], col4: ["Life Support"] },
  "Darkblade's Spite":     { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Army of One"], col3: ["Enhanced Battery"], col4: ["Spray and Play"] },
  "Each New Day":          { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Rangefinder"] },
  "Ex Astris":             { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Rangefinder"] },
  "Hitchhiker FR4":        { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Army of One"] },
  "Long Far Gone":         { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Army of One"] },
  "Phanta Rei":            { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Army of One"] },
  "Saladin's Vigil":       { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Enhanced Battery"], col3: ["Reinforced Barrel"], col4: ["Life Support"] },
  "Split Shifter Pro":     { source: 'TRUEGaming + Reddit', col1: ["Red Dot-OAS"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Army of One"] },
  "Techuen Rage":          { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Army of One"] },
  "Thesan FR4":            { source: 'TRUEGaming + Reddit', col1: ["Torch HS2"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Army of One"] },
  "The Vacancy":           { source: 'TRUEGaming + Reddit', col1: ["Torch HS2"], col2: ["Army of One"], col3: ["Enhanced Battery"], col4: ["Life Support"] },
  "The Vortex":            { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Army of One"] },
  "The Waiting":           { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Rangefinder"] },
  "Worlds to Come 001":    { source: 'TRUEGaming + Reddit', col1: ["Reflex"], col2: ["Spray and Play"], col3: ["Enhanced Battery"], col4: ["Rangefinder"] },

  // Sidearms
  "Anton's Rule":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Zen Moment"], col3: ["Hand Loaded"], col4: ["Rangefinder", "Hidden Hand"] },
  "The Binding Blaze":     { source: 'TRUEGaming + Reddit', col1: ["Iron Lordly Sights"], col2: ["Hand Loaded", "Fitted Stock"], col3: ["High Caliber Rounds"], col4: ["Rangefinder", "Hidden Hand", "Zen Moment"] },
  "Conviction II":         { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Zen Moment"], col3: ["Hot Swap"], col4: ["High Caliber Rounds"] },
  "Crow's Eye":            { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Hand Loaded"], col3: ["High Caliber Rounds"], col4: ["Rangefinder"] },
  "Havoc Pigeon":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Zen Moment"], col3: ["Hot Swap"], col4: ["High Caliber Rounds"] },
  "Impeacher V":           { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["High Caliber Rounds", "Quickdraw"], col3: ["Hand Loaded"], col4: ["Rangefinder", "Hidden Hand"] },
  "Ironwreath-D":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Zen Moment"], col3: ["Hot Swap"], col4: ["High Caliber Rounds"] },
  "JabberHakke-D":         { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Zen Moment"], col3: ["Hot Swap"], col4: ["High Caliber Rounds"] },
  "Teacup Tempest":        { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["Zen Moment"], col3: ["High Caliber Rounds"], col4: ["Rangefinder"] },
  "Queen's Choice":        { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Rangefinder", "Zen Moment"], col3: ["High Caliber Rounds"], col4: ["Hot Swap"] },
  "The Wormwood":          { source: 'TRUEGaming + Reddit', col1: ["SureShot IS", "TrueSight IS"], col2: ["High Caliber Rounds", "Quickdraw"], col3: ["Hand Loaded"], col4: ["Rangefinder", "Hidden Hand"] },

  // Machine Guns
  "Bane of the Taken":     { source: 'TRUEGaming + Reddit', col1: ["Smooth Ballistics"], col2: ["Spray and Play"], col3: ["High Caliber Rounds"], col4: ["Feeding Frenzy"] },
  "Baron's Ambition":      { source: 'TRUEGaming + Reddit', col1: ["Accurized Ballistics", "Linear Compensator"], col2: ["Spray and Play"], col3: ["High Caliber Rounds"], col4: ["Feeding Frenzy"] },
  "Bonekruscher":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Feeding Frenzy"], col3: ["Perfect Balance"], col4: ["Crowd Control"] },
  "Bretomart's Stand":     { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Spray and Play"], col3: ["High Caliber Rounds"], col4: ["Feeding Frenzy"] },
  "Chaotic Neutral":       { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Feeding Frenzy"], col3: ["Perfect Balance"], col4: ["Crowd Control"] },
  "Diluvian 10/4X":        { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Spray and Play"], col3: ["High Caliber Rounds"], col4: ["Feeding Frenzy"] },
  "First Citizen IX":      { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Feeding Frenzy"], col3: ["High Caliber Rounds"], col4: ["Persistence"] },
  "Ruin Wake":             { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Spray and Play"], col3: ["High Caliber Rounds"], col4: ["Feeding Frenzy"] },
  "Objection IV":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Spray and Play"], col3: ["High Caliber Rounds"], col4: ["Feeding Frenzy"] },
  "The Silvered Dread":    { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Spray and Play"], col3: ["Extended Mag"], col4: ["Perfect Balance"] },
  "The Swarm":             { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Spray and Play"], col3: ["High Caliber Rounds"], col4: ["Feeding Frenzy"] },
  "Unending Deluge III":   { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Spray and Play"], col3: ["High Caliber Rounds"], col4: ["Persistence"] },
  "The Variable":          { source: 'TRUEGaming + Reddit', col1: ["Linear Compensator"], col2: ["Spray and Play"], col3: ["High Caliber Rounds"], col4: ["Feeding Frenzy"] },
  "Zombie Apocalypse WF47":{ source: 'TRUEGaming + Reddit', col1: ["Linear Compensator", "Accurized Ballistics", "Field Choke"], col2: ["Spray and Play"], col3: ["High Caliber Rounds"], col4: ["Feeding Frenzy"] },

  // Rocket Launchers
  "The Ash Factory":       { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Tripod"], col3: ["Javelin"], col4: ["Grenades and Horseshoes", "Tracking"] },
  "Disassembly Required":  { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Heavy Payload"], col3: ["Javelin"], col4: ["Grenades and Horseshoes", "Tracking"] },
  "The Nightmare":         { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Tripod"], col3: ["Field Scout"], col4: ["Grenades and Horseshoes", "Tracking"] },
  "Something Wicked": [
    { source: 'TRUEGaming', col1: ["Soft Launch"], col2: ["Grenadier", "Last Resort"], col3: ["Field Scout"], col4: ["Cluster Bomb"] },
    { source: 'Reddit',     col1: ["Warhead Verniers", "Hard Launch"], col2: ["Battle Runner"], col3: ["Heavy Payload"], col4: ["Grenades and Horseshoes", "Tracking"] },
  ],
  "SUROS JLB-42":          { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Heavy Payload"], col3: ["Grenades and Horseshoes", "Tracking"], col4: ["Javelin"] },
  "SUROS JLB-47":          { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Heavy Payload"], col3: ["Grenades and Horseshoes", "Tracking"], col4: ["Javelin"] },
  "Steel Oracle Z-11":     { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Tripod"], col3: ["Field Scout"], col4: ["Grenades and Horseshoes", "Tracking"] },
  "The Titanium Orchid":   { source: 'TRUEGaming + Reddit', col1: ["Hard Launch", "Aggressive Launch"], col2: ["Heavy Payload"], col3: ["Speed Reload", "Flared Magwell"], col4: ["Grenades and Horseshoes", "Tracking"] },
  "Tormod's Bellows":      { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Tripod"], col3: ["Heavy Payload"], col4: ["Grenades and Horseshoes", "Tracking"] },
  "Unto Dust 00":          { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Field Scout"], col3: ["Heavy Payload"], col4: ["Grenades and Horseshoes", "Tracking"] },
  "The Vertigo":           { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Heavy Payload"], col3: ["Grenades and Horseshoes", "Tracking"], col4: ["Javelin"] },
  "The Warpath":           { source: 'TRUEGaming + Reddit', col1: ["Warhead Verniers", "Hard Launch"], col2: ["Field Scout"], col3: ["Javelin"], col4: ["Grenades and Horseshoes", "Tracking"] },
};

export const PVE = mergeLCD(PVE_BASE, LCD_PVE);
