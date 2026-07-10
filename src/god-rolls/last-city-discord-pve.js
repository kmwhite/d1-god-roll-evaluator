/**
 * god-rolls-lcd.js
 * God roll definitions sourced from the Last City Discord (PvE only).
 * Source: https://discord.com/invite/SrmZdmt
 *
 * Column mapping used for this source:
 *   col1 — Stability / Barrel (first perk column)
 *   col2 — Range / Magazine (second perk column)
 *   col3 — Damage perks
 *   col4 — Utility + Specialized / required perks
 *
 * Merged into the main PVE export by god-rolls.js at module load time.
 */

const S = 'Last City Discord';
const U = 'https://discord.com/invite/SrmZdmt';

// ---- Archetype roll templates ------------------------------------------------

// AUTO RIFLES — Low Impact
// Specialized Perks: Focused Fire OR Persistence (either required)
const AR_LOW = { source: S, sourceUrl: U,
  col1: ['Perfect Balance', 'Counterbalance', 'Rodeo'],
  col2: ['Rangefinder', 'Rifled Barrel'],
  col3: ['Crowd Control', 'Glass Half Full'],
  col4: ['Army of One', 'Grenadier', 'Hidden Hand', 'Focused Fire', 'Persistence'] };

// AUTO RIFLES — Mid and High Impact
// Specialized Perk: Focused Fire only
const AR_MH = { source: S, sourceUrl: U,
  col1: ['Perfect Balance', 'Counterbalance', 'Rodeo'],
  col2: ['Rangefinder', 'Rifled Barrel'],
  col3: ['Crowd Control', 'Glass Half Full'],
  col4: ['Army of One', 'Grenadier', 'Hidden Hand', 'Focused Fire'] };

// PULSE RIFLES — Low and Mid Impact
const PL_LM = { source: S, sourceUrl: U,
  col1: ['Perfect Balance', 'Counterbalance', 'Rodeo'],
  col2: ['Rangefinder', 'Rifled Barrel'],
  col3: ['Crowd Control', 'Glass Half Full'],
  col4: ['Zen Moment'] };

// PULSE RIFLES — High Impact (adds Headseeker to Damage column)
const PL_HI = { source: S, sourceUrl: U,
  col1: ['Perfect Balance', 'Counterbalance', 'Rodeo'],
  col2: ['Rangefinder', 'Rifled Barrel'],
  col3: ['Crowd Control', 'Glass Half Full', 'Headseeker'],
  col4: ['Zen Moment'] };

// PULSE RIFLES — Hakke 4-Shot (Mid and High)
// col4 = Headseeker acts as the rare bonus column; 3/4 without it is still close
const HAKKE = { source: S, sourceUrl: U,
  col1: ['Perfect Balance', 'Counterbalance', 'Rodeo'],
  col2: ['Rangefinder', 'Rifled Barrel', 'Reinforced Barrel'],
  col3: ['Crowd Control', 'Glass Half Full'],
  col4: ['Headseeker'] };

// SCOUT RIFLES — Mid Impact
// col1 = Explosive Rounds (Specialized, REQUIRED); col2 = Triple Tap (key utility)
const SC_MID = { source: S, sourceUrl: U,
  col1: ['Explosive Rounds'],
  col2: ['Triple Tap'],
  col3: ['Crowd Control', 'Reactive Reload'],
  col4: ['Army of One', 'Grenadier', 'Life Support'] };

// SCOUT RIFLES — High Impact (Reactive Reload absent from Damage section)
const SC_HI = { source: S, sourceUrl: U,
  col1: ['Explosive Rounds'],
  col2: ['Triple Tap'],
  col3: ['Crowd Control'],
  col4: ['Army of One', 'Grenadier', 'Life Support'] };

// HAND CANNONS — Mid and High Impact
// col1 = Explosive Rounds (REQUIRED for PvE)
const HC_MH = { source: S, sourceUrl: U,
  col1: ['Explosive Rounds'],
  col2: ['Rangefinder', 'Rifled Barrel'],
  col3: ['Crowd Control', 'Final Round', 'Luck In the Chamber', 'Reactive Reload'],
  col4: ['Army of One', 'Grenadier', 'Spray and Play', 'Hidden Hand', 'Outlaw', 'Feeding Frenzy'] };

// SHOTGUNS — All Archetypes
const SG_ALL = { source: S, sourceUrl: U,
  col1: ['Aggressive Ballistics', 'Accurized Ballistics', 'Field Choke', 'Linear Compensator'],
  col2: ['Oiled Frame', 'Flared Magwell', 'Speed Reload'],
  col3: ['Final Round'],
  col4: ['Full Auto'] };

// SHOTGUNS — No-reload-perk variant (Found Verdict: static roll, use Single Point Sling)
const SG_NO_RELOAD = { ...SG_ALL, col2: ['Single Point Sling'] };

// SHOTGUNS — Matador 64 (cannot roll Reload perk)
const SG_MATADOR = { ...SG_ALL, col2: ['Single Point Sling', 'Quickdraw'] };

// SNIPER RIFLES — All Impacts
// col4 = Luck In the Chamber (rare bonus; 3/4 without it is close, 4/4 with it is god roll)
const SNP = { source: S, sourceUrl: U,
  col1: ['Triple Tap'],
  col2: ['Casket Mag', 'Clown Cartridge'],
  col3: ['Unflinching', 'Spray and Play'],
  col4: ['Luck In the Chamber'] };

// FUSION RIFLES — Mid and High Impact
const FR_MH = { source: S, sourceUrl: U,
  col1: ['Enhanced Battery', 'Accelerated Coils'],
  col2: ['Casket Mag'],
  col3: ['Perfect Balance', 'Counterbalance', 'Rangefinder', 'Hammer Forged'],
  col4: ['Army of One', 'Spray and Play', 'Eye of the Storm', 'Life Support'] };

// ROCKET LAUNCHERS — All Archetypes
const RL_ALL = { source: S, sourceUrl: U,
  col1: ['Aggressive Launch', 'Linear Compensator', 'Hard Launch', 'Warhead Verniers'],
  col2: ['Field Scout', 'Tripod'],
  col3: ['Cluster Bomb'],
  col4: ['Speed Reload', 'Flared Magwell', 'Spray and Play'] };

// ROCKET LAUNCHERS — Surplus strat variant (Suros JLBs)
const RL_SURPLUS = { ...RL_ALL, col4: ['Surplus'] };

// ROCKET LAUNCHERS — Disciplinarian variant (Choleric Dragon, WotM-specific)
const RL_DISCIP  = { ...RL_ALL, col4: ['Disciplinarian'] };

// MACHINE GUNS — Low Impact
const MG_LO = { source: S, sourceUrl: U,
  col1: ['Aggressive Ballistics', 'Accurized Ballistics', 'Field Choke', 'Linear Compensator'],
  col2: ['Extended Mag'],
  col3: ['High Caliber Rounds', 'Armor Piercing Rounds'],
  col4: ['Army of One', 'Life Leech', 'Life Support', 'Spray and Play', 'Persistence'] };

// MACHINE GUNS — Mid and High Impact
const MG_MH = { source: S, sourceUrl: U,
  col1: ['Aggressive Ballistics', 'Accurized Ballistics', 'Field Choke', 'Linear Compensator'],
  col2: ['Extended Mag', 'Braced Frame'],
  col3: ['High Caliber Rounds', 'Armor Piercing Rounds'],
  col4: ['Army of One', 'Life Support', 'Spray and Play', 'Unflinching', 'Hidden Hand', 'Persistence'] };

// ---- Helper -----------------------------------------------------------------

/** Attach a notes string to a template (shallow copy). */
const n = (tpl, notes) => ({ ...tpl, notes });

// ---- PvE roll definitions ---------------------------------------------------

export const LCD_PVE = {

  // ---- Scout Rifles ---------------------------------------------------------

  'Badger CCL':            n(SC_HI,  'Most recommended High Impact to farm for. Easier to farm than others.'),
  'Burning Eye':           n(SC_MID, 'Static Roll. Lowest drop rate from the bounty. Good luck getting one.'),
  "Colovance's Duty":      n(SC_HI,  'Second lowest drop from bounty. Known as one of the best High Impacts in the game.'),
  'Cryptic Dragon':        n(SC_MID, 'Cannot roll Life Support. Go for max damage roll with Crowd Control and Reactive Reload.'),
  'The Distant Star':      n(SC_MID, 'Good but perk pool setup is weird.'),
  'Hand of Judgment':      n(SC_HI,  'Weird perk pool setup but still good. Rivals Colovance\'s Duty.'),
  'The Hero Formula':      n(SC_MID, 'Weakest Mid Impact but it can roll Life Support.'),
  'Keystone 01':           n(SC_HI,  'Great starting Scout with God Roll until you get a better Scout. Cannot roll Life Support.'),
  'Lethe Noblesse':        SC_MID,
  'NL Shadow 701X':        n(SC_MID, 'Lower output than other scouts but still good to use.'),
  'Not Like the Others':   SC_MID,
  'The Saterienne Rapier': SC_MID,
  'Treads Upon Stars':     n(SC_MID, 'Easiest to farm due to guaranteed drop from hoard chest from this strike.'),
  'The Wounded':           n(SC_MID, 'Good starting Scout with proper God Roll until better Scouts drop.'),

  // ---- Pulse Rifles ---------------------------------------------------------

  'Apple of Discord':      HAKKE,
  'B-29 Party Favor':      PL_LM,
  'The Clever Dragon':     PL_LM,
  'Final Duty':            PL_LM,
  'Grasp of Malok':        n(PL_LM,  '50/50 on drop.'),
  'Hawksaw':               PL_LM,
  'Herja-D':               HAKKE,
  'Hopscotch Pilgrim':     PL_LM,
  'Lyudmila-D':            HAKKE,
  "Nirwen's Mercy":        n(PL_LM,  'Second lowest drop rate due to it being an Iron Banner weapon.'),
  'Parthian Shot':         PL_HI,
  'Spare Change.25':      n(PL_HI,  'Only two viable high-impact pulses. All others are either viable for PvP only or outright terrible.'),
  'SUROS PDX-41':          PL_LM,
  'SUROS PDX-45':          PL_LM,
  'The Waltz':             PL_LM,

  // ---- Hand Cannons ---------------------------------------------------------

  'Byronic Hero':          n(HC_MH, 'Underrated HC. Can do as well as Eyasluna and Palindrome. Can get hybrid roll (ER and Rifled Barrel on the same perk row).'),
  'The Devil You Know':    n(HC_MH, 'Can do hybrid roll.'),
  'Eyasluna':              n(HC_MH, 'Highest rated Mid Impact HC with hybrid roll.'),
  'Fatebringer':           n(HC_MH, 'Static Roll. Vault of Glass 390. Has Firefly on last perk which is unreliable when paired with Explosive Rounds.'),
  "Finnala's Peril":       n(HC_MH, 'Second lowest drop rate due to being an Iron Banner weapon. Can do hybrid roll.'),
  'Gaheris-D':             n(HC_MH, 'Third easiest with great God Roll potential in three ways.'),
  'Her Revenge':           n(HC_MH, 'Can do hybrid roll.'),
  'Imago Loop':            n(HC_MH, '50/50 on both strikes for drop. Can get hybrid roll.'),
  'Ill Will':              n(HC_MH, 'Niche. Other High Impacts can do better. Can do hybrid roll.'),
  'Judith-D':              n(HC_MH, 'Easiest to get with package. Same god roll potential and perk pool as Gaheris-D.'),
  'The Lingering Song':    n(HC_MH, 'Weird perk lineup but still works. Really low drop rate. Can have hybrid roll.'),
  'Lord High Fixer':       n(HC_MH, 'Can do hybrid roll.'),
  'The Palindrome':        n(HC_MH, 'Easiest to get. Can get hybrid roll. Hybrid = ER and Rifled Barrel on the same perk row.'),
  'Stolen Pride':          n(HC_MH, 'Can do hybrid roll.'),
  'The Wail':              n(HC_MH, 'Second easiest. Falls off later; find a replacement.'),

  // ---- Auto Rifles ----------------------------------------------------------

  'An Answering Chord':    AR_MH,
  'Antipodal Hindsight':   AR_MH,
  'Arminius-D':            AR_LOW,
  'Assembly II':           AR_LOW,
  "Atheon's Epilogue":     n(AR_LOW, 'Static Roll. Vault of Glass 390.'),
  'The Continental':       AR_MH,
  'The Dealbreaker':       AR_MH,
  'Does Not Bow':          n(AR_MH,  '33% drop chance. Requires Skeleton Key. Shares 2 other drops in table.'),
  'Doctrine of Passing':   AR_LOW,
  'Eidolon Ally':          n(AR_LOW, 'Obtain Husk of the Pit Y3 and upgrade it for The Crux of Darkness Questline.'),
  'Extremophile 011':      AR_MH,
  'GENESIS CHAIN~':         n(AR_MH,  'Static Roll. Wrath of the Machine 390.'),
  'Grim Citizen III':      AR_MH,
  "Haakon's Hatchet":      n(AR_MH,  'Second lowest drop rate.'),
  'Her Memory':            AR_MH,
  'Hex Caster ARC':        AR_LOW,
  'Questing Beast':        AR_MH,
  'Red Spectre':           AR_MH,
  'Shadow Price':          AR_MH,
  "Soulstealer's Claw":    AR_LOW,
  'SUROS ARI-41':          AR_MH,
  'SUROS ARI-45':          AR_MH,
  'The Unbent Tree':       AR_LOW,
  'Vision Stone':          n(AR_MH,  'Static Roll. Lowest drop chance from bounty.'),
  'Zarinaea-D':            AR_MH,
  'Zero-Day Dilemma':      AR_MH,

  // ---- Sniper Rifles --------------------------------------------------------

  'Aoife Rua-D':            n(SNP, 'Used for Surplus strats.'),
  'Bitter Edge 010':        SNP,
  'But Not Forgotten':      n(SNP, 'Niche due to weird perk pool table.'),
  'Deposition VII':         SNP,
  'Eirene RR4':             n(SNP, 'Second easiest High Impact to grab.'),
  'Event Horizon':          n(SNP, 'Easiest possible High Impact to grab.'),
  'EX MACHINA~':             n(SNP, 'Static roll. Wrath of the Machine 390. Very niche with little options but still usable.'),
  'Her Fury':               SNP,
  'LDR 5001':               n(SNP, 'Same type as 1000-Yard Stare. Practically identical with little differences.'),
  'Tamar-D':                n(SNP, 'Used for Surplus strats.'),
  'Tao Hua Yuan':           SNP,
  'Uzume RR4':              SNP,
  "Weyloran's March":       n(SNP, 'Iron Banner weapon. 2nd lowest drop rate.'),
  'Y-09 Longbow Synthesis': SNP,
  '1000-Yard Stare':        SNP,

  // ---- Shotguns -------------------------------------------------------------

  'The Comedian':          SG_ALL,
  'Conspiracy Theory-D':   SG_ALL,
  "Deidris's Retort":      n(SG_ALL,     'Iron Banner weapon. Second lowest drop rate. Very high damage output.'),
  'Found Verdict':         n(SG_NO_RELOAD,'Static Roll. Vault of Glass 390. No reload perk; use Single Point Sling.'),
  'Her Champion':          SG_ALL,
  'In Times of Need':      SG_ALL,
  'Jingukogo-D':           n(SG_ALL,     'Lower outputs than some other shotguns. Still a good find with god roll.'),
  'Matador 64':            n(SG_MATADOR, 'Cannot roll Reload perk; use Single Point Sling or Quickdraw.'),
  'The Next Big Thing':    n(SG_ALL,     'Highest damaging shotgun in Rise of Iron to rival Patch-A.'),
  'Party Crasher +1':      SG_ALL,
  'Stolen Will':           n(SG_ALL,     'Guaranteed drop from hoard chest.'),
  'Strongbow-D':           SG_ALL,
  'Two To The Morgue':     n(SG_ALL,     'Very high damage output.'),

  // ---- Fusion Rifles --------------------------------------------------------

  '77 Wizard':             FR_MH,
  "Darkblade's Spite":     n(FR_MH, '50/50 for drop.'),
  'Each New Day':          n(FR_MH, 'Very wonky with damage numbers from experience. Half reliable.'),
  'Panta Rhei':            FR_MH,
  'Praetorian Foil':       n(FR_MH, 'Static roll. Vault of Glass 390. Very high damaging Fusion.'),
  "Saladin's Vigil":       n(FR_MH, 'Very high damage output. Rivals Praetorian Foil.'),
  'Stellar Vestige':       FR_MH,
  'Thesan FR4':            n(FR_MH, 'Second easiest to get.'),
  'The Waiting':           n(FR_MH, 'Easiest to get.'),
  'Worlds to Come 001':    FR_MH,

  // ---- Rocket Launchers -----------------------------------------------------

  'The Ash Factory':        n(RL_ALL,    'Only 1 rocket in the barrel. Loss of DPS. Needs Tripod to circumvent it.'),
  'Choleric Dragon SRT-49': n(RL_DISCIP, 'Used with Disciplinarian for specific Wrath of the Machine raid encounters.'),
  'The Nightmare':          n(RL_ALL,    'Can roll Hybrid roll.'),
  'The Smolder':            n(RL_ALL,    'Highest damaging launcher in the game. Has True God Roll Hybrid potential: Reload, Tripod, Field Scout and Cluster all on one go.'),
  'Steel Oracle Z-11':      n(RL_ALL,    'Can roll Hybrid roll.'),
  'SUROS JLB-42':           n(RL_SURPLUS,'Can run Surplus for Surplus strats.'),
  'SUROS JLB-47':           n(RL_SURPLUS,'Can run Surplus for Surplus strats.'),
  "Tormod's Bellows":       n(RL_ALL,    'Iron Banner weapon. Second lowest drop rate.'),
  'Unto Dust 00':           n(RL_ALL,    'Easiest Launcher to grab.'),
  'The Warpath':            n(RL_ALL,    'Weaker than most Launchers but still good to have. Great mook control.'),

  // ---- Machine Guns ---------------------------------------------------------

  'Bane of the Taken':               MG_MH,
  "Baron's Ambition":                n(MG_MH, '50/50 for the drop. Requires Skeleton Key.'),
  'Bonekruscher':                    MG_MH,
  "Bretomart's Stand":               n(MG_MH, 'Iron Banner weapon. Second lowest drop rate.'),
  'Chaotic Neutral':                 MG_MH,
  'Corrective Measure':              n(MG_LO, 'Static Roll. Vault of Glass 390.'),
  'Diluvian 10/4X':                  MG_LO,
  'First Citizen IX':                MG_LO,
  "Harrowed Qullim's Terminus":      n(MG_MH, 'Static roll. Kings Fall 390.'),
  "Qullim's Terminus":               n(MG_MH, 'Static roll. Kings Fall 390.'),
  'Ruin Wake':                       MG_MH,
  'The Silvered Dread':              MG_MH,
  'THE SWARM':                       MG_MH,
  'The Unseeing Eye':                n(MG_MH, 'Static roll. Lowest drop rate.'),
  'Unending Deluge III':             MG_MH,
  'Zombie Apocalypse WF47':          MG_MH,
};
