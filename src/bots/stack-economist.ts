import 'dotenv/config';
import BriineAgent from '@briine/sdk';
import { averageHp, createStrategicAgent, joinCharacterText, joinSpellText, scoreText, sumHp } from './shared.js';

const StackEconomistAgent = createStrategicAgent({
    characterScore: character => (
        character.effects.length * 6
        + character.stamina * 3
        + character.hp
        + scoreText(joinCharacterText(character), [
            { terms: ['economist', 'conduit', 'channel', 'battery', 'vault', 'engine'], weight: 12 },
        ])
    ),
    spellScore: spell => (
        scoreText(joinSpellText(spell), [
            { terms: ['stack', 'convert', 'consume', 'channel', 'gain', 'refund', 'swap', 'trade'], weight: 18 },
            { terms: ['resource', 'cost', 'economy'], weight: 8 },
        ])
        + spell.stackCost * 4
        - spell.stamina
    ),
    sourceScore: source => source.stamina * 2 + source.effects.length * 3 + source.hp,
    attackScore: attack => scoreText(`${attack.name} ${attack.element}`, [
        { terms: ['resource', 'drain', 'convert', 'economy', 'tax'], weight: 10 },
    ]),
    targetScoreEnemy: target => (100 - target.hp) + target.stamina,
    chooseActionKind: (status, source, spells) => {
        const totalStacks = Object.values(status.stack).reduce((total, value) => total + value, 0);
        const teamHp = sumHp(status.ally);

        if (spells.length > 0 && totalStacks > 0) {
            return 'spell';
        }

        if (source.hp < teamHp / Math.max(status.ally.length, 1)) {
            return 'defend';
        }

        return 'attack';
    },
    actionPriority: ['spell', 'attack', 'defend'],
});

export default StackEconomistAgent;

BriineAgent.register(
    new StackEconomistAgent(
        process.env.USERNAME!,
        process.env.STACK_ECONOMIST_NAME!,
        process.env.STACK_ECONOMIST_VERSION!,
        process.env.STACK_ECONOMIST_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);