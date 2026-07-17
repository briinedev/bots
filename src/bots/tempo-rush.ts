import 'dotenv/config';
import BriineAgent from '@briine/sdk';
import { createStrategicAgent, joinCharacterText, joinSpellText, scoreText } from './shared.js';

const TempoRushAgent = createStrategicAgent({
    characterScore: character => (
        character.attacks.length * 8
        + character.stamina * 4
        + Math.max(0, 120 - character.hp)
        + scoreText(joinCharacterText(character), [
            { terms: ['swift', 'quick', 'rush', 'tempo', 'dash', 'wind'], weight: 12 },
        ])
    ),
    spellScore: spell => (
        scoreText(joinSpellText(spell), [
            { terms: ['cheap', 'quick', 'refresh', 'haste', 'tempo', 'burst'], weight: 14 },
            { terms: ['damage', 'strike', 'hit'], weight: 6 },
        ])
        - spell.stackCost * 2
        - spell.stamina
    ),
    sourceScore: source => source.stamina * 2 + source.attacks.length * 3 + source.hp,
    attackScore: attack => scoreText(`${attack.name} ${attack.element}`, [
        { terms: ['swift', 'rapid', 'jab', 'slash', 'strike', 'rush'], weight: 10 },
    ]),
    targetScoreEnemy: target => (100 - target.hp) + (target.canAct ? 5 : 0),
    actionPriority: ['attack', 'spell', 'defend'],
});

export default TempoRushAgent;

BriineAgent.register(
    new TempoRushAgent(
        process.env.USERNAME!,
        process.env.TEMPO_RUSH_NAME!,
        process.env.TEMPO_RUSH_VERSION!,
        process.env.TEMPO_RUSH_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);