import 'dotenv/config';
import BriineAgent from '@briine/sdk';
import { createStrategicAgent, joinCharacterText, joinSpellText, scoreText } from './shared.js';

const OpportunistFinisherAgent = createStrategicAgent({
    characterScore: character => (
        character.attacks.length * 6
        + character.stamina * 2
        + Math.max(0, 110 - character.hp)
        + scoreText(joinCharacterText(character), [
            { terms: ['opportunist', 'finisher', 'hunter', 'executioner', 'killer'], weight: 16 },
        ])
    ),
    spellScore: spell => (
        scoreText(joinSpellText(spell), [
            { terms: ['execute', 'finisher', 'finish', 'mark', 'hunt', 'punish'], weight: 20 },
            { terms: ['low hp', 'threshold', 'weaken'], weight: 8 },
        ])
        + spell.stackCost * 2
        + spell.stamina
    ),
    sourceScore: source => source.stamina * 2 + source.attacks.length * 2 + source.hp,
    targetScoreEnemy: target => (100 - target.hp) * 2 + target.stamina,
    chooseActionKind: (status, source, spells) => {
        const weakestEnemy = status.enemy.filter(character => character.hp > 0).sort((left, right) => left.hp - right.hp)[0];
        if (weakestEnemy && weakestEnemy.hp <= source.hp) {
            return spells.length > 0 ? 'spell' : 'attack';
        }

        return 'attack';
    },
    actionPriority: ['attack', 'spell', 'defend'],
});

export default OpportunistFinisherAgent;

BriineAgent.register(
    new OpportunistFinisherAgent(
        process.env.USERNAME!,
        process.env.OPPORTUNIST_FINISHER_NAME!,
        process.env.OPPORTUNIST_FINISHER_VERSION!,
        process.env.OPPORTUNIST_FINISHER_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);