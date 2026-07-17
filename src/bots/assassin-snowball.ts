import 'dotenv/config';
import BriineAgent from '@briine/sdk';
import { createStrategicAgent, joinCharacterText, joinSpellText, scoreText } from './shared.js';

const AssassinSnowballAgent = createStrategicAgent({
    characterScore: character => (
        character.attacks.length * 8
        + character.stamina * 3
        + Math.max(0, 90 - character.hp)
        + scoreText(joinCharacterText(character), [
            { terms: ['assassin', 'blade', 'shadow', 'snowball', 'hunt', 'predator'], weight: 14 },
        ])
    ),
    spellScore: spell => (
        scoreText(joinSpellText(spell), [
            { terms: ['bleed', 'mark', 'hunt', 'execute', 'burst', 'assassinate', 'finish'], weight: 18 },
            { terms: ['damage', 'critical', 'pierce', 'strike'], weight: 10 },
        ])
        + spell.stamina
        + spell.maxTargets
    ),
    sourceScore: source => source.stamina * 2 + source.attacks.length * 3 + source.hp,
    targetScoreEnemy: target => (100 - target.hp) + target.stamina,
    actionPriority: ['attack', 'spell', 'defend'],
});

export default AssassinSnowballAgent;

BriineAgent.register(
    new AssassinSnowballAgent(
        process.env.USERNAME!,
        process.env.ASSASSIN_SNOWBALL_NAME!,
        process.env.ASSASSIN_SNOWBALL_VERSION!,
        process.env.ASSASSIN_SNOWBALL_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);