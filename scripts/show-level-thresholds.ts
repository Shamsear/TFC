import { getCumulativeXPForLevel, getXPForNextLevel } from '../lib/achievements-math'

console.log('📊 LEVEL PROGRESSION THRESHOLDS')
console.log('='.repeat(70))
console.log('Level | Cumulative XP | XP for Next Level | XP Range')
console.log('─'.repeat(70))

for (let level = 1; level <= 20; level++) {
  const cumulativeXP = getCumulativeXPForLevel(level)
  const xpForNext = getXPForNextLevel(level)
  const nextCumulative = getCumulativeXPForLevel(level + 1)
  
  console.log(
    `${level.toString().padStart(5)} | ${cumulativeXP.toString().padStart(13)} | ${xpForNext.toString().padStart(17)} | ${cumulativeXP} - ${nextCumulative - 1}`
  )
}

console.log('─'.repeat(70))
console.log('\nFormula: XP Required = Level^2 * 400')
console.log('Level = floor(sqrt(XP / 400)) + 1')
console.log('\nExamples:')
console.log('  421 XP → Level 2 (needs 400 XP for level 2)')
console.log('  284 XP → Level 1 (needs 400 XP for level 2)')
console.log('  1600 XP → Level 3 (needs 1600 XP for level 3)')
console.log('  3600 XP → Level 4 (needs 3600 XP for level 4)')
