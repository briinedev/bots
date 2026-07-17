import 'dotenv/config';
import BriineAgent from '@briine/sdk';
import { createStrategicAgent, joinCharacterText, joinSpellText, scoreText } from './shared.js';

const AoeOverrunAgent = createStrategicAgent({
    characterScore: character => (
        character.attacks.length * 5
        + character.stamina * 2
        + character.hp
        + scoreText(joinCharacterText(character), [
            { terms: ['overrun', 'storm', 'sweep', 'caster', 'general'], weight: 12 },
        ])
    ),
    spellScore: spell => (
        scoreText(joinSpellText(spell), [
            { terms: ['all', 'each', 'every', 'chain', 'splash', 'spread', 'area', 'group', 'multi'], weight: 18 },
            { terms: ['damage', 'burn', 'storm', 'blast', 'wave'], weight: 8 },
        ])
        + spell.maxTargets * 5
        + spell.stackCost
    ),
    sourceScore: source => source.attacks.length * 2 + source.stamina + source.hp,
    targetScoreEnemy: target => (100 - target.hp) + target.stamina,
    chooseActionKind: (_status, _source, spells, attacks) => {
        if (spells.some(spell => spell.maxTargets > 1)) {
            return 'spell';
        }

        if (attacks.length > 1) {
            return 'attack';
        }

        return 'defend';
    },
    actionPriority: ['spell', 'attack', 'defend'],
});

export default AoeOverrunAgent;

BriineAgent.register(
    new AoeOverrunAgent(
        process.env.USERNAME!,
        process.env.AOE_OVERRUN_NAME!,
        process.env.AOE_OVERRUN_VERSION!,
        process.env.AOE_OVERRUN_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);