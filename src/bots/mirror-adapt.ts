import 'dotenv/config';
import BriineAgent, { Action, Character, MatchStatus, Spell } from '@briine/sdk';

type ActionKind = 'attack' | 'spell' | 'defend';

type StrategyProfile = {
    characterScore: (character: Character, ally: Character[], enemy: Character[]) => number;
    spellScore: (spell: Spell, ally: Character[], enemy: Character[]) => number;
    sourceScore: (source: Character, status: MatchStatus) => number;
    attackScore?: (attack: Character['attacks'][number], source: Character, status: MatchStatus) => number;
    targetScoreEnemy?: (target: Character, source: Character, status: MatchStatus) => number;
    targetScoreAlly?: (target: Character, source: Character, status: MatchStatus) => number;
    actionPriority?: ActionKind[];
    chooseActionKind?: (status: MatchStatus, source: Character, availableSpells: Spell[], availableAttacks: Character['attacks']) => ActionKind;
};

const defaultAllyTargetScore = (target: Character) => (100 - target.hp) + (target.isDefended ? 10 : 0);
const defaultEnemyTargetScore = (target: Character) => (100 - target.hp) + (target.isDefended ? -5 : 0) + target.stamina;

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
    return [spell.id, spell.element, spell.description, ...spell.effects.map(effect => `${effect.name} ${effect.description}`)].join(' ');
}

function joinCharacterText(character: Character): string {
    return [character.name, character.class, ...character.effects.map(effect => `${effect.name} ${effect.description}`)].join(' ');
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

function chooseTargetGroup(
    kind: 'ally' | 'enemy',
    source: Character,
    status: MatchStatus,
    count: number,
    profile: StrategyProfile,
): Character[] {
    const candidates = kind === 'ally' ? status.livingAllies : status.livingEnemies;

    if (!candidates.length) {
        return [];
    }

    const score = kind === 'ally'
        ? profile.targetScoreAlly ?? defaultAllyTargetScore
        : profile.targetScoreEnemy ?? defaultEnemyTargetScore;

    return [...candidates]
        .sort((left, right) => score(right, source, status) - score(left, source, status))
        .slice(0, count);
}

function chooseSpellTargets(
    spell: Spell,
    source: Character,
    status: MatchStatus,
    profile: StrategyProfile,
): Character[] {
    const targetCount = preferredTargetCount(spell);
    const text = joinSpellText(spell);

    if (isSupportSpell(spell) && !isOffensiveSpell(spell)) {
        return chooseTargetGroup('ally', source, status, targetCount, profile);
    }

    if (isOffensiveSpell(spell) && !isSupportSpell(spell)) {
        return chooseTargetGroup('enemy', source, status, targetCount, profile);
    }

    if (scoreText(text, [{ terms: ['self', 'self-target', 'own'], weight: 1 }]) > 0) {
        return [source];
    }

    const allyAverage = averageHp(status.livingAllies);
    const enemyAverage = averageHp(status.livingEnemies);
    if (allyAverage <= enemyAverage) {
        return chooseTargetGroup('ally', source, status, targetCount, profile);
    }

    return chooseTargetGroup('enemy', source, status, targetCount, profile);
}

function chooseAttackTargets(
    source: Character,
    status: MatchStatus,
    count: number,
    profile: StrategyProfile,
): Character[] {
    return chooseTargetGroup('enemy', source, status, count, profile);
}

function chooseActionKind(
    status: MatchStatus,
    source: Character,
    availableSpells: Spell[],
    availableAttacks: Character['attacks'],
    profile: StrategyProfile,
): ActionKind {
    if (profile.chooseActionKind) {
        return profile.chooseActionKind(status, source, availableSpells, availableAttacks);
    }

    const priority = profile.actionPriority ?? ['spell', 'attack', 'defend'];
    const teamAverage = averageHp(status.ally);

    if (source.hp <= teamAverage * 0.65 && priority.includes('defend')) {
        return 'defend';
    }

    for (const kind of priority) {
        if (kind === 'spell' && availableSpells.length > 0) {
            return 'spell';
        }

        if (kind === 'attack' && availableAttacks.length > 0) {
            return 'attack';
        }

        if (kind === 'defend') {
            return 'defend';
        }
    }

    return availableAttacks.length > 0 ? 'attack' : 'defend';
}

function createStrategicAgent(profile: StrategyProfile) {
    return class StrategicAgent extends BriineAgent {
        chooseCharacter(available: Character[], ally: Character[], enemy: Character[]): Character {
            return bestBy(available, character => profile.characterScore(character, ally, enemy)) ?? available[0];
        }

        chooseSpells(available: Spell[], ally: Character[], enemy: Character[]): Spell[] {
            return [...available].sort((left, right) => profile.spellScore(right, ally, enemy) - profile.spellScore(left, ally, enemy));
        }

        chooseAction(status: MatchStatus): Action {
            const source = bestBy(status.sources, character => profile.sourceScore(character, status)) ?? status.sources[0];
            const availableSpells = source?.spells.filter(spell => spell.available) ?? [];
            const availableAttacks = source?.attacks ?? [];

            if (!source) {
                return { source: status.sources[0], target: status.targets[0], action: 'defend' };
            }

            const kind = chooseActionKind(status, source, availableSpells, availableAttacks, profile);

            if (kind === 'spell' && availableSpells.length > 0) {
                const spell = bestBy(availableSpells, candidate => profile.spellScore(candidate, status.ally, status.enemy)) ?? availableSpells[0];
                return {
                    source,
                    target: chooseSpellTargets(spell, source, status, profile),
                    action: spell,
                };
            }

            if (kind === 'attack' && availableAttacks.length > 0) {
                const attack = bestBy(availableAttacks, candidate => profile.attackScore?.(candidate, source, status) ?? scoreText(`${candidate.name} ${candidate.element}`, [
                    { terms: ['fire', 'burn', 'lava', 'blast', 'scorch'], weight: 4 },
                    { terms: ['water', 'ice', 'frost', 'tidal', 'wave'], weight: 3 },
                    { terms: ['wind', 'storm', 'shock', 'spark'], weight: 3 },
                    { terms: ['earth', 'stone', 'metal', 'guard'], weight: 2 },
                    { terms: ['dark', 'shadow', 'void', 'curse'], weight: 4 },
                    { terms: ['light', 'sun', 'holy', 'radiant'], weight: 4 },
                ])) ?? availableAttacks[0];

                return {
                    source,
                    target: chooseAttackTargets(source, status, 1, profile),
                    action: attack,
                };
            }

            return {
                source,
                target: source,
                action: 'defend',
            };
        }
    };
}

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