import 'dotenv/config';
import BriineAgent from '@briine/sdk';
import { averageHp, createStrategicAgent, joinCharacterText, joinSpellText, scoreText } from './shared.js';

const MirrorAdaptAgent = createStrategicAgent({
    characterScore: character => (
        character.hp * 2
        + character.stamina * 2
        + character.attacks.length * 3
        + character.effects.length * 3
        + scoreText(joinCharacterText(character), [
            { terms: ['mirror', 'adapt', 'reflection', 'balance', 'flex', 'shift'], weight: 18 },
        ])
    ),
    spellScore: spell => (
        scoreText(joinSpellText(spell), [
            { terms: ['mirror', 'copy', 'adapt', 'shift', 'swap', 'flex', 'balance'], weight: 18 },
            { terms: ['heal', 'ward', 'damage', 'control'], weight: 4 },
        ])
        + spell.effects.length * 2
        + spell.maxTargets
    ),
    sourceScore: source => source.hp + source.stamina + source.attacks.length * 2 + source.effects.length * 2,
    targetScoreEnemy: target => (100 - target.hp) + target.stamina,
    targetScoreAlly: target => (100 - target.hp) + (target.isDefended ? 3 : 0),
    chooseActionKind: (status, source, spells) => {
        const allyAverage = averageHp(status.ally);
        const enemyAverage = averageHp(status.enemy);

        if (allyAverage < enemyAverage && spells.length > 0) {
            return 'spell';
        }

        if (enemyAverage <= allyAverage) {
            return source.attacks.length > 0 ? 'attack' : 'spell';
        }

        return 'defend';
    },
    actionPriority: ['spell', 'attack', 'defend'],
});

export default MirrorAdaptAgent;

BriineAgent.register(
    new MirrorAdaptAgent(
        process.env.USERNAME!,
        process.env.MIRROR_ADAPT_NAME!,
        process.env.MIRROR_ADAPT_VERSION!,
        process.env.MIRROR_ADAPT_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);