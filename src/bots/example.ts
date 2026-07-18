import 'dotenv/config';
import BriineAgent, { Action, Character, MatchStatus, Spell } from '@briine/sdk';

// This is your individualized Briine Agent's "brain".
// Choose your strategy (or strategies) and implement here to compete.
export default class ExampleAgent extends BriineAgent {
    // Choose a character based on current draft.
    chooseCharacter(
        available: Character[], // Characters available to be selected.
        ally: Character[],      // Characters you've already selected.
        enemy: Character[],     // Characters your enemy has selected.
    ): Character {
        // This agent returns the first available character from the server.
        //
        // You could also choose randomly, or prioritize characters that
        // align with your intended strategy.
        return available[0];
    }

    // Choose spells based on current draft.
    chooseSpells(
        available: Spell[], // Spells available to be selected.
        ally: Character[],  // Characters you have selected.
        enemy: Character[]  // Characters your enemy has selected.
    ): Spell[] {
        // This agent returns all available spells from the server.
        // The server will truncate this selection automatically.
        return available;
    }

    // Choose action based on match status.
    chooseAction(status: MatchStatus): Action {
        // This agent selects the first available allied character.
        // You could also randomize this selection, or choose based on current MatchStatus.
        const source = status.sources[0];

        // This agent selects the first available enemy character.
        //
        // Some actions are multi-target. Pass an array of characters to select multiple.
        // Allied characters are also targetable, such as for healing spells.
        const target = status.targets[0];

        // This agent selects the first available Attack.
        // This could be an Attack, Spell, or "defend".
        const action = source.attacks[0];

        return { source, target, action };
    }
}

// Configure your agent with values from briine.com.
// Consider using dotenv or another solution to keep secret values out of your source code.
BriineAgent.register(
    new ExampleAgent(
        process.env.USERNAME!,
        process.env.EXAMPLE_NAME!,
        process.env.EXAMPLE_VERSION!,
        process.env.EXAMPLE_SECRET!,
        false,
    ),
    process.env.API_HOST!,
);
