import 'dotenv/config';
import BriineAgent from '@briine/sdk';
import { averageHp, createStrategicAgent, joinCharacterText, joinSpellText, scoreText } from './shared.js';

const SustainOracleAgent = createStrategicAgent({
    characterScore: character => (
        character.hp * 4
        + character.stamina * 2
        + character.effects.length * 3
        + scoreText(joinCharacterText(character), [
            { terms: ['oracle', 'priest', 'healer', 'sage', 'ward', 'guardian'], weight: 14 },
        ])
    ),
    spellScore: spell => (
        scoreText(joinSpellText(spell), [
            { terms: ['heal', 'restore', 'renew', 'ward', 'shield', 'guard', 'protect', 'cleanse', 'revive'], weight: 16 },
            { terms: ['support', 'allies', 'team'], weight: 8 },
        ])
        + spell.maxTargets * 2
        - spell.stackCost
        - spell.stamina
    ),
    sourceScore: source => source.hp * 3 + source.stamina + source.effects.length * 2,
    targetScoreAlly: target => (100 - target.hp) + (target.isDefended ? 5 : 0),
    targetScoreEnemy: target => (100 - target.hp) + target.stamina,
    chooseActionKind: (status, source, spells) => {
        const allyAverage = averageHp(status.ally);
        const enemyAverage = averageHp(status.enemy);
        if (spells.length > 0 && (allyAverage <= enemyAverage || source.hp <= allyAverage)) {
            return 'spell';
        }

        if (source.hp <= allyAverage) {
            return 'defend';
        }

        return 'attack';
    },
    actionPriority: ['spell', 'defend', 'attack'],
});

export default SustainOracleAgent;

BriineAgent.register(
    new SustainOracleAgent(
        process.env.USERNAME!,
        process.env.SUSTAIN_ORACLE_NAME!,
        process.env.SUSTAIN_ORACLE_VERSION!,
        process.env.SUSTAIN_ORACLE_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);