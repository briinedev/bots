import 'dotenv/config';
import BriineAgent from '@briine/sdk';
import { averageHp, createStrategicAgent, joinCharacterText, joinSpellText, scoreText } from './shared.js';

const ControlWeaverAgent = createStrategicAgent({
    characterScore: character => (
        character.effects.length * 6
        + character.stamina * 2
        + character.hp
        + scoreText(joinCharacterText(character), [
            { terms: ['weaver', 'control', 'binder', 'sage', 'caster', 'seer'], weight: 12 },
        ])
    ),
    spellScore: spell => (
        scoreText(joinSpellText(spell), [
            { terms: ['stun', 'slow', 'weaken', 'vulnerable', 'silence', 'curse', 'bind', 'root', 'redirect', 'reflect', 'ward'], weight: 18 },
            { terms: ['control', 'lock', 'tax', 'trap'], weight: 10 },
        ])
        - spell.stamina
        - spell.stackCost
    ),
    sourceScore: source => source.effects.length * 4 + source.stamina + source.hp,
    targetScoreEnemy: target => target.stamina * 4 + (100 - target.hp) + (target.canAct ? 8 : 0),
    chooseActionKind: (status, source, spells) => {
        const enemyAverage = averageHp(status.enemy);
        const allyAverage = averageHp(status.ally);
        if (spells.length > 0 && enemyAverage >= allyAverage) {
            return 'spell';
        }

        if (source.effects.length > 0) {
            return 'attack';
        }

        return 'defend';
    },
    actionPriority: ['spell', 'attack', 'defend'],
});

export default ControlWeaverAgent;

BriineAgent.register(
    new ControlWeaverAgent(
        process.env.USERNAME!,
        process.env.CONTROL_WEAVER_NAME!,
        process.env.CONTROL_WEAVER_VERSION!,
        process.env.CONTROL_WEAVER_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);