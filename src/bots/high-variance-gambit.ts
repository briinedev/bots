import 'dotenv/config';
import BriineAgent from '@briine/sdk';
import { createStrategicAgent, joinCharacterText, joinSpellText, scoreText } from './shared.js';

const HighVarianceGambitAgent = createStrategicAgent({
    characterScore: character => (
        character.hp
        + character.stamina * 3
        + character.attacks.length * 2
        + scoreText(joinCharacterText(character), [
            { terms: ['gambit', 'chaos', 'wild', 'variance', 'risk', 'volatile'], weight: 20 },
        ])
    ),
    spellScore: spell => (
        scoreText(joinSpellText(spell), [
            { terms: ['chaos', 'wild', 'volatile', 'risk', 'surge', 'burst', 'roulette'], weight: 20 },
            { terms: ['multi', 'all', 'each', 'chain', 'random'], weight: 10 },
        ])
        + spell.stackCost * 5
        + spell.maxTargets * 3
        + Math.floor(Math.random() * 8)
    ),
    sourceScore: source => source.hp + source.stamina + source.attacks.length,
    attackScore: attack => scoreText(`${attack.name} ${attack.element}`, [
        { terms: ['critical', 'massive', 'explosive', 'volatile', 'chaos'], weight: 12 },
    ]) + Math.floor(Math.random() * 5),
    targetScoreEnemy: target => (100 - target.hp) + Math.floor(Math.random() * 6),
    chooseActionKind: (_status, _source, availableSpells, availableAttacks) => {
        const options: Array<'spell' | 'attack' | 'defend'> = [];

        if (availableSpells.length > 0) {
            options.push('spell');
        }

        if (availableAttacks.length > 0) {
            options.push('attack');
        }

        options.push('defend');

        return options[Math.floor(Math.random() * options.length)];
    },
    actionPriority: ['spell', 'attack', 'defend'],
});

export default HighVarianceGambitAgent;

BriineAgent.register(
    new HighVarianceGambitAgent(
        process.env.USERNAME!,
        process.env.HIGH_VARIANCE_GAMBIT_NAME!,
        process.env.HIGH_VARIANCE_GAMBIT_VERSION!,
        process.env.HIGH_VARIANCE_GAMBIT_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);