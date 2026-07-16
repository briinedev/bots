import 'dotenv/config';
import BriineAgent, { Action, Character, MatchStatus, Spell } from '@briine/sdk';

export default class RandomAgent extends BriineAgent {
    chooseCharacter(
        available: Character[],
        ally: Character[],
        enemy: Character[],
    ): Character {
        return available[0];
    }

    chooseSpells(
        available: Spell[],
        ally: Character[],
        enemy: Character[],
    ): Spell[] {
        return available;
    }

    chooseAction(status: MatchStatus): Action {
        const source = status.sources[0];
        const target = status.targets[0];
        const action = source.attacks[0];

        return { source, target, action };
    }
}

BriineAgent.register(
    new RandomAgent(
        process.env.USERNAME!,
        process.env.BOT_NAME!,
        process.env.BOT_VERSION!,
        process.env.BOT_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);
