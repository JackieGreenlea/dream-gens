import { World } from "@/lib/types";

export const sampleWorlds: World[] = [
  {
    id: "world-ember-harbor",
    title: "Ember Harbor",
    summary:
      "A storm-soaked port city where ancient lighthouse fires keep sea spirits asleep.",
    background:
      "Ember Harbor survives on trade, superstition, and a fragile ritual that feeds the lighthouse flame every new moon. Merchants, smugglers, and wardens all want control of the fire.",
    firstAction:
      "Arrive at the harbor market just as the warning bells begin to ring from the sea wall.",
    objective:
      "Discover why the sea wards are failing before the city floods with restless spirits.",
    pov: "second_person",
    instructions:
      "Keep scenes tense, tactile, and focused on difficult tradeoffs. Reward curiosity and improvisation.",
    toneStyle:
      "Moody fantasy with crisp sensory details, lived-in pressure, and grounded character choices.",
    authorStyle:
      "Moody fantasy with crisp sensory details and grounded character choices.",
    storyCards: [],
    victoryCondition:
      "The lighthouse ritual is restored and the city survives the storm with its key alliances intact.",
    victoryEnabled: true,
    defeatCondition:
      "The flame goes out, the harbor districts are overrun, or the party fractures beyond repair.",
    defeatEnabled: true,
    playerCharacters: [
      {
        id: "pc-lighthouse-warden",
        name: "Nera Vale",
        description:
          "A young lighthouse warden raised inside the ritual order, torn between protecting the harbor and discovering which of her mentors is feeding it to the sea. She plays as someone with sacred access, civic trust, and a dangerously personal stake in the truth.",
        strengths: ["Ritual expertise", "Civic trust"],
        weaknesses: ["Sheltered judgment", "Fear of public failure"],
      },
      {
        id: "pc-smuggler",
        name: "Tovin Ash",
        description:
          "A river smuggler balancing old debts, blackmail, and a private route through the harbor's forbidden channels. He plays as a fast-talking survivor whose underworld access could save the city or sell it out.",
        strengths: ["Underworld access", "Fast improvisation"],
        weaknesses: ["Debt exposure", "Reckless confidence"],
      },
    ],
  },
  {
    id: "world-golden-circuit",
    title: "The Golden Circuit",
    summary:
      "A grand arcology tournament hides a machine oracle that predicts social collapse.",
    background:
      "The city's ruling houses host a public strategy contest to distract from failing infrastructure. Deep below the arena, an oracle recomputes which district should be sacrificed next.",
    firstAction:
      "Step onto the arena floor moments before a competitor collapses after whispering a forbidden prediction.",
    objective:
      "Expose the oracle's cost before the next district blackout is locked in.",
    pov: "second_person",
    instructions:
      "Blend political intrigue with stylish tech fantasy. Let information be a weapon.",
    toneStyle:
      "Elegant high-pressure science fantasy with sharp dialogue, political tension, and flashes of spectacle.",
    authorStyle:
      "Elegant, high-pressure scenes with smart dialogue and occasional flashes of spectacle.",
    storyCards: [],
    victoryCondition:
      "The oracle's logic is revealed and the city is forced to confront a better future.",
    victoryEnabled: true,
    defeatCondition:
      "The truth is buried, the sacrifice proceeds, or the protagonists are turned into symbols for the regime.",
    defeatEnabled: true,
    playerCharacters: [
      {
        id: "pc-strategist",
        name: "Ilex March",
        description:
          "A celebrated strategist brought in to win the tournament, flatter the ruling houses, and quietly learn what they are hiding beneath the arena. This perspective plays through elite access, political performance, and the risk of becoming complicit in the system being exposed.",
        strengths: ["Strategic analysis", "Elite social access"],
        weaknesses: ["Reputation pressure", "Control instincts"],
      },
      {
        id: "pc-engineer",
        name: "Suri Quill",
        description:
          "A maintenance engineer who knows the arcology's failing underlevels better than the people who govern it, and who has watched entire districts get written off as acceptable losses. She plays as a grounded insider with technical access, moral urgency, and no patience for decorative power.",
        strengths: ["Systems repair", "Underlevel access"],
        weaknesses: ["Political invisibility", "Thin patience for elites"],
      },
    ],
  },
];

export function getSampleWorldById(id: string) {
  return sampleWorlds.find((world) => world.id === id) ?? null;
}
