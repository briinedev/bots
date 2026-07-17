import 'dotenv/config';
import BriineAgent from '@briine/sdk';
import { averageHp, createStrategicAgent, joinCharacterText, joinSpellText, scoreText } from './shared.js';

const BulwarkCommanderAgent = createStrategicAgent({
    characterScore: character => (
        character.hp * 5
        + character.stamina * 2
        + character.effects.length * 4
        + scoreText(joinCharacterText(character), [
            { terms: ['bulwark', 'commander', 'guard', 'shield', 'wall', 'sentinel', 'warden'], weight: 18 },
        ])
    ),
    spellScore: spell => (
        scoreText(joinSpellText(spell), [
            { terms: ['shield', 'ward', 'guard', 'protect', 'heal', 'restore', 'defend', 'redirect'], weight: 18 },
            { terms: ['team', 'ally', 'allies'], weight: 8 },
        ])
        + spell.maxTargets * 2
        - spell.stackCost
    ),
    sourceScore: source => source.hp * 4 + source.effects.length * 2 + source.stamina,
    targetScoreAlly: target => (100 - target.hp) + (target.isDefended ? 6 : 0),
    targetScoreEnemy: target => target.stamina * 2 + (100 - target.hp),
    chooseActionKind: (status, source, spells) => {
        const allyAverage = averageHp(status.ally);
        if (source.hp <= allyAverage) {
            return 'defend';
        }

        if (spells.length > 0) {
            return 'spell';
        }

        return 'attack';
    },
    actionPriority: ['defend', 'spell', 'attack'],
});

export default BulwarkCommanderAgent;

BriineAgent.register(
    new BulwarkCommanderAgent(
        process.env.USERNAME!,
        process.env.BULWARK_COMMANDER_NAME!,
        process.env.BULWARK_COMMANDER_VERSION!,
        process.env.BULWARK_COMMANDER_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);