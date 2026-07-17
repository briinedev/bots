import 'dotenv/config';
import BriineAgent from '@briine/sdk';
import { createStrategicAgent, joinCharacterText, joinSpellText, scoreText } from './shared.js';

const ApexPredatorAgent = createStrategicAgent({
    characterScore: character => (
        character.attacks.length * 7
        + character.stamina * 3
        + character.hp
        + scoreText(joinCharacterText(character), [
            { terms: ['hunter', 'predator', 'assassin', 'ranger', 'blade', 'fang'], weight: 12 },
        ])
    ),
    spellScore: spell => (
        scoreText(joinSpellText(spell), [
            { terms: ['damage', 'burn', 'bleed', 'poison', 'execute', 'finisher', 'mark', 'hunt'], weight: 14 },
            { terms: ['multi', 'all', 'each', 'chain', 'splash'], weight: 8 },
        ])
        + spell.maxTargets * 2
        + spell.stackCost * 2
        + spell.stamina
    ),
    sourceScore: source => source.stamina + source.attacks.length * 2 + source.hp,
    attackScore: attack => scoreText(`${attack.name} ${attack.element}`, [
        { terms: ['fire', 'shadow', 'dark', 'storm', 'shock', 'slash', 'pierce'], weight: 8 },
    ]),
    targetScoreEnemy: target => (100 - target.hp) + target.stamina * 2,
    actionPriority: ['attack', 'spell', 'defend'],
});

export default ApexPredatorAgent;

BriineAgent.register(
    new ApexPredatorAgent(
        process.env.USERNAME!,
        process.env.APEX_PREDATOR_NAME!,
        process.env.APEX_PREDATOR_VERSION!,
        process.env.APEX_PREDATOR_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);