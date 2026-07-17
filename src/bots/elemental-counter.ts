import 'dotenv/config';
import BriineAgent from '@briine/sdk';
import { createStrategicAgent, joinCharacterText, joinSpellText, scoreText } from './shared.js';

const ElementalCounterAgent = createStrategicAgent({
    characterScore: character => {
        const elements = new Set(character.attacks.map(attack => attack.element.toLowerCase()));

        return elements.size * 8
            + character.stamina * 2
            + character.hp
            + scoreText(joinCharacterText(character), [
                { terms: ['counter', 'adapt', 'mirror', 'shifter', 'element'], weight: 14 },
            ]);
    },
    spellScore: spell => (
        scoreText(joinSpellText(spell), [
            { terms: ['element', 'counter', 'shift', 'adapt', 'mirror', 'change'], weight: 14 },
            { terms: ['fire', 'water', 'earth', 'wind', 'light', 'dark', 'ice', 'storm', 'poison'], weight: 4 },
        ])
        + new Set(spell.effects.map(effect => effect.name.toLowerCase())).size * 2
        + spell.maxTargets
    ),
    sourceScore: source => source.attacks.length * 2 + source.stamina + source.effects.length,
    attackScore: attack => scoreText(`${attack.name} ${attack.element}`, [
        { terms: ['fire', 'water', 'earth', 'wind', 'light', 'dark', 'ice', 'storm', 'poison'], weight: 6 },
    ]),
    targetScoreEnemy: target => target.stamina * 3 + (100 - target.hp),
    actionPriority: ['spell', 'attack', 'defend'],
});

export default ElementalCounterAgent;

BriineAgent.register(
    new ElementalCounterAgent(
        process.env.USERNAME!,
        process.env.ELEMENTAL_COUNTER_NAME!,
        process.env.ELEMENTAL_COUNTER_VERSION!,
        process.env.ELEMENTAL_COUNTER_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);