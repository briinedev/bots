import 'dotenv/config';
import BriineAgent, { Action, Character, MatchStatus, Spell } from '@briine/sdk';

export default class RandomAgent extends BriineAgent {
    private chooseRandom(arr: any[]) : any {
        const index = Math.floor(Math.random() * arr.length);
        return arr[index];
    }

    chooseCharacter(
        available: Character[],
        ally: Character[],
        enemy: Character[],
    ): Character {
        return this.chooseRandom(available);
    }

    chooseSpells(
        available: Spell[],
        ally: Character[],
        enemy: Character[],
    ): Spell[] {
        return available.sort(() => Math.random() - 0.5);
    }

    chooseAction(status: MatchStatus): Action {
        const source = this.chooseRandom(status.sources);
        const target = this.chooseRandom(status.targets);
        const action = this.chooseRandom(
            [
                ...source.attacks,
                ...source.spells.filter((spell: Spell) => spell.available),
                'defend'
            ]
        );

        return { source, target, action };
    }
}

BriineAgent.register(
    new RandomAgent(
        process.env.USERNAME!,
        process.env.RANDOM_NAME!,
        process.env.RANDOM_VERSION!,
        process.env.RANDOM_SECRET!,
        true,
    ),
    process.env.API_HOST!,
);
