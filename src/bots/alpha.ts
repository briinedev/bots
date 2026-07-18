import 'dotenv/config';
import BriineAgent, { Action, Character, MatchStatus, Spell } from '@briine/sdk';

type ActionKind = 'attack' | 'spell' | 'defend';

const defaultAllyTargetScore = (target: Character) => (100 - target.hp) + (target.isDefended ? 10 : 0);

function scoreText(text: string, keywords: Array<{ terms: string[]; weight: number }>): number {
    const lower = text.toLowerCase();
    return keywords.reduce((total, group) => {
        if (group.terms.some(term => lower.includes(term))) {
            return total + group.weight;
        }

        return total;
    }, 0);
}

function sumHp(characters: Character[]): number {
    return characters.reduce((total, character) => total + Math.max(character.hp, 0), 0);
}

function averageHp(characters: Character[]): number {
    return characters.length ? sumHp(characters) / characters.length : 0;
}

function joinSpellText(spell: Spell): string {
    return [spell.id, spell.element, spell.description, ...(spell.effects ?? []).map(effect => `${effect.name} ${effect.description}`)].join(' ');
}

function joinCharacterText(character: Character): string {
    return [character.name, character.class, ...(character.effects ?? []).map(effect => `${effect.name} ${effect.description}`)].join(' ');
}

function isSupportSpell(spell: Spell): boolean {
    return scoreText(joinSpellText(spell), [
        { terms: ['heal', 'restore', 'ward', 'shield', 'guard', 'protect', 'cleanse', 'revive', 'resurrect', 'support', 'renew'], weight: 1 },
    ]) > 0;
}

function isOffensiveSpell(spell: Spell): boolean {
    return scoreText(joinSpellText(spell), [
        { terms: ['damage', 'burn', 'poison', 'bleed', 'curse', 'drain', 'steal', 'strike', 'blast', 'shock', 'weaken', 'vulnerable', 'stun', 'slow'], weight: 1 },
    ]) > 0;
}

function preferredTargetCount(spell: Spell): number {
    return Math.max(1, spell.maxTargets ?? 1);
}

function bestBy<T>(items: T[], score: (item: T) => number): T | undefined {
    return items.reduce<T | undefined>((best, item) => {
        if (!best || score(item) > score(best)) {
            return item;
        }

        return best;
    }, undefined);
}

export default class AlphaAgent extends BriineAgent {
    chooseCharacter(available: Character[], ally: Character[], enemy: Character[]): Character {
        return bestBy(available, character => this.scoreCharacter(character, ally, enemy)) ?? available[0];
    }

    chooseSpells(available: Spell[], ally: Character[], enemy: Character[]): Spell[] {
        return [...available].sort((left, right) => this.scoreSpell(right, ally, enemy) - this.scoreSpell(left, ally, enemy));
    }

    chooseAction(status: MatchStatus): Action {
        const source = bestBy(status.sources, character => this.scoreSource(character, status)) ?? status.sources[0];

        if (!source) {
            return { source: status.sources[0], target: status.targets[0], action: 'defend' };
        }

        const availableSpells = source.spells.filter(spell => spell.available);
        const availableAttacks = source.attacks;
        const actionKind = this.chooseActionKind(status, source, availableSpells, availableAttacks);

        if (actionKind === 'spell' && availableSpells.length > 0) {
            const spell = bestBy(availableSpells, candidate => this.scoreSpell(candidate, status.ally, status.enemy)) ?? availableSpells[0];

            return {
                source,
                target: this.chooseSpellTargets(spell, source, status),
                action: spell,
            };
        }

        if (actionKind === 'attack' && availableAttacks.length > 0) {
            const attack = bestBy(availableAttacks, candidate => this.scoreAttack(candidate, source, status)) ?? availableAttacks[0];

            return {
                source,
                target: this.chooseEnemyTargets(status, 1),
                action: attack,
            };
        }

        return {
            source,
            target: source,
            action: 'defend',
        };
    }

    private scoreCharacter(character: Character, _ally: Character[], _enemy: Character[]): number {
        const elements = new Set(character.attacks.map(attack => attack.element.toLowerCase()));

        return elements.size * 8
            + character.stamina * 2
            + character.hp
            + scoreText(joinCharacterText(character), [
                { terms: ['counter', 'adapt', 'mirror', 'shifter', 'element'], weight: 14 },
            ]);
    }

    private scoreSpell(spell: Spell, _ally: Character[], _enemy: Character[]): number {
        return scoreText(joinSpellText(spell), [
            { terms: ['element', 'counter', 'shift', 'adapt', 'mirror', 'change'], weight: 14 },
            { terms: ['fire', 'water', 'earth', 'wind', 'light', 'dark', 'ice', 'storm', 'poison'], weight: 4 },
        ])
            + new Set((spell.effects ?? []).map(effect => effect.name.toLowerCase())).size * 2
            + spell.maxTargets;
    }

    private scoreSource(source: Character, _status: MatchStatus): number {
        return source.attacks.length * 2 + source.stamina + source.effects.length;
    }

    private scoreAttack(attack: Character['attacks'][number], _source: Character, _status: MatchStatus): number {
        return scoreText(`${attack.name} ${attack.element}`, [
            { terms: ['fire', 'water', 'earth', 'wind', 'light', 'dark', 'ice', 'storm', 'poison'], weight: 6 },
        ]);
    }

    private scoreAllyTarget(target: Character): number {
        return defaultAllyTargetScore(target);
    }

    private scoreEnemyTarget(target: Character): number {
        return target.stamina * 3 + (100 - target.hp);
    }

    private chooseActionKind(
        status: MatchStatus,
        source: Character,
        availableSpells: Spell[],
        availableAttacks: Character['attacks'],
    ): ActionKind {
        const priority: ActionKind[] = ['spell', 'attack', 'defend'];
        const teamAverageHp = averageHp(status.ally);

        if (source.hp <= teamAverageHp * 0.65) {
            return 'defend';
        }

        for (const actionKind of priority) {
            if (actionKind === 'spell' && availableSpells.length > 0) {
                return 'spell';
            }

            if (actionKind === 'attack' && availableAttacks.length > 0) {
                return 'attack';
            }

            if (actionKind === 'defend') {
                return 'defend';
            }
        }

        return availableAttacks.length > 0 ? 'attack' : 'defend';
    }

    private chooseSpellTargets(spell: Spell, source: Character, status: MatchStatus): Character[] {
        const targetCount = preferredTargetCount(spell);
        const spellText = joinSpellText(spell);

        if (isSupportSpell(spell) && !isOffensiveSpell(spell)) {
            return this.chooseAllyTargets(status, targetCount);
        }

        if (isOffensiveSpell(spell) && !isSupportSpell(spell)) {
            return this.chooseEnemyTargets(status, targetCount);
        }

        if (scoreText(spellText, [{ terms: ['self', 'self-target', 'own'], weight: 1 }]) > 0) {
            return [source];
        }

        const allyAverageHp = averageHp(status.livingAllies);
        const enemyAverageHp = averageHp(status.livingEnemies);

        if (allyAverageHp <= enemyAverageHp) {
            return this.chooseAllyTargets(status, targetCount);
        }

        return this.chooseEnemyTargets(status, targetCount);
    }

    private chooseAllyTargets(status: MatchStatus, count: number): Character[] {
        if (!status.livingAllies.length) {
            return [];
        }

        return [...status.livingAllies]
            .sort((left, right) => this.scoreAllyTarget(right) - this.scoreAllyTarget(left))
            .slice(0, count);
    }

    private chooseEnemyTargets(status: MatchStatus, count: number): Character[] {
        if (!status.livingEnemies.length) {
            return [];
        }

        return [...status.livingEnemies]
            .sort((left, right) => this.scoreEnemyTarget(right) - this.scoreEnemyTarget(left))
            .slice(0, count);
    }
}

BriineAgent.register(
    new AlphaAgent(
        process.env.USERNAME!,
        process.env.ALPHA_NAME!,
        process.env.ALPHA_VERSION!,
        process.env.ALPHA_SECRET!,
        true,
    ),
    process.env.API_HOST!,
);
