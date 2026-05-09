"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  categories,
  difficulties,
  difficultyMeta,
  gameModeMeta,
  gameModes,
  getDontSayQuestions,
  normalizeAnswer,
  type Category,
  type Difficulty,
  type DontSayQuestion,
  type DontSaySecret,
  type DontSayValidation,
  type GameMode,
  type QuestionCategory,
} from "@/game/modes";

const categoryMeta: Record<Category, { label: string }> = {
  General: {
    label: "General",
  },
  Countries: {
    label: "Countries",
  },
  Capitals: {
    label: "Capitals",
  },
  Flags: {
    label: "Flags",
  },
  Geography: {
    label: "Geography",
  },
  People: {
    label: "People",
  },
  Landmarks: {
    label: "Landmarks",
  },
  Animals: {
    label: "Animals",
  },
  Science: {
    label: "Science",
  },
  Sports: {
    label: "Sports",
  },
  "Movies & TV": {
    label: "Movies & TV",
  },
  Music: {
    label: "Music",
  },
  Songs: {
    label: "Songs",
  },
  Food: {
    label: "Food",
  },
  History: {
    label: "History",
  },
};

const getQuestionPillLabel = (
  mode: GameMode,
  category: Category,
  questionNumber: number,
  questionTotal: number,
) =>
  mode === "dont-say"
    ? `${gameModeMeta[mode].title} (${questionNumber}/${questionTotal})`
    : `${categoryMeta[category].label} (${questionNumber}/${questionTotal})`;

const leaderboardNames = [
  "Maya",
  "Leo",
  "Ari",
  "Nora",
  "Kai",
  "Zara",
  "Theo",
  "Iris",
  "Milo",
  "Sofia",
  "Remy",
  "Lena",
  "Jules",
  "Owen",
  "Nia",
  "Eli",
  "Amara",
  "Noah",
  "Mina",
  "Ezra",
];

const leaderboardScopes = ["Global", "US", "Friends"] as const;
type LeaderboardScope = (typeof leaderboardScopes)[number];
const leaderboardScopeLabels: Record<LeaderboardScope, string> = {
  Global: "Global",
  US: "🇺🇸 US",
  Friends: "Friends",
};

const buildLeaderboard = (scope: LeaderboardScope, scoreOffset: number) =>
  Array.from({ length: 100 }, (_, index) => ({
    name: `${leaderboardNames[(index + scoreOffset) % leaderboardNames.length]} ${Math.floor(index / leaderboardNames.length) + 1}`,
    score: Math.max(900, 7420 - scoreOffset * 95 - index * 57 - (index % 7) * 13),
    avatar:
      index < 3
        ? `https://api.dicebear.com/9.x/adventurer/svg?seed=${scope}-${leaderboardNames[index]}`
        : undefined,
  }));

const leaderboards: Record<LeaderboardScope, ReturnType<typeof buildLeaderboard>> = {
  Global: buildLeaderboard("Global", 0),
  US: buildLeaderboard("US", 2),
  Friends: buildLeaderboard("Friends", 4),
};

type LobbyPlayer = {
  name: string;
  avatar: string;
  isHost: boolean;
  isCurrent?: boolean;
};

const lobbyPlayers: LobbyPlayer[] = [
  { name: "Maya", avatar: "Maya", isHost: true },
  { name: "Leo", avatar: "Leo", isHost: false },
  { name: "Nora", avatar: "Nora", isHost: false },
  { name: "Kai", avatar: "Kai", isHost: false },
  { name: "Zara", avatar: "Zara", isHost: false },
  { name: "Theo", avatar: "Theo", isHost: false },
  { name: "Iris", avatar: "Iris", isHost: false },
];
const DEFAULT_GROUP_NAME = "Friday Trivia Crew";

const aboutSteps = [
  {
    title: "Choose your rush",
    body: "Solo is a sprint. Groups are a shared room. Codes pull friends straight into the lobby.",
    visual: "modes",
  },
  {
    title: "Fire answers in",
    body: "Type or talk. The game accepts good answers, tracks lists, and rewards speed.",
    visual: "answer",
  },
  {
    title: "Stack the score",
    body: "Fast correct answers climb. Bad guesses cost. Leaderboards turn every round into a chase.",
    visual: "score",
  },
] as const;

const aboutAnswerExamples = [
  { prompt: "Red Planet", answer: "MARS", points: "+135" },
  { prompt: "Capital of Japan", answer: "TOKYO", points: "+160" },
  { prompt: "Germany border", answer: "FRANCE", points: "+125" },
] as const;

const playerAvatars = [
  "Nova",
  "Pixel",
  "Orbit",
  "Quill",
  "Dash",
  "Echo",
  "Atlas",
  "Blair",
  "Cleo",
  "Drew",
  "Ember",
  "Finn",
  "Gia",
  "Harper",
  "Indie",
  "Juno",
  "Koa",
  "Lux",
  "Marlow",
  "Nico",
  "Opal",
  "Pax",
  "Quinn",
  "Rae",
  "Scout",
  "Tavi",
  "Uma",
  "Vale",
  "Wren",
  "Xavi",
  "Yael",
  "Zion",
  "Ash",
  "Bowie",
  "Cove",
  "Dune",
  "Eden",
  "Fable",
  "Grey",
  "Halo",
  "Isle",
  "Kit",
  "Lane",
  "Mika",
  "Noor",
  "Poe",
  "Reese",
  "Sage",
  "True",
  "Vega",
  "Winter",
] as const;
const PLAYER_STORAGE_KEY = "trivia-rush-player";

type PlayerProfile = {
  username: string;
  avatar: string;
  totalScore: number;
};

const defaultPlayerProfile: PlayerProfile = {
  username: "",
  avatar: playerAvatars[0],
  totalScore: 0,
};

const isCustomAvatar = (avatar: string) => avatar.startsWith("data:image/");

const getAvatarUrl = (avatar: string) =>
  isCustomAvatar(avatar)
    ? avatar
    : `https://api.dicebear.com/9.x/adventurer/svg?seed=${avatar}`;

type QuestionBase = {
  category: QuestionCategory;
  prompt: string;
  kicker: string;
  difficulty?: Difficulty;
  image?: {
    src: string;
    alt: string;
  };
};

type TextQuestion = QuestionBase & {
  type: "text";
  answers: string[];
};

type MultiQuestion = QuestionBase & {
  type: "multi";
  required: number;
  answers: string[];
};

type NumberQuestion = QuestionBase & {
  type: "number";
  min: number;
  max: number;
  displayAnswer: string;
};

type RankingQuestion = QuestionBase & {
  type: "ranking";
  answers: string[];
};

type Question = TextQuestion | MultiQuestion | NumberQuestion | RankingQuestion;

type RealtimeTokenResponse = {
  value?: string;
  client_secret?: {
    value?: string;
  };
};

type RealtimeServerEvent = {
  type?: string;
  item_id?: string;
  transcript?: string;
  delta?: string;
  error?: {
    message?: string;
  };
};

type VoiceStatus = "idle" | "connecting" | "listening" | "error";

type ScriptProcessorAudioContext = AudioContext & {
  createScriptProcessor(
    bufferSize?: number,
    numberOfInputChannels?: number,
    numberOfOutputChannels?: number,
  ): ScriptProcessorNode;
};

type ClassicValidation = {
  counts: boolean;
  canonicalAnswer: string;
  normalizedAnswer: string;
  reason: string;
};

const SINGLE_ANSWER_SECONDS = 10;
const MULTI_ANSWER_SECONDS_PER_ITEM = 5;
const RANKING_SECONDS_PER_ITEM = 6;
const BASE_POINTS = 100;
const TIME_BONUS_PER_SECOND = 5;
const WRONG_ANSWER_PENALTY = 25;
const VOICE_SUBMIT_DELAY_MS = 40;
const ROUND_QUESTION_COUNT = 15;
const VOICE_RMS_THRESHOLD = 0.025;
const VOICE_MIN_SPEECH_MS = 180;
const VOICE_SILENCE_COMMIT_MS = 560;
const VOICE_MIN_COMMIT_GAP_MS = 900;
const VOICE_TARGET_SAMPLE_RATE = 24000;
const REALTIME_TRANSCRIPTION_SESSION = {
  type: "transcription",
  audio: {
    input: {
      format: {
        type: "audio/pcm",
        rate: 24000,
      },
      transcription: {
        model: "gpt-realtime-whisper",
        language: "en",
      },
    },
  },
} as const;

const encodePcm16Base64 = (samples: Float32Array, inputSampleRate: number) => {
  const ratio = inputSampleRate / VOICE_TARGET_SAMPLE_RATE;
  const outputLength = Math.max(1, Math.floor(samples.length / ratio));
  const pcm = new Int16Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = Math.min(samples.length - 1, Math.floor(index * ratio));
    const sample = Math.max(-1, Math.min(1, samples[sourceIndex] ?? 0));
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  const bytes = new Uint8Array(pcm.buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return window.btoa(binary);
};

const getAudioRms = (samples: Float32Array) => {
  let sumSquares = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index] ?? 0;
    sumSquares += sample * sample;
  }

  return Math.sqrt(sumSquares / samples.length);
};

const redFlagCountries = [
  "albania",
  "algeria",
  "andorra",
  "angola",
  "antigua and barbuda",
  "armenia",
  "australia",
  "austria",
  "azerbaijan",
  "bahrain",
  "bangladesh",
  "belarus",
  "belgium",
  "belize",
  "benin",
  "bolivia",
  "brunei",
  "bulgaria",
  "burkina faso",
  "burundi",
  "cambodia",
  "cameroon",
  "canada",
  "cape verde",
  "central african republic",
  "chad",
  "chile",
  "china",
  "colombia",
  "comoros",
  "congo",
  "costa rica",
  "croatia",
  "cuba",
  "czech republic",
  "czechia",
  "denmark",
  "djibouti",
  "dominica",
  "dominican republic",
  "ecuador",
  "egypt",
  "equatorial guinea",
  "eritrea",
  "eswatini",
  "ethiopia",
  "fiji",
  "france",
  "gambia",
  "georgia",
  "germany",
  "ghana",
  "grenada",
  "guinea",
  "guinea-bissau",
  "guyana",
  "haiti",
  "hungary",
  "iceland",
  "indonesia",
  "iran",
  "iraq",
  "italy",
  "japan",
  "jordan",
  "kenya",
  "kiribati",
  "kyrgyzstan",
  "laos",
  "latvia",
  "lebanon",
  "liberia",
  "libya",
  "liechtenstein",
  "lithuania",
  "luxembourg",
  "madagascar",
  "malawi",
  "malaysia",
  "maldives",
  "malta",
  "mauritania",
  "mauritius",
  "mexico",
  "moldova",
  "monaco",
  "mongolia",
  "montenegro",
  "morocco",
  "mozambique",
  "myanmar",
  "namibia",
  "nepal",
  "netherlands",
  "new zealand",
  "north korea",
  "north macedonia",
  "norway",
  "oman",
  "palestine",
  "panama",
  "papua new guinea",
  "paraguay",
  "peru",
  "philippines",
  "poland",
  "portugal",
  "qatar",
  "romania",
  "russia",
  "saint kitts and nevis",
  "samoa",
  "sao tome and principe",
  "senegal",
  "serbia",
  "seychelles",
  "singapore",
  "slovakia",
  "slovenia",
  "south africa",
  "south korea",
  "south sudan",
  "spain",
  "sri lanka",
  "sudan",
  "suriname",
  "switzerland",
  "syria",
  "taiwan",
  "tajikistan",
  "thailand",
  "timor-leste",
  "timor leste",
  "togo",
  "tonga",
  "trinidad and tobago",
  "tunisia",
  "turkey",
  "turkmenistan",
  "tuvalu",
  "uganda",
  "united arab emirates",
  "uae",
  "united kingdom",
  "uk",
  "united states",
  "usa",
  "uruguay",
  "uzbekistan",
  "vanuatu",
  "venezuela",
  "vietnam",
  "yemen",
  "zimbabwe",
];

const germanyBorderCountries = [
  "denmark",
  "poland",
  "czech republic",
  "czechia",
  "austria",
  "switzerland",
  "france",
  "luxembourg",
  "belgium",
  "netherlands",
];

const islandCountries = [
  "antigua and barbuda",
  "bahamas",
  "bahrain",
  "barbados",
  "brunei",
  "cape verde",
  "cabo verde",
  "comoros",
  "cuba",
  "cyprus",
  "dominica",
  "dominican republic",
  "fiji",
  "grenada",
  "haiti",
  "iceland",
  "indonesia",
  "ireland",
  "jamaica",
  "japan",
  "kiribati",
  "madagascar",
  "maldives",
  "malta",
  "marshall islands",
  "mauritius",
  "micronesia",
  "nauru",
  "new zealand",
  "palau",
  "papua new guinea",
  "philippines",
  "saint kitts and nevis",
  "st kitts and nevis",
  "saint lucia",
  "st lucia",
  "saint vincent and the grenadines",
  "st vincent and the grenadines",
  "samoa",
  "sao tome and principe",
  "seychelles",
  "singapore",
  "solomon islands",
  "sri lanka",
  "timor-leste",
  "timor leste",
  "tonga",
  "trinidad and tobago",
  "tuvalu",
  "united kingdom",
  "uk",
  "vanuatu",
];

const mammals = [
  "aardvark",
  "alpaca",
  "anteater",
  "antelope",
  "ape",
  "armadillo",
  "baboon",
  "badger",
  "bat",
  "bear",
  "beaver",
  "bison",
  "bobcat",
  "buffalo",
  "camel",
  "capybara",
  "cat",
  "cheetah",
  "chimpanzee",
  "chipmunk",
  "cougar",
  "cow",
  "coyote",
  "deer",
  "dog",
  "dolphin",
  "donkey",
  "elephant",
  "elk",
  "ferret",
  "fox",
  "gazelle",
  "giraffe",
  "goat",
  "gorilla",
  "guinea pig",
  "hamster",
  "hare",
  "hedgehog",
  "hippopotamus",
  "hippo",
  "horse",
  "hyena",
  "jaguar",
  "kangaroo",
  "koala",
  "lemur",
  "leopard",
  "lion",
  "llama",
  "lynx",
  "manatee",
  "mole",
  "mongoose",
  "monkey",
  "moose",
  "mouse",
  "otter",
  "panda",
  "panther",
  "pig",
  "platypus",
  "polar bear",
  "porcupine",
  "possum",
  "opossum",
  "rabbit",
  "raccoon",
  "rat",
  "rhinoceros",
  "rhino",
  "seal",
  "sea lion",
  "sheep",
  "skunk",
  "sloth",
  "squirrel",
  "tiger",
  "walrus",
  "weasel",
  "whale",
  "wolf",
  "wombat",
  "zebra",
];

const fruits = [
  "apple",
  "apricot",
  "avocado",
  "banana",
  "blackberry",
  "blueberry",
  "boysenberry",
  "cantaloupe",
  "cherry",
  "coconut",
  "cranberry",
  "date",
  "dragon fruit",
  "durian",
  "fig",
  "grape",
  "grapefruit",
  "guava",
  "honeydew",
  "jackfruit",
  "kiwi",
  "kumquat",
  "lemon",
  "lime",
  "lychee",
  "mango",
  "melon",
  "nectarine",
  "orange",
  "papaya",
  "passion fruit",
  "peach",
  "pear",
  "persimmon",
  "pineapple",
  "plum",
  "pomegranate",
  "pomelo",
  "raspberry",
  "star fruit",
  "strawberry",
  "tangerine",
  "watermelon",
];

const ballSports = [
  "soccer",
  "football",
  "association football",
  "american football",
  "aussie rules",
  "australian rules football",
  "basketball",
  "baseball",
  "softball",
  "tennis",
  "table tennis",
  "ping pong",
  "golf",
  "rugby",
  "rugby union",
  "rugby league",
  "cricket",
  "volleyball",
  "beach volleyball",
  "handball",
  "team handball",
  "water polo",
  "lacrosse",
  "pickleball",
  "badminton",
  "squash",
  "racquetball",
  "field hockey",
  "hockey",
  "ice hockey",
  "polo",
  "netball",
  "dodgeball",
  "kickball",
  "bowling",
  "bocce",
  "petanque",
  "croquet",
  "billiards",
  "pool",
  "snooker",
  "rounders",
  "hurling",
  "gaelic football",
  "futsal",
  "ultimate",
  "ultimate frisbee",
];

const southAmericanCountries = [
  "argentina",
  "bolivia",
  "brazil",
  "chile",
  "colombia",
  "ecuador",
  "guyana",
  "paraguay",
  "peru",
  "suriname",
  "uruguay",
  "venezuela",
];

const europeanCapitals = [
  "tirana",
  "andorra la vella",
  "vienna",
  "minsk",
  "brussels",
  "sarajevo",
  "sofia",
  "zagreb",
  "nicosia",
  "prague",
  "copenhagen",
  "tallinn",
  "helsinki",
  "paris",
  "berlin",
  "athens",
  "budapest",
  "reykjavik",
  "dublin",
  "rome",
  "pristina",
  "riga",
  "vaduz",
  "vilnius",
  "luxembourg",
  "valletta",
  "chisinau",
  "monaco",
  "podgorica",
  "amsterdam",
  "skopje",
  "oslo",
  "warsaw",
  "lisbon",
  "bucharest",
  "moscow",
  "san marino",
  "belgrade",
  "bratislava",
  "ljubljana",
  "madrid",
  "stockholm",
  "bern",
  "kyiv",
  "kiev",
  "london",
  "vatican city",
];

const seedQuestions: Question[] = [
  {
    category: "Countries",
    type: "multi",
    kicker: "Flags",
    prompt: "Name 10 countries with red in the flag",
    required: 10,
    answers: redFlagCountries,
  },
  {
    category: "General",
    type: "text",
    kicker: "People",
    prompt: "Who is this?",
    image: {
      src: "/trivia/einstein.jpg",
      alt: "Albert Einstein portrait",
    },
    answers: ["albert einstein", "einstein"],
  },
  {
    category: "Countries",
    type: "number",
    kicker: "Population",
    prompt: "What is the population of France?",
    min: 65000000,
    max: 70000000,
    displayAnswer: "about 68 million",
  },
  {
    category: "Countries",
    type: "multi",
    kicker: "Borders",
    prompt: "Name 3 countries that border Germany",
    required: 3,
    answers: germanyBorderCountries,
  },
  {
    category: "General",
    type: "text",
    kicker: "Landmarks",
    prompt: "What is this?",
    image: {
      src: "/trivia/mount-fuji.jpg",
      alt: "Mount Fuji",
    },
    answers: ["mount fuji", "fuji", "fuji mountain"],
  },
  {
    category: "Capitals",
    type: "text",
    kicker: "Capitals",
    prompt: "What is the capital of Australia?",
    answers: ["canberra"],
  },
  {
    category: "Countries",
    type: "multi",
    kicker: "Geography",
    prompt: "Name 5 island countries",
    required: 5,
    answers: islandCountries,
  },
  {
    category: "Countries",
    type: "number",
    kicker: "Population",
    prompt: "What is the population of Canada?",
    min: 39000000,
    max: 43000000,
    displayAnswer: "about 41 million",
  },
  {
    category: "Science",
    type: "text",
    kicker: "Science",
    prompt: "What planet is known as the Red Planet?",
    answers: ["mars"],
  },
  {
    category: "Sports",
    type: "multi",
    kicker: "Sports",
    prompt: "Name 4 sports played with a ball",
    required: 4,
    answers: ballSports,
  },
  {
    category: "Countries",
    type: "multi",
    kicker: "Continents",
    prompt: "Name 5 countries in South America",
    required: 5,
    answers: southAmericanCountries,
  },
  {
    category: "Capitals",
    type: "multi",
    kicker: "Europe",
    prompt: "Name 5 capital cities in Europe",
    required: 5,
    answers: europeanCapitals,
  },
  {
    category: "Capitals",
    type: "text",
    kicker: "Capitals",
    prompt: "What is the capital of Canada?",
    answers: ["ottawa"],
  },
  {
    category: "Capitals",
    type: "text",
    kicker: "Capitals",
    prompt: "What is the capital of Japan?",
    answers: ["tokyo"],
  },
  {
    category: "Science",
    type: "text",
    kicker: "Science",
    prompt: "What gas do plants absorb from the air?",
    answers: ["carbon dioxide", "co2"],
  },
  {
    category: "Science",
    type: "text",
    kicker: "Science",
    prompt: "What is the chemical symbol for gold?",
    answers: ["au"],
  },
  {
    category: "Sports",
    type: "text",
    kicker: "Sports",
    prompt: "How many players are on a soccer team on the field?",
    answers: ["11", "eleven"],
  },
];

const toClassicQuestion = (question: DontSayQuestion): TextQuestion => ({
  category: question.category,
  type: "text",
  kicker: "Don't say",
  prompt: question.prompt,
  answers: [],
});

const countryFlags: Record<string, { code: string; name: string }> = {
  albania: { code: "al", name: "Albania" },
  algeria: { code: "dz", name: "Algeria" },
  andorra: { code: "ad", name: "Andorra" },
  angola: { code: "ao", name: "Angola" },
  "antigua and barbuda": { code: "ag", name: "Antigua and Barbuda" },
  argentina: { code: "ar", name: "Argentina" },
  armenia: { code: "am", name: "Armenia" },
  australia: { code: "au", name: "Australia" },
  austria: { code: "at", name: "Austria" },
  azerbaijan: { code: "az", name: "Azerbaijan" },
  bahamas: { code: "bs", name: "Bahamas" },
  bahrain: { code: "bh", name: "Bahrain" },
  bangladesh: { code: "bd", name: "Bangladesh" },
  barbados: { code: "bb", name: "Barbados" },
  belarus: { code: "by", name: "Belarus" },
  belgium: { code: "be", name: "Belgium" },
  belize: { code: "bz", name: "Belize" },
  benin: { code: "bj", name: "Benin" },
  bolivia: { code: "bo", name: "Bolivia" },
  brazil: { code: "br", name: "Brazil" },
  brunei: { code: "bn", name: "Brunei" },
  bulgaria: { code: "bg", name: "Bulgaria" },
  "burkina faso": { code: "bf", name: "Burkina Faso" },
  burundi: { code: "bi", name: "Burundi" },
  cambodia: { code: "kh", name: "Cambodia" },
  cameroon: { code: "cm", name: "Cameroon" },
  canada: { code: "ca", name: "Canada" },
  "cape verde": { code: "cv", name: "Cape Verde" },
  "cabo verde": { code: "cv", name: "Cabo Verde" },
  "central african republic": { code: "cf", name: "Central African Republic" },
  chad: { code: "td", name: "Chad" },
  chile: { code: "cl", name: "Chile" },
  china: { code: "cn", name: "China" },
  colombia: { code: "co", name: "Colombia" },
  comoros: { code: "km", name: "Comoros" },
  congo: { code: "cg", name: "Congo" },
  "costa rica": { code: "cr", name: "Costa Rica" },
  croatia: { code: "hr", name: "Croatia" },
  cuba: { code: "cu", name: "Cuba" },
  cyprus: { code: "cy", name: "Cyprus" },
  "czech republic": { code: "cz", name: "Czech Republic" },
  czechia: { code: "cz", name: "Czechia" },
  denmark: { code: "dk", name: "Denmark" },
  djibouti: { code: "dj", name: "Djibouti" },
  dominica: { code: "dm", name: "Dominica" },
  "dominican republic": { code: "do", name: "Dominican Republic" },
  ecuador: { code: "ec", name: "Ecuador" },
  egypt: { code: "eg", name: "Egypt" },
  "equatorial guinea": { code: "gq", name: "Equatorial Guinea" },
  eritrea: { code: "er", name: "Eritrea" },
  eswatini: { code: "sz", name: "Eswatini" },
  ethiopia: { code: "et", name: "Ethiopia" },
  fiji: { code: "fj", name: "Fiji" },
  france: { code: "fr", name: "France" },
  gambia: { code: "gm", name: "Gambia" },
  georgia: { code: "ge", name: "Georgia" },
  germany: { code: "de", name: "Germany" },
  ghana: { code: "gh", name: "Ghana" },
  grenada: { code: "gd", name: "Grenada" },
  guinea: { code: "gn", name: "Guinea" },
  "guinea-bissau": { code: "gw", name: "Guinea-Bissau" },
  guyana: { code: "gy", name: "Guyana" },
  haiti: { code: "ht", name: "Haiti" },
  hungary: { code: "hu", name: "Hungary" },
  iceland: { code: "is", name: "Iceland" },
  indonesia: { code: "id", name: "Indonesia" },
  iran: { code: "ir", name: "Iran" },
  iraq: { code: "iq", name: "Iraq" },
  ireland: { code: "ie", name: "Ireland" },
  italy: { code: "it", name: "Italy" },
  jamaica: { code: "jm", name: "Jamaica" },
  japan: { code: "jp", name: "Japan" },
  jordan: { code: "jo", name: "Jordan" },
  kenya: { code: "ke", name: "Kenya" },
  kiribati: { code: "ki", name: "Kiribati" },
  kyrgyzstan: { code: "kg", name: "Kyrgyzstan" },
  laos: { code: "la", name: "Laos" },
  latvia: { code: "lv", name: "Latvia" },
  lebanon: { code: "lb", name: "Lebanon" },
  liberia: { code: "lr", name: "Liberia" },
  libya: { code: "ly", name: "Libya" },
  liechtenstein: { code: "li", name: "Liechtenstein" },
  lithuania: { code: "lt", name: "Lithuania" },
  luxembourg: { code: "lu", name: "Luxembourg" },
  madagascar: { code: "mg", name: "Madagascar" },
  malawi: { code: "mw", name: "Malawi" },
  malaysia: { code: "my", name: "Malaysia" },
  maldives: { code: "mv", name: "Maldives" },
  malta: { code: "mt", name: "Malta" },
  "marshall islands": { code: "mh", name: "Marshall Islands" },
  mauritania: { code: "mr", name: "Mauritania" },
  mauritius: { code: "mu", name: "Mauritius" },
  mexico: { code: "mx", name: "Mexico" },
  micronesia: { code: "fm", name: "Micronesia" },
  moldova: { code: "md", name: "Moldova" },
  monaco: { code: "mc", name: "Monaco" },
  mongolia: { code: "mn", name: "Mongolia" },
  montenegro: { code: "me", name: "Montenegro" },
  morocco: { code: "ma", name: "Morocco" },
  mozambique: { code: "mz", name: "Mozambique" },
  myanmar: { code: "mm", name: "Myanmar" },
  namibia: { code: "na", name: "Namibia" },
  nauru: { code: "nr", name: "Nauru" },
  nepal: { code: "np", name: "Nepal" },
  netherlands: { code: "nl", name: "Netherlands" },
  "new zealand": { code: "nz", name: "New Zealand" },
  "north korea": { code: "kp", name: "North Korea" },
  "north macedonia": { code: "mk", name: "North Macedonia" },
  norway: { code: "no", name: "Norway" },
  oman: { code: "om", name: "Oman" },
  palau: { code: "pw", name: "Palau" },
  palestine: { code: "ps", name: "Palestine" },
  panama: { code: "pa", name: "Panama" },
  "papua new guinea": { code: "pg", name: "Papua New Guinea" },
  paraguay: { code: "py", name: "Paraguay" },
  peru: { code: "pe", name: "Peru" },
  philippines: { code: "ph", name: "Philippines" },
  poland: { code: "pl", name: "Poland" },
  portugal: { code: "pt", name: "Portugal" },
  qatar: { code: "qa", name: "Qatar" },
  romania: { code: "ro", name: "Romania" },
  russia: { code: "ru", name: "Russia" },
  "saint kitts and nevis": { code: "kn", name: "Saint Kitts and Nevis" },
  "st kitts and nevis": { code: "kn", name: "Saint Kitts and Nevis" },
  "saint lucia": { code: "lc", name: "Saint Lucia" },
  "st lucia": { code: "lc", name: "Saint Lucia" },
  "saint vincent and the grenadines": {
    code: "vc",
    name: "Saint Vincent and the Grenadines",
  },
  "st vincent and the grenadines": {
    code: "vc",
    name: "Saint Vincent and the Grenadines",
  },
  samoa: { code: "ws", name: "Samoa" },
  "sao tome and principe": { code: "st", name: "Sao Tome and Principe" },
  senegal: { code: "sn", name: "Senegal" },
  serbia: { code: "rs", name: "Serbia" },
  seychelles: { code: "sc", name: "Seychelles" },
  singapore: { code: "sg", name: "Singapore" },
  slovakia: { code: "sk", name: "Slovakia" },
  slovenia: { code: "si", name: "Slovenia" },
  "solomon islands": { code: "sb", name: "Solomon Islands" },
  "south africa": { code: "za", name: "South Africa" },
  "south korea": { code: "kr", name: "South Korea" },
  "south sudan": { code: "ss", name: "South Sudan" },
  spain: { code: "es", name: "Spain" },
  "sri lanka": { code: "lk", name: "Sri Lanka" },
  sudan: { code: "sd", name: "Sudan" },
  suriname: { code: "sr", name: "Suriname" },
  sweden: { code: "se", name: "Sweden" },
  switzerland: { code: "ch", name: "Switzerland" },
  syria: { code: "sy", name: "Syria" },
  taiwan: { code: "tw", name: "Taiwan" },
  tajikistan: { code: "tj", name: "Tajikistan" },
  thailand: { code: "th", name: "Thailand" },
  "timor-leste": { code: "tl", name: "Timor-Leste" },
  "timor leste": { code: "tl", name: "Timor-Leste" },
  togo: { code: "tg", name: "Togo" },
  tonga: { code: "to", name: "Tonga" },
  "trinidad and tobago": { code: "tt", name: "Trinidad and Tobago" },
  tunisia: { code: "tn", name: "Tunisia" },
  turkey: { code: "tr", name: "Turkey" },
  turkmenistan: { code: "tm", name: "Turkmenistan" },
  tuvalu: { code: "tv", name: "Tuvalu" },
  uganda: { code: "ug", name: "Uganda" },
  "united arab emirates": { code: "ae", name: "United Arab Emirates" },
  uae: { code: "ae", name: "United Arab Emirates" },
  "united kingdom": { code: "gb", name: "United Kingdom" },
  "great britain": { code: "gb", name: "United Kingdom" },
  britain: { code: "gb", name: "United Kingdom" },
  uk: { code: "gb", name: "United Kingdom" },
  "united states": { code: "us", name: "United States" },
  "united states of america": { code: "us", name: "United States" },
  us: { code: "us", name: "United States" },
  usa: { code: "us", name: "United States" },
  uruguay: { code: "uy", name: "Uruguay" },
  uzbekistan: { code: "uz", name: "Uzbekistan" },
  vanuatu: { code: "vu", name: "Vanuatu" },
  venezuela: { code: "ve", name: "Venezuela" },
  vietnam: { code: "vn", name: "Vietnam" },
  yemen: { code: "ye", name: "Yemen" },
  zimbabwe: { code: "zw", name: "Zimbabwe" },
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\bthe\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const cleanVoiceAnswer = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.,!?;:()[\]{}"“”‘’]/g, " ")
    .replace(/\b(my answer is|the answer is|answer is|i think it is|i think|it is|it's)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const ignoredVoiceAnswers = new Set([
  "a",
  "an",
  "and",
  "but",
  "huh",
  "hm",
  "hmm",
  "like",
  "no",
  "oh",
  "okay",
  "ok",
  "so",
  "uh",
  "um",
  "yeah",
  "yes",
]);

const isProbablyIntentionalVoiceAnswer = (value: string) => {
  const normalizedValue = normalize(value);

  if (!normalizedValue || ignoredVoiceAnswers.has(normalizedValue)) {
    return false;
  }

  if (countryFlags[normalizedValue]) {
    return true;
  }

  if (/^\d+$/.test(normalizedValue)) {
    return normalizedValue.length > 1;
  }

  return normalizedValue.replace(/\s/g, "").length >= 2;
};

const getAnswerIdentity = (value: string) => {
  const normalizedValue = normalize(value);

  return countryFlags[normalizedValue]?.code ?? normalizedValue;
};

const formatAnswerLabel = (value: string) => {
  const normalizedValue = normalize(value);
  const country = countryFlags[normalizedValue];

  if (country) {
    return country.name;
  }

  return value
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      word.length <= 3 && word === word.toUpperCase()
        ? word
        : `${word.charAt(0).toUpperCase()}${word.slice(1)}`,
    )
    .join(" ");
};

const getAllAnswerLabels = (answers: string[]) =>
  answers.map(formatAnswerLabel).join(", ");

const getQuestionSeconds = (question: Question) =>
  question.type === "multi"
    ? question.required * MULTI_ANSWER_SECONDS_PER_ITEM
    : question.type === "ranking"
      ? question.answers.length * RANKING_SECONDS_PER_ITEM
    : SINGLE_ANSWER_SECONDS;

const openClassicQuestionGuidance: Record<string, string> = {
  "Name 5 mammals": "Accept any real mammal species or common mammal name.",
  "Name 5 fruits": "Accept any edible fruit or common culinary fruit.",
  "Name 4 sports played with a ball":
    "Accept any real sport or common game where a ball is central to play.",
};

const getOpenClassicQuestionGuidance = (question: Question) =>
  question.type === "multi" ? openClassicQuestionGuidance[question.prompt] : undefined;

const getClassicValidationGuidance = (question: MultiQuestion) =>
  getOpenClassicQuestionGuidance(question) ??
  "Accept only answers that correctly satisfy this exact trivia prompt. Be strict about the requested set, but accept common aliases, abbreviations, alternate spellings, and singular/plural forms.";

const isCloseTextAnswer = (guess: string, answers: string[]) => {
  if (guess.length < 3) {
    return false;
  }

  return answers.some((answer) => {
    const normalizedAnswer = normalize(answer);
    const answerWords = normalizedAnswer.split(" ");

    return (
      normalizedAnswer !== guess &&
      (normalizedAnswer.startsWith(guess) ||
        normalizedAnswer.includes(` ${guess}`) ||
        answerWords.some((word) => word.startsWith(guess)))
    );
  });
};

const numberWords: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const parseWrittenNumber = (value: string) => {
  const words = normalize(value.replace(/-/g, " ")).split(" ");
  let total = 0;
  let current = 0;
  let sawNumber = false;

  for (const word of words) {
    if (word === "and") {
      continue;
    }

    if (word in numberWords) {
      current += numberWords[word];
      sawNumber = true;
      continue;
    }

    if (word === "hundred") {
      current = Math.max(1, current) * 100;
      sawNumber = true;
      continue;
    }

    if (word === "thousand") {
      total += Math.max(1, current) * 1_000;
      current = 0;
      sawNumber = true;
      continue;
    }

    if (word === "million" || word === "millions") {
      total += Math.max(1, current) * 1_000_000;
      current = 0;
      sawNumber = true;
      continue;
    }

    if (word === "billion" || word === "billions") {
      total += Math.max(1, current) * 1_000_000_000;
      current = 0;
      sawNumber = true;
      continue;
    }
  }

  return sawNumber ? total + current : null;
};

const extractNumber = (value: string) => {
  const cleaned = value.toLowerCase().replace(/,/g, "").replace(/-/g, " ");
  const numericMatch = cleaned.match(
    /(\d+(\.\d+)?)\s*(billion|billions|bn|b|million|millions|mil|mn|m|thousand|thousands|k)?/,
  );

  if (numericMatch) {
    const number = Number(numericMatch[1]);
    const unit = numericMatch[3];

    if (unit === "billion" || unit === "billions" || unit === "bn" || unit === "b") {
      return number * 1_000_000_000;
    }

    if (
      unit === "million" ||
      unit === "millions" ||
      unit === "mil" ||
      unit === "mn" ||
      unit === "m"
    ) {
      return number * 1_000_000;
    }

    if (unit === "thousand" || unit === "thousands" || unit === "k") {
      return number * 1_000;
    }

    return number;
  }

  return parseWrittenNumber(cleaned);
};

const isCloseNumberAnswer = (guess: number, min: number, max: number) =>
  guess >= min * 0.85 && guess <= max * 1.15;

const getNumberTarget = (min: number, max: number) => (min + max) / 2;

const formatApproxNumber = (value: number) => {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  }

  if (absoluteValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (absoluteValue >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return Math.round(value).toLocaleString();
};

const getQuestionWeight = (question: Question) =>
  question.type === "multi"
    ? question.required
    : question.type === "ranking"
      ? question.answers.length
      : 1;

const getRankingAnswerPoints = (question: RankingQuestion, remainingSeconds: number) =>
  BASE_POINTS + Math.ceil(
    (remainingSeconds * TIME_BONUS_PER_SECOND) / Math.max(1, question.answers.length),
  );

const getRandomItem = <Item,>(items: Item[], fallback: Item) =>
  items.length ? items[Math.floor(Math.random() * items.length)] : fallback;

const moveArrayItem = <Item,>(items: Item[], fromIndex: number, toIndex: number) => {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);

  if (item === undefined) {
    return items;
  }

  nextItems.splice(toIndex, 0, item);

  return nextItems;
};

const getQuestionPoints = (question: Question, remainingSeconds: number) =>
  getQuestionWeight(question) * BASE_POINTS + remainingSeconds * TIME_BONUS_PER_SECOND;

const getMultiAnswerPoints = (question: MultiQuestion, remainingSeconds: number) =>
  BASE_POINTS + Math.ceil(
    (remainingSeconds * TIME_BONUS_PER_SECOND) / Math.max(1, question.required),
  );

const getNumberClosenessScore = (
  question: NumberQuestion,
  guess: number,
  remainingSeconds: number,
) => {
  const fullPoints = getQuestionPoints(question, remainingSeconds);

  if (guess >= question.min && guess <= question.max) {
    return fullPoints;
  }

  const closestEdge = guess < question.min ? question.min : question.max;
  const distanceToRange = Math.abs(guess - closestEdge);
  const closeMargin = guess < question.min ? question.min * 0.15 : question.max * 0.15;
  const closeness = Math.max(0, 1 - distanceToRange / closeMargin);

  return Math.round(fullPoints * Math.max(0.15, closeness * 0.75));
};

const capitalPairs = [
  ["France", ["paris"]],
  ["Japan", ["tokyo"]],
  ["Canada", ["ottawa"]],
  ["Australia", ["canberra"]],
  ["Brazil", ["brasilia", "brasília"]],
  ["Germany", ["berlin"]],
  ["Italy", ["rome", "roma"]],
  ["Spain", ["madrid"]],
  ["Portugal", ["lisbon", "lisboa"]],
  ["Mexico", ["mexico city", "ciudad de mexico", "cdmx"]],
  ["Egypt", ["cairo"]],
  ["India", ["new delhi", "delhi"]],
  ["China", ["beijing", "peking"]],
  ["South Korea", ["seoul"]],
  ["Argentina", ["buenos aires"]],
  ["Chile", ["santiago"]],
  ["Colombia", ["bogota", "bogotá"]],
  ["Peru", ["lima"]],
  ["South Africa", ["pretoria", "cape town", "bloemfontein"]],
  ["Nigeria", ["abuja"]],
  ["Kenya", ["nairobi"]],
  ["Morocco", ["rabat"]],
  ["Turkey", ["ankara"]],
  ["Greece", ["athens"]],
  ["Norway", ["oslo"]],
  ["Sweden", ["stockholm"]],
  ["Finland", ["helsinki"]],
  ["Denmark", ["copenhagen"]],
  ["Ireland", ["dublin"]],
  ["Netherlands", ["amsterdam"]],
] as const;

const populationQuestions: NumberQuestion[] = ([
  ["United States", 325000000, 345000000, "about 335 million"],
  ["India", 1380000000, 1460000000, "about 1.4 billion"],
  ["China", 1380000000, 1450000000, "about 1.4 billion"],
  ["Japan", 120000000, 127000000, "about 124 million"],
  ["Germany", 80000000, 86000000, "about 84 million"],
  ["United Kingdom", 65000000, 70000000, "about 68 million"],
  ["Mexico", 122000000, 132000000, "about 128 million"],
  ["Brazil", 205000000, 220000000, "about 213 million"],
  ["Nigeria", 215000000, 235000000, "about 225 million"],
  ["Australia", 25000000, 28000000, "about 27 million"],
] as const).map(([country, min, max, displayAnswer]) => ({
  category: "Countries",
  type: "number",
  kicker: "Population",
  prompt: `What is the population of ${country}?`,
  min,
  max,
  displayAnswer,
}));

const rawTextQuestions = [
  { category: "Science", prompt: "What planet is known as the Red Planet?", answers: ["mars"] },
  { category: "Science", prompt: "What gas do plants absorb from the air?", answers: ["carbon dioxide", "co2"] },
  { category: "Science", prompt: "What is the chemical symbol for gold?", answers: ["au", "gold"] },
  { category: "Science", prompt: "What is the largest planet in our solar system?", answers: ["jupiter"] },
  { category: "Science", prompt: "What force pulls objects toward Earth?", answers: ["gravity"] },
  { category: "Science", prompt: "What organ pumps blood through the body?", answers: ["heart", "the heart"] },
  { category: "Science", prompt: "What is H2O commonly called?", answers: ["water"] },
  { category: "Science", prompt: "What part of the cell contains DNA?", answers: ["nucleus", "the nucleus"] },
  { category: "Science", prompt: "What is the nearest star to Earth?", answers: ["sun", "the sun"] },
  { category: "Science", prompt: "What gas do humans need to breathe?", answers: ["oxygen", "o2"] },
  { category: "Sports", prompt: "How many players are on a soccer team on the field?", answers: ["11", "eleven"] },
  { category: "Sports", prompt: "What sport uses a puck?", answers: ["hockey", "ice hockey"] },
  { category: "Sports", prompt: "What sport is Wimbledon known for?", answers: ["tennis"] },
  { category: "Sports", prompt: "What sport uses a bat and wickets?", answers: ["cricket"] },
  { category: "Sports", prompt: "What sport is the Super Bowl championship for?", answers: ["american football", "football", "nfl"] },
  { category: "Animals", prompt: "What is the fastest land animal?", answers: ["cheetah"] },
  { category: "Animals", prompt: "What is the largest animal on Earth?", answers: ["blue whale"] },
  { category: "Animals", prompt: "What animal is known as the king of the jungle?", answers: ["lion"] },
  { category: "Animals", prompt: "What animal is a panda?", answers: ["bear", "a bear"] },
  { category: "Animals", prompt: "What bird cannot fly and lives in Antarctica?", answers: ["penguin"] },
  { category: "History", prompt: "Who was the first president of the United States?", answers: ["george washington", "washington"] },
  { category: "History", prompt: "In what city was the Declaration of Independence signed?", answers: ["philadelphia"] },
  { category: "History", prompt: "What wall divided Berlin during the Cold War?", answers: ["berlin wall", "the berlin wall"] },
  { category: "History", prompt: "Who was the first person to walk on the Moon?", answers: ["neil armstrong", "armstrong"] },
  { category: "History", prompt: "What ancient civilization built the pyramids at Giza?", answers: ["egyptians", "ancient egyptians", "egypt"] },
  { category: "Food", prompt: "What is sushi traditionally wrapped in?", answers: ["seaweed", "nori"] },
  { category: "Food", prompt: "What fruit is used to make guacamole?", answers: ["avocado"] },
  { category: "Food", prompt: "What country is pizza most associated with?", answers: ["italy"] },
  { category: "Food", prompt: "What bean is used to make hummus?", answers: ["chickpea", "chickpeas", "garbanzo", "garbanzo beans"] },
  { category: "Food", prompt: "What spice gives curry its yellow color?", answers: ["turmeric"] },
  { category: "Music", prompt: "Who is known as the King of Pop?", answers: ["michael jackson", "jackson"] },
  { category: "Music", prompt: "What band released Hey Jude?", answers: ["beatles", "the beatles"] },
  { category: "Music", prompt: "What instrument has black and white keys?", answers: ["piano"] },
  { category: "Music", prompt: "Who sang Rolling in the Deep?", answers: ["adele"] },
  { category: "Music", prompt: "What composer wrote the Fifth Symphony?", answers: ["beethoven", "ludwig van beethoven"] },
  { category: "Movies & TV", prompt: "What movie features a character named Darth Vader?", answers: ["star wars"] },
  { category: "Movies & TV", prompt: "What movie has the song Let It Go?", answers: ["frozen"] },
  { category: "Movies & TV", prompt: "What TV show features the character SpongeBob?", answers: ["spongebob squarepants", "spongebob"] },
  { category: "Movies & TV", prompt: "What movie features a wizard school called Hogwarts?", answers: ["harry potter"] },
  { category: "Movies & TV", prompt: "What movie features the line I'll be back?", answers: ["terminator", "the terminator"] },
  { category: "People", prompt: "Who painted the Mona Lisa?", answers: ["leonardo da vinci", "da vinci"] },
  { category: "People", prompt: "Who wrote Romeo and Juliet?", answers: ["william shakespeare", "shakespeare"] },
  { category: "People", prompt: "Who developed the theory of relativity?", answers: ["albert einstein", "einstein"] },
  { category: "People", prompt: "Who founded Microsoft with Paul Allen?", answers: ["bill gates", "gates"] },
  { category: "People", prompt: "Who was known as the Queen of Soul?", answers: ["aretha franklin", "aretha"] },
  { category: "Landmarks", prompt: "What landmark is in Paris and made of iron lattice?", answers: ["eiffel tower", "the eiffel tower"] },
  { category: "Landmarks", prompt: "What ancient landmark is in Agra, India?", answers: ["taj mahal", "the taj mahal"] },
  { category: "Landmarks", prompt: "What landmark is a giant amphitheater in Rome?", answers: ["colosseum", "the colosseum"] },
  { category: "Landmarks", prompt: "What landmark is a clock tower in London?", answers: ["big ben", "elizabeth tower"] },
  { category: "Landmarks", prompt: "What landmark is a statue in New York Harbor?", answers: ["statue of liberty", "the statue of liberty"] },
] as const;

const properTriviaQuestions = [
  { category: "Songs", prompt: "What song spent 19 weeks at number one on the Billboard Hot 100 in 2019?", answers: ["old town road", "old town road remix"] },
  { category: "Songs", prompt: "What The Weeknd song became a record-breaking 2020s Hot 100 hit?", answers: ["blinding lights"] },
  { category: "Songs", prompt: "What Olivia Rodrigo debut single became a huge 2021 breakout hit?", answers: ["drivers license", "driver's license"] },
  { category: "Songs", prompt: "What Kate Bush song returned to the charts after Stranger Things used it in 2022?", answers: ["running up that hill", "running up that hill a deal with god"] },
  { category: "Songs", prompt: "What Celine Dion song from Titanic became one of the biggest movie ballads ever?", answers: ["my heart will go on"] },
  { category: "Songs", prompt: "What Queen song returned to the Hot 100 top 10 after Wayne's World?", answers: ["bohemian rhapsody"] },
  { category: "Songs", prompt: "What song was the first music video ever played on MTV?", answers: ["video killed the radio star"] },
  { category: "Songs", prompt: "What Beyonce song was the lead single from Lemonade?", answers: ["formation"] },
  { category: "Songs", prompt: "What Adele song begins with the word Hello and became a massive 2015 hit?", answers: ["hello"] },
  { category: "Songs", prompt: "What Journey song became a streaming-era anthem decades after release?", answers: ["don't stop believin", "dont stop believin", "don't stop believing", "dont stop believing"] },
  { category: "Songs", prompt: "What Luis Fonsi and Daddy Yankee song had a massive Justin Bieber remix?", answers: ["despacito"] },
  { category: "Songs", prompt: "What Billie Eilish song became a number one hit in 2019?", answers: ["bad guy"] },
  { category: "Songs", prompt: "What Miley Cyrus song became a major 2023 comeback hit?", answers: ["flowers"] },
  { category: "Songs", prompt: "What Pharrell Williams song from Despicable Me 2 became a global hit?", answers: ["happy"] },
  { category: "Songs", prompt: "What song by Mark Ronson and Bruno Mars topped the Hot 100 for 14 weeks?", answers: ["uptown funk"] },

  { category: "Music", prompt: "What Michael Jackson album is often cited as the best-selling album of all time?", answers: ["thriller"] },
  { category: "Music", prompt: "Who produced Thriller with Michael Jackson?", answers: ["quincy jones"] },
  { category: "Music", prompt: "What Nirvana album includes Smells Like Teen Spirit?", answers: ["nevermind"] },
  { category: "Music", prompt: "What city is widely considered the birthplace of hip hop?", answers: ["bronx", "the bronx", "new york", "new york city", "nyc"] },
  { category: "Music", prompt: "What rapper won the 2018 Pulitzer Prize for Music for DAMN.?", answers: ["kendrick lamar", "kendrick"] },
  { category: "Music", prompt: "What Taylor Swift album won the Grammy for Album of the Year in 2021?", answers: ["folklore"] },
  { category: "Music", prompt: "What Daft Punk album won the Grammy for Album of the Year in 2014?", answers: ["random access memories"] },
  { category: "Music", prompt: "What artist is associated with the album Purple Rain?", answers: ["prince"] },
  { category: "Music", prompt: "What band released the album Abbey Road?", answers: ["beatles", "the beatles"] },
  { category: "Music", prompt: "What singer released the album Back to Black?", answers: ["amy winehouse", "winehouse"] },
  { category: "Music", prompt: "What genre did Black Sabbath help pioneer?", answers: ["heavy metal", "metal"] },
  { category: "Music", prompt: "What festival became legendary after taking place in upstate New York in 1969?", answers: ["woodstock"] },

  { category: "Movies & TV", prompt: "What movie won Best Picture at the Oscars after a mistaken La La Land announcement?", answers: ["moonlight"] },
  { category: "Movies & TV", prompt: "What movie became the first non-English-language film to win Best Picture?", answers: ["parasite"] },
  { category: "Movies & TV", prompt: "What streaming series made Red Light, Green Light a global pop-culture moment?", answers: ["squid game"] },
  { category: "Movies & TV", prompt: "What HBO series features the Stark, Lannister, and Targaryen families?", answers: ["game of thrones", "got"] },
  { category: "Movies & TV", prompt: "What sitcom's finale was watched by more than 50 million US viewers in 2004?", answers: ["friends"] },
  { category: "Movies & TV", prompt: "What show features Walter White and Jesse Pinkman?", answers: ["breaking bad"] },
  { category: "Movies & TV", prompt: "What movie franchise has the Infinity Stones?", answers: ["marvel", "marvel cinematic universe", "mcu", "avengers"] },
  { category: "Movies & TV", prompt: "What movie features the fictional metal vibranium?", answers: ["black panther"] },
  { category: "Movies & TV", prompt: "What Pixar movie centers on emotions named Joy, Sadness, Anger, Fear, and Disgust?", answers: ["inside out"] },
  { category: "Movies & TV", prompt: "What Netflix show follows Hawkins, Indiana and the Upside Down?", answers: ["stranger things"] },
  { category: "Movies & TV", prompt: "What film popularized the line, I see dead people?", answers: ["sixth sense", "the sixth sense"] },
  { category: "Movies & TV", prompt: "What reality show franchise is known for roses and hometown dates?", answers: ["the bachelor", "bachelor", "the bachelorette", "bachelorette"] },

  { category: "Sports", prompt: "What NBA team won 73 regular-season games in 2015-16?", answers: ["golden state warriors", "warriors"] },
  { category: "Sports", prompt: "Who has won the most Olympic gold medals?", answers: ["michael phelps", "phelps"] },
  { category: "Sports", prompt: "What country won the 2022 FIFA World Cup?", answers: ["argentina"] },
  { category: "Sports", prompt: "What tennis player completed the Golden Slam in 1988?", answers: ["steffi graf", "graf"] },
  { category: "Sports", prompt: "What NFL team completed a perfect season in 1972?", answers: ["miami dolphins", "dolphins"] },
  { category: "Sports", prompt: "What city hosts the Kentucky Derby?", answers: ["louisville"] },
  { category: "Sports", prompt: "What golfer is nicknamed the Golden Bear?", answers: ["jack nicklaus", "nicklaus"] },
  { category: "Sports", prompt: "What country is famous for the All Blacks rugby team?", answers: ["new zealand"] },

  { category: "Science", prompt: "What telescope delivered the first deep-field images from the early universe after launching in 2021?", answers: ["james webb space telescope", "webb", "jwst"] },
  { category: "Science", prompt: "What gene-editing technology is often described as molecular scissors?", answers: ["crispr", "crispr cas9", "crispr-cas9"] },
  { category: "Science", prompt: "What particle was confirmed at CERN in 2012?", answers: ["higgs boson", "higgs"] },
  { category: "Science", prompt: "What mission first landed humans on the Moon?", answers: ["apollo 11", "apollo eleven"] },
  { category: "Science", prompt: "What unit measures electrical resistance?", answers: ["ohm", "ohms"] },
  { category: "Science", prompt: "What layer of Earth's atmosphere contains most weather?", answers: ["troposphere"] },
  { category: "Science", prompt: "What is the hardest natural substance?", answers: ["diamond"] },

  { category: "Food", prompt: "What city is associated with deep-dish pizza?", answers: ["chicago"] },
  { category: "Food", prompt: "What Japanese soup commonly uses dashi and fermented soybean paste?", answers: ["miso soup", "miso"] },
  { category: "Food", prompt: "What French term means everything is prepared and in place before cooking?", answers: ["mise en place"] },
  { category: "Food", prompt: "What country is credited as the birthplace of espresso?", answers: ["italy"] },
  { category: "Food", prompt: "What sauce is traditionally used on eggs Benedict?", answers: ["hollandaise", "hollandaise sauce"] },
  { category: "Food", prompt: "What grain is used to make risotto?", answers: ["arborio", "arborio rice", "rice"] },
  { category: "Food", prompt: "What Mexican dish is made by folding a tortilla around a filling?", answers: ["taco", "tacos"] },

  { category: "History", prompt: "What scandal led to Richard Nixon's resignation?", answers: ["watergate"] },
  { category: "History", prompt: "What year did the Berlin Wall fall?", answers: ["1989", "nineteen eighty nine"] },
  { category: "History", prompt: "What empire was ruled by Augustus?", answers: ["roman empire", "rome"] },
  { category: "History", prompt: "What ship sank in 1912 after hitting an iceberg?", answers: ["titanic", "rms titanic"] },
  { category: "History", prompt: "What ancient trade route connected China with the Mediterranean world?", answers: ["silk road", "the silk road"] },
  { category: "History", prompt: "What US movement used sit-ins, marches, and boycotts to fight segregation?", answers: ["civil rights movement", "the civil rights movement"] },

  { category: "People", prompt: "Who became the first woman to win a Nobel Prize?", answers: ["marie curie", "curie"] },
  { category: "People", prompt: "Who founded SpaceX?", answers: ["elon musk", "musk"] },
  { category: "People", prompt: "Who wrote Beloved and won the Nobel Prize in Literature?", answers: ["toni morrison", "morrison"] },
  { category: "People", prompt: "Who was the first Black president of South Africa?", answers: ["nelson mandela", "mandela"] },
  { category: "People", prompt: "Who is known for the Theory of General Relativity?", answers: ["albert einstein", "einstein"] },

  { category: "Geography", prompt: "What country has the most time zones including overseas territories?", answers: ["france"] },
  { category: "Geography", prompt: "What desert is the largest hot desert in the world?", answers: ["sahara", "sahara desert"] },
  { category: "Geography", prompt: "What river flows through Baghdad?", answers: ["tigris", "tigris river"] },
  { category: "Geography", prompt: "What mountain range separates Europe and Asia in Russia?", answers: ["ural mountains", "urals"] },
  { category: "Geography", prompt: "What sea lies between Europe and Africa?", answers: ["mediterranean", "mediterranean sea"] },
] as const;

const textQuestions: TextQuestion[] = [...rawTextQuestions, ...properTriviaQuestions].map((question) => ({
  ...question,
  type: "text",
  kicker: categoryMeta[question.category].label,
  answers: [...question.answers],
}));

const rankingQuestions: RankingQuestion[] = [
  {
    category: "Science",
    type: "ranking",
    kicker: "Ranking",
    prompt: "Name the planets from the Sun outward",
    answers: ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"],
  },
  {
    category: "History",
    type: "ranking",
    kicker: "Ranking",
    prompt: "Name these US presidents in order from earliest to latest: Washington, Lincoln, Roosevelt, Obama",
    answers: ["george washington", "abraham lincoln", "franklin roosevelt", "barack obama"],
  },
  {
    category: "Geography",
    type: "ranking",
    kicker: "Ranking",
    prompt: "Name these countries by population from largest to smallest: India, United States, Brazil, Japan",
    answers: ["india", "united states", "brazil", "japan"],
  },
  {
    category: "Science",
    type: "ranking",
    kicker: "Ranking",
    prompt: "Name these units from smallest to largest: centimeter, meter, kilometer",
    answers: ["centimeter", "meter", "kilometer"],
  },
  {
    category: "Movies & TV",
    type: "ranking",
    kicker: "Ranking",
    prompt: "Name the original Star Wars trilogy movies in release order",
    answers: ["a new hope", "the empire strikes back", "return of the jedi"],
  },
  {
    category: "Songs",
    type: "ranking",
    kicker: "Ranking",
    prompt: "Name these Billboard hits from earliest to latest: Bohemian Rhapsody, Uptown Funk, Old Town Road",
    answers: ["bohemian rhapsody", "uptown funk", "old town road"],
  },
];

const landmarkImageQuestions: TextQuestion[] = [
  {
    category: "Landmarks",
    type: "text",
    kicker: "Landmarks",
    prompt: "What landmark is this?",
    image: {
      src: "/trivia/mount-fuji.jpg",
      alt: "Mount Fuji",
    },
    answers: ["mount fuji", "fuji", "fuji mountain"],
  },
  {
    category: "Landmarks",
    type: "text",
    kicker: "Landmarks",
    prompt: "What landmark is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Tour_Eiffel_Wikimedia_Commons.jpg",
      alt: "Eiffel Tower",
    },
    answers: ["eiffel tower", "the eiffel tower"],
  },
  {
    category: "Landmarks",
    type: "text",
    kicker: "Landmarks",
    prompt: "What landmark is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Taj_Mahal_(Edited).jpeg",
      alt: "Taj Mahal",
    },
    answers: ["taj mahal", "the taj mahal"],
  },
  {
    category: "Landmarks",
    type: "text",
    kicker: "Landmarks",
    prompt: "What landmark is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Colosseum_in_Rome,_Italy_-_April_2007.jpg",
      alt: "Colosseum",
    },
    answers: ["colosseum", "the colosseum", "roman colosseum"],
  },
  {
    category: "Landmarks",
    type: "text",
    kicker: "Landmarks",
    prompt: "What landmark is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Statue_of_Liberty_7.jpg",
      alt: "Statue of Liberty",
    },
    answers: ["statue of liberty", "the statue of liberty", "liberty statue"],
  },
];

const visualImageQuestions: TextQuestion[] = [
  {
    category: "Animals",
    type: "text",
    kicker: "Animals",
    prompt: "What animal is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Cheetah_Kruger.jpg",
      alt: "Cheetah",
    },
    answers: ["cheetah"],
  },
  {
    category: "Animals",
    type: "text",
    kicker: "Animals",
    prompt: "What animal is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Blue_Whale_001_body_bw.jpg",
      alt: "Blue whale",
    },
    answers: ["blue whale", "whale"],
  },
  {
    category: "Animals",
    type: "text",
    kicker: "Animals",
    prompt: "What animal is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Giant_Panda_Eating.jpg",
      alt: "Giant panda",
    },
    answers: ["panda", "giant panda"],
  },
  {
    category: "Food",
    type: "text",
    kicker: "Food",
    prompt: "What food is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Sushi_platter.jpg",
      alt: "Sushi platter",
    },
    answers: ["sushi"],
  },
  {
    category: "Food",
    type: "text",
    kicker: "Food",
    prompt: "What food is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Guacamole.jpg",
      alt: "Guacamole",
    },
    answers: ["guacamole"],
  },
  {
    category: "Food",
    type: "text",
    kicker: "Food",
    prompt: "What food is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Hummus_from_The_Nile.jpg",
      alt: "Hummus",
    },
    answers: ["hummus"],
  },
  {
    category: "Science",
    type: "text",
    kicker: "Science",
    prompt: "What planet is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Mars_Valles_Marineris.jpeg",
      alt: "Mars",
    },
    answers: ["mars"],
  },
  {
    category: "Science",
    type: "text",
    kicker: "Science",
    prompt: "What planet is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Jupiter_and_its_shrunken_Great_Red_Spot.jpg",
      alt: "Jupiter",
    },
    answers: ["jupiter"],
  },
  {
    category: "Science",
    type: "text",
    kicker: "Science",
    prompt: "What organ is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Heart_anterior_external_view.jpg",
      alt: "Human heart model",
    },
    answers: ["heart", "human heart"],
  },
  {
    category: "Sports",
    type: "text",
    kicker: "Sports",
    prompt: "What sport uses this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Tennis_Racket_and_Balls.jpg",
      alt: "Tennis racket and balls",
    },
    answers: ["tennis"],
  },
  {
    category: "Sports",
    type: "text",
    kicker: "Sports",
    prompt: "What sport uses this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Cricket_bat_and_ball.jpg",
      alt: "Cricket bat and ball",
    },
    answers: ["cricket"],
  },
  {
    category: "Music",
    type: "text",
    kicker: "Music",
    prompt: "What instrument is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Steinway_%26_Sons_grand_piano.jpg",
      alt: "Grand piano",
    },
    answers: ["piano", "grand piano"],
  },
  {
    category: "Music",
    type: "text",
    kicker: "Music",
    prompt: "What instrument is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Violin_VL100.png",
      alt: "Violin",
    },
    answers: ["violin"],
  },
  {
    category: "Geography",
    type: "text",
    kicker: "Geography",
    prompt: "What country is outlined here?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/France_-_Location_Map_(2013)_-_FRA_-_UNOCHA.svg",
      alt: "France outline map",
    },
    answers: ["france"],
  },
  {
    category: "History",
    type: "text",
    kicker: "History",
    prompt: "Who is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/George_Washington_by_Gilbert_Stuart,_1795-96.png",
      alt: "George Washington portrait",
    },
    answers: ["george washington", "washington"],
  },
  {
    category: "People",
    type: "text",
    kicker: "People",
    prompt: "Who is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Bill_Gates_2018.jpg",
      alt: "Bill Gates",
    },
    answers: ["bill gates", "gates"],
  },
  {
    category: "Animals",
    type: "text",
    kicker: "Animals",
    prompt: "What animal is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/African_Bush_Elephant.jpg",
      alt: "African elephant",
    },
    answers: ["elephant", "african elephant", "african bush elephant"],
  },
  {
    category: "Animals",
    type: "text",
    kicker: "Animals",
    prompt: "What animal is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Giraffe_standing.jpg",
      alt: "Giraffe",
    },
    answers: ["giraffe"],
  },
  {
    category: "Animals",
    type: "text",
    kicker: "Animals",
    prompt: "What animal is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Bald_Eagle_Portrait.jpg",
      alt: "Bald eagle",
    },
    answers: ["bald eagle", "eagle"],
  },
  {
    category: "Animals",
    type: "text",
    kicker: "Animals",
    prompt: "What animal is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Red_Fox.jpg",
      alt: "Red fox",
    },
    answers: ["fox", "red fox"],
  },
  {
    category: "Animals",
    type: "text",
    kicker: "Animals",
    prompt: "What animal is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Polar_Bear_AdF.jpg",
      alt: "Polar bear",
    },
    answers: ["polar bear", "bear"],
  },
  {
    category: "Animals",
    type: "text",
    kicker: "Animals",
    prompt: "What animal is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Tiger_in_Ranthambhore.jpg",
      alt: "Tiger",
    },
    answers: ["tiger"],
  },
  {
    category: "Animals",
    type: "text",
    kicker: "Animals",
    prompt: "What animal is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Koala_climbing_tree.jpg",
      alt: "Koala",
    },
    answers: ["koala"],
  },
  {
    category: "Food",
    type: "text",
    kicker: "Food",
    prompt: "What food is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Margherita_pizza.jpg",
      alt: "Margherita pizza",
    },
    answers: ["pizza", "margherita pizza"],
  },
  {
    category: "Food",
    type: "text",
    kicker: "Food",
    prompt: "What food is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Hamburger_(black_bg).jpg",
      alt: "Hamburger",
    },
    answers: ["hamburger", "burger"],
  },
  {
    category: "Food",
    type: "text",
    kicker: "Food",
    prompt: "What food is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Paella_de_marisco_01.jpg",
      alt: "Paella",
    },
    answers: ["paella"],
  },
  {
    category: "Food",
    type: "text",
    kicker: "Food",
    prompt: "What food is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Tonkotsu_Ramen.jpg",
      alt: "Ramen",
    },
    answers: ["ramen"],
  },
  {
    category: "Food",
    type: "text",
    kicker: "Food",
    prompt: "What food is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Falafel_pita.jpg",
      alt: "Falafel pita",
    },
    answers: ["falafel", "falafel pita"],
  },
  {
    category: "Food",
    type: "text",
    kicker: "Food",
    prompt: "What food is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Baklava(1).png",
      alt: "Baklava",
    },
    answers: ["baklava"],
  },
  {
    category: "Science",
    type: "text",
    kicker: "Science",
    prompt: "What moon is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/FullMoon2010.jpg",
      alt: "Full moon",
    },
    answers: ["moon", "the moon", "full moon"],
  },
  {
    category: "Science",
    type: "text",
    kicker: "Science",
    prompt: "What planet is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Earth_seen_from_Apollo_17.jpg",
      alt: "Earth from space",
    },
    answers: ["earth", "planet earth"],
  },
  {
    category: "Science",
    type: "text",
    kicker: "Science",
    prompt: "What galaxy is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Andromeda_Galaxy_(with_h-alpha).jpg",
      alt: "Andromeda Galaxy",
    },
    answers: ["andromeda", "andromeda galaxy"],
  },
  {
    category: "Science",
    type: "text",
    kicker: "Science",
    prompt: "What molecule is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/DNA_Overview.png",
      alt: "DNA diagram",
    },
    answers: ["dna"],
  },
  {
    category: "Science",
    type: "text",
    kicker: "Science",
    prompt: "What lab tool is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Microscope_(PSF).png",
      alt: "Microscope",
    },
    answers: ["microscope"],
  },
  {
    category: "Science",
    type: "text",
    kicker: "Science",
    prompt: "What space station is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/International_Space_Station_after_undocking_of_STS-132.jpg",
      alt: "International Space Station",
    },
    answers: ["international space station", "iss"],
  },
  {
    category: "Sports",
    type: "text",
    kicker: "Sports",
    prompt: "What sport uses this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Soccer_ball.svg",
      alt: "Soccer ball",
    },
    answers: ["soccer", "football", "association football"],
  },
  {
    category: "Sports",
    type: "text",
    kicker: "Sports",
    prompt: "What sport uses this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Basketball.png",
      alt: "Basketball",
    },
    answers: ["basketball"],
  },
  {
    category: "Sports",
    type: "text",
    kicker: "Sports",
    prompt: "What sport uses this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Baseball_(crop).jpg",
      alt: "Baseball",
    },
    answers: ["baseball"],
  },
  {
    category: "Sports",
    type: "text",
    kicker: "Sports",
    prompt: "What sport uses this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Golf_ball.jpg",
      alt: "Golf ball",
    },
    answers: ["golf"],
  },
  {
    category: "Sports",
    type: "text",
    kicker: "Sports",
    prompt: "What sport uses this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Ice_hockey_puck.jpg",
      alt: "Hockey puck",
    },
    answers: ["hockey", "ice hockey"],
  },
  {
    category: "Music",
    type: "text",
    kicker: "Music",
    prompt: "What instrument is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Gibson_Les_Paul_54_Custom.jpg",
      alt: "Electric guitar",
    },
    answers: ["guitar", "electric guitar"],
  },
  {
    category: "Music",
    type: "text",
    kicker: "Music",
    prompt: "What instrument is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Drum_set.svg",
      alt: "Drum kit",
    },
    answers: ["drums", "drum kit", "drum set"],
  },
  {
    category: "Music",
    type: "text",
    kicker: "Music",
    prompt: "What instrument is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Saxophone_alto.jpg",
      alt: "Saxophone",
    },
    answers: ["saxophone", "alto saxophone", "sax"],
  },
  {
    category: "Music",
    type: "text",
    kicker: "Music",
    prompt: "What instrument is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Trumpet_1.jpg",
      alt: "Trumpet",
    },
    answers: ["trumpet"],
  },
  {
    category: "Music",
    type: "text",
    kicker: "Music",
    prompt: "What instrument is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Harp.png",
      alt: "Harp",
    },
    answers: ["harp"],
  },
  {
    category: "People",
    type: "text",
    kicker: "People",
    prompt: "Who is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Marie_Curie_c1920.jpg",
      alt: "Marie Curie",
    },
    answers: ["marie curie", "curie"],
  },
  {
    category: "People",
    type: "text",
    kicker: "People",
    prompt: "Who is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Nelson_Mandela_1994.jpg",
      alt: "Nelson Mandela",
    },
    answers: ["nelson mandela", "mandela"],
  },
  {
    category: "People",
    type: "text",
    kicker: "People",
    prompt: "Who is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Toni_Morrison_2008-2.jpg",
      alt: "Toni Morrison",
    },
    answers: ["toni morrison", "morrison"],
  },
  {
    category: "People",
    type: "text",
    kicker: "People",
    prompt: "Who is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Elon_Musk_Royal_Society_(crop2).jpg",
      alt: "Elon Musk",
    },
    answers: ["elon musk", "musk"],
  },
  {
    category: "History",
    type: "text",
    kicker: "History",
    prompt: "What ship is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/RMS_Titanic_3.jpg",
      alt: "RMS Titanic",
    },
    answers: ["titanic", "rms titanic"],
  },
  {
    category: "History",
    type: "text",
    kicker: "History",
    prompt: "What structure is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Berlinermauer.jpg",
      alt: "Berlin Wall",
    },
    answers: ["berlin wall", "the berlin wall"],
  },
  {
    category: "History",
    type: "text",
    kicker: "History",
    prompt: "What mission is this associated with?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Apollo_11_Crew.jpg",
      alt: "Apollo 11 crew",
    },
    answers: ["apollo 11", "apollo eleven"],
  },
  {
    category: "Geography",
    type: "text",
    kicker: "Geography",
    prompt: "What country is outlined here?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Brazil_(orthographic_projection).svg",
      alt: "Brazil location map",
    },
    answers: ["brazil"],
  },
  {
    category: "Geography",
    type: "text",
    kicker: "Geography",
    prompt: "What country is outlined here?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Japan_(orthographic_projection).svg",
      alt: "Japan location map",
    },
    answers: ["japan"],
  },
  {
    category: "Geography",
    type: "text",
    kicker: "Geography",
    prompt: "What country is outlined here?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/India_(orthographic_projection).svg",
      alt: "India location map",
    },
    answers: ["india"],
  },
  {
    category: "Landmarks",
    type: "text",
    kicker: "Landmarks",
    prompt: "What landmark is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Great_Wall_of_China_July_2006.JPG",
      alt: "Great Wall of China",
    },
    answers: ["great wall", "great wall of china", "the great wall of china"],
  },
  {
    category: "Landmarks",
    type: "text",
    kicker: "Landmarks",
    prompt: "What landmark is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Machu_Picchu,_Peru.jpg",
      alt: "Machu Picchu",
    },
    answers: ["machu picchu"],
  },
  {
    category: "Landmarks",
    type: "text",
    kicker: "Landmarks",
    prompt: "What landmark is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Pyramids_of_the_Giza_Necropolis.jpg",
      alt: "Pyramids of Giza",
    },
    answers: ["pyramids", "pyramids of giza", "giza pyramids"],
  },
  {
    category: "Landmarks",
    type: "text",
    kicker: "Landmarks",
    prompt: "What landmark is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Sydney_Opera_House_Sails.jpg",
      alt: "Sydney Opera House",
    },
    answers: ["sydney opera house", "opera house"],
  },
  {
    category: "Landmarks",
    type: "text",
    kicker: "Landmarks",
    prompt: "What landmark is this?",
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Christ_the_Redeemer_-_Cristo_Redentor.jpg",
      alt: "Christ the Redeemer",
    },
    answers: ["christ the redeemer", "cristo redentor"],
  },
];

const capitalQuestions: TextQuestion[] = capitalPairs.map(([country, answers]) => ({
  category: "Capitals",
  type: "text",
  kicker: "Capitals",
  prompt: `What is the capital of ${country}?`,
  answers: [...answers],
}));

const uniqueCountryEntries = Object.entries(countryFlags).filter(
  ([, country], index, countries) =>
    countries.findIndex(([, candidate]) => candidate.code === country.code) === index,
);

const getCountryAnswerAliases = (countryCode: string, countryName: string) =>
  Array.from(
    new Set([
      countryName,
      ...Object.entries(countryFlags)
        .filter(([, country]) => country.code === countryCode)
        .map(([answer]) => answer),
    ]),
  );

const extraAnswerAliases: Record<string, string[]> = {
  america: ["united states", "united states of america", "us", "usa"],
  "u s": ["united states", "united states of america", "us", "usa"],
  "u s a": ["united states", "united states of america", "us", "usa"],
  uk: ["united kingdom", "great britain", "britain"],
  "great britain": ["united kingdom", "uk", "britain"],
  britain: ["united kingdom", "uk", "great britain"],
  "united kingdom": ["uk", "great britain", "britain"],
  uae: ["united arab emirates"],
  "united arab emirates": ["uae"],
  "czech republic": ["czechia"],
  czechia: ["czech republic"],
  "timor-leste": ["timor leste"],
  "timor leste": ["timor-leste"],
  "cape verde": ["cabo verde"],
  "cabo verde": ["cape verde"],
  myanmar: ["burma"],
  burma: ["myanmar"],
  russia: ["russian federation"],
  "russian federation": ["russia"],
  china: ["prc", "people's republic of china", "peoples republic of china"],
  prc: ["china", "people's republic of china", "peoples republic of china"],
};

const getAnswerAliases = (answer: string) => {
  const normalizedAnswer = normalize(answer);
  const country = countryFlags[normalizedAnswer];
  const aliases = new Set([answer, normalizedAnswer]);

  if (country) {
    getCountryAnswerAliases(country.code, country.name).forEach((alias) =>
      aliases.add(alias),
    );
  }

  extraAnswerAliases[normalizedAnswer]?.forEach((alias) => aliases.add(alias));

  return Array.from(aliases);
};

const expandAnswerAliases = (answers: string[]) =>
  Array.from(new Set(answers.flatMap(getAnswerAliases)));

const flagQuestions: TextQuestion[] = uniqueCountryEntries.map(([, country]) => ({
    category: "Flags",
    type: "text",
    kicker: "Flags",
    prompt: "What country is this flag?",
    image: {
      src: `https://flagcdn.com/w640/${country.code}.png`,
      alt: `${country.name} flag`,
    },
    answers: getCountryAnswerAliases(country.code, country.name),
  }));

const planets = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];

const g7Countries = [
  "canada",
  "france",
  "germany",
  "italy",
  "japan",
  "united kingdom",
  "uk",
  "united states",
  "usa",
];

const nordicCountries = [
  "denmark",
  "finland",
  "iceland",
  "norway",
  "sweden",
];

const balticCountries = ["estonia", "latvia", "lithuania"];

const beneluxCountries = ["belgium", "netherlands", "luxembourg"];

const unitedKingdomCountries = [
  "england",
  "scotland",
  "wales",
  "northern ireland",
];

const permanentSecurityCouncilCountries = [
  "china",
  "france",
  "russia",
  "united kingdom",
  "uk",
  "united states",
  "usa",
];

const oceans = [
  "atlantic",
  "atlantic ocean",
  "pacific",
  "pacific ocean",
  "indian",
  "indian ocean",
  "arctic",
  "arctic ocean",
  "southern",
  "southern ocean",
];

const continents = [
  "africa",
  "antarctica",
  "asia",
  "europe",
  "north america",
  "south america",
  "australia",
  "oceania",
];

const greatLakes = [
  "superior",
  "lake superior",
  "michigan",
  "lake michigan",
  "huron",
  "lake huron",
  "erie",
  "lake erie",
  "ontario",
  "lake ontario",
];

const countriesBorderingUnitedStates = ["canada", "mexico"];

const countriesBorderingFrance = [
  "belgium",
  "luxembourg",
  "germany",
  "switzerland",
  "italy",
  "monaco",
  "spain",
  "andorra",
];

const countriesBorderingBrazil = [
  "argentina",
  "bolivia",
  "colombia",
  "france",
  "french guiana",
  "guyana",
  "paraguay",
  "peru",
  "suriname",
  "uruguay",
  "venezuela",
];

const countriesBorderingIndia = [
  "bangladesh",
  "bhutan",
  "china",
  "myanmar",
  "burma",
  "nepal",
  "pakistan",
];

const countriesBorderingChina = [
  "afghanistan",
  "bhutan",
  "india",
  "kazakhstan",
  "north korea",
  "kyrgyzstan",
  "laos",
  "mongolia",
  "myanmar",
  "burma",
  "nepal",
  "pakistan",
  "russia",
  "tajikistan",
  "vietnam",
];

const countriesBorderingRussia = [
  "azerbaijan",
  "belarus",
  "china",
  "estonia",
  "finland",
  "georgia",
  "kazakhstan",
  "north korea",
  "latvia",
  "lithuania",
  "mongolia",
  "norway",
  "poland",
  "ukraine",
];

const countriesBorderingSouthAfrica = [
  "botswana",
  "eswatini",
  "lesotho",
  "mozambique",
  "namibia",
  "zimbabwe",
];

const chessPieces = ["king", "queen", "rook", "bishop", "knight", "pawn"];

const olympicRingColors = ["blue", "yellow", "black", "green", "red"];

const nobleGases = [
  "helium",
  "neon",
  "argon",
  "krypton",
  "xenon",
  "radon",
  "oganesson",
];

const harryPotterHouses = [
  "gryffindor",
  "slytherin",
  "ravenclaw",
  "hufflepuff",
];

const teenageMutantNinjaTurtles = [
  "leonardo",
  "donatello",
  "michelangelo",
  "raphael",
];

const unOfficialLanguages = [
  "arabic",
  "chinese",
  "english",
  "french",
  "russian",
  "spanish",
];

const siBaseUnits = [
  "second",
  "meter",
  "metre",
  "kilogram",
  "ampere",
  "kelvin",
  "mole",
  "candela",
];

const rainbowColors = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "indigo",
  "violet",
];

const tennisGrandSlams = [
  "australian open",
  "french open",
  "roland garros",
  "wimbledon",
  "us open",
  "u.s. open",
  "united states open",
];

const golfMajors = [
  "masters",
  "the masters",
  "pga championship",
  "us open",
  "u.s. open",
  "the open",
  "open championship",
  "british open",
];

const beatlesMembers = [
  "john lennon",
  "paul mccartney",
  "george harrison",
  "ringo starr",
];

const friendsMainCharacters = [
  "rachel",
  "rachel green",
  "monica",
  "monica geller",
  "phoebe",
  "phoebe buffay",
  "joey",
  "joey tribbiani",
  "chandler",
  "chandler bing",
  "ross",
  "ross geller",
];

const originalStarWarsMovies = [
  "a new hope",
  "star wars",
  "the empire strikes back",
  "empire strikes back",
  "return of the jedi",
];

const firstHarryPotterBooks = [
  "sorcerer's stone",
  "sorcerers stone",
  "philosopher's stone",
  "philosophers stone",
  "chamber of secrets",
  "prisoner of azkaban",
];

const primaryAdditiveColors = ["red", "green", "blue"];

const vowels = ["a", "e", "i", "o", "u"];

const commonHumanSenses = ["sight", "hearing", "touch", "taste", "smell"];

const californiaBorderStates = ["oregon", "nevada", "arizona"];

const texasBorderStates = ["new mexico", "oklahoma", "arkansas", "louisiana"];

const euFoundingCountries = [
  "belgium",
  "france",
  "germany",
  "italy",
  "luxembourg",
  "netherlands",
];

const bricsFoundingCountries = ["brazil", "russia", "india", "china"];

const countriesUsingPoundSterling = [
  "united kingdom",
  "uk",
  "england",
  "scotland",
  "wales",
  "northern ireland",
];

const multiQuestions: MultiQuestion[] = [
  {
    category: "Countries",
    type: "multi",
    kicker: "Flags",
    prompt: "Name 10 countries with red in the flag",
    required: 10,
    answers: redFlagCountries,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "Borders",
    prompt: "Name 3 countries that border Germany",
    required: 3,
    answers: germanyBorderCountries,
  },
  {
    category: "Countries",
    type: "multi",
    kicker: "Geography",
    prompt: "Name 5 island countries",
    required: 5,
    answers: islandCountries,
  },
  {
    category: "Sports",
    type: "multi",
    kicker: "Sports",
    prompt: "Name 4 sports played with a ball",
    required: 4,
    answers: ballSports,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "Continents",
    prompt: "Name 5 countries in South America",
    required: 5,
    answers: southAmericanCountries,
  },
  {
    category: "Capitals",
    type: "multi",
    kicker: "Europe",
    prompt: "Name 5 capital cities in Europe",
    required: 5,
    answers: europeanCapitals,
  },
  {
    category: "Animals",
    type: "multi",
    kicker: "Animals",
    prompt: "Name 5 mammals",
    required: 5,
    answers: mammals,
  },
  {
    category: "Food",
    type: "multi",
    kicker: "Food",
    prompt: "Name 5 fruits",
    required: 5,
    answers: fruits,
  },
  {
    category: "Science",
    type: "multi",
    kicker: "Space",
    prompt: "Name 4 planets in our solar system",
    required: 4,
    answers: planets,
  },
  {
    category: "Science",
    type: "multi",
    kicker: "Chemistry",
    prompt: "Name 3 noble gases",
    required: 3,
    answers: nobleGases,
  },
  {
    category: "Countries",
    type: "multi",
    kicker: "World",
    prompt: "Name 3 G7 countries",
    required: 3,
    answers: g7Countries,
  },
  {
    category: "Countries",
    type: "multi",
    kicker: "Europe",
    prompt: "Name 3 Nordic countries",
    required: 3,
    answers: nordicCountries,
  },
  {
    category: "Countries",
    type: "multi",
    kicker: "Europe",
    prompt: "Name the Baltic countries",
    required: 3,
    answers: balticCountries,
  },
  {
    category: "Countries",
    type: "multi",
    kicker: "Europe",
    prompt: "Name the Benelux countries",
    required: 3,
    answers: beneluxCountries,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "Geography",
    prompt: "Name 3 countries in the United Kingdom",
    required: 3,
    answers: unitedKingdomCountries,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "World",
    prompt: "Name 4 oceans",
    required: 4,
    answers: oceans,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "World",
    prompt: "Name 4 continents",
    required: 4,
    answers: continents,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "North America",
    prompt: "Name 3 Great Lakes",
    required: 3,
    answers: greatLakes,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "Borders",
    prompt: "Name the countries that border the United States",
    required: 2,
    answers: countriesBorderingUnitedStates,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "Borders",
    prompt: "Name 4 countries that border France",
    required: 4,
    answers: countriesBorderingFrance,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "Borders",
    prompt: "Name 4 countries that border Brazil",
    required: 4,
    answers: countriesBorderingBrazil,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "Borders",
    prompt: "Name 4 countries that border India",
    required: 4,
    answers: countriesBorderingIndia,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "Borders",
    prompt: "Name 5 countries that border China",
    required: 5,
    answers: countriesBorderingChina,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "Borders",
    prompt: "Name 5 countries that border Russia",
    required: 5,
    answers: countriesBorderingRussia,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "Borders",
    prompt: "Name 4 countries that border South Africa",
    required: 4,
    answers: countriesBorderingSouthAfrica,
  },
  {
    category: "General",
    type: "multi",
    kicker: "Games",
    prompt: "Name 4 chess pieces",
    required: 4,
    answers: chessPieces,
  },
  {
    category: "Sports",
    type: "multi",
    kicker: "Olympics",
    prompt: "Name 3 Olympic ring colors",
    required: 3,
    answers: olympicRingColors,
  },
  {
    category: "Movies & TV",
    type: "multi",
    kicker: "Movies & TV",
    prompt: "Name 3 Hogwarts houses",
    required: 3,
    answers: harryPotterHouses,
  },
  {
    category: "Movies & TV",
    type: "multi",
    kicker: "Movies & TV",
    prompt: "Name 3 Teenage Mutant Ninja Turtles",
    required: 3,
    answers: teenageMutantNinjaTurtles,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "World",
    prompt: "Name 3 permanent members of the UN Security Council",
    required: 3,
    answers: permanentSecurityCouncilCountries,
  },
  {
    category: "General",
    type: "multi",
    kicker: "Language",
    prompt: "Name 3 official languages of the United Nations",
    required: 3,
    answers: unOfficialLanguages,
  },
  {
    category: "Science",
    type: "multi",
    kicker: "Science",
    prompt: "Name 3 SI base units",
    required: 3,
    answers: siBaseUnits,
  },
  {
    category: "Science",
    type: "multi",
    kicker: "Colors",
    prompt: "Name 4 colors of the rainbow",
    required: 4,
    answers: rainbowColors,
  },
  {
    category: "Sports",
    type: "multi",
    kicker: "Tennis",
    prompt: "Name 3 tennis Grand Slam tournaments",
    required: 3,
    answers: tennisGrandSlams,
  },
  {
    category: "Sports",
    type: "multi",
    kicker: "Golf",
    prompt: "Name 3 men's golf majors",
    required: 3,
    answers: golfMajors,
  },
  {
    category: "Music",
    type: "multi",
    kicker: "Music",
    prompt: "Name 3 Beatles members",
    required: 3,
    answers: beatlesMembers,
  },
  {
    category: "Movies & TV",
    type: "multi",
    kicker: "TV",
    prompt: "Name 4 main Friends characters",
    required: 4,
    answers: friendsMainCharacters,
  },
  {
    category: "Movies & TV",
    type: "multi",
    kicker: "Movies",
    prompt: "Name 2 original Star Wars trilogy movies",
    required: 2,
    answers: originalStarWarsMovies,
  },
  {
    category: "Movies & TV",
    type: "multi",
    kicker: "Books",
    prompt: "Name 2 of the first 3 Harry Potter books",
    required: 2,
    answers: firstHarryPotterBooks,
  },
  {
    category: "Science",
    type: "multi",
    kicker: "Colors",
    prompt: "Name the primary additive colors",
    required: 3,
    answers: primaryAdditiveColors,
  },
  {
    category: "General",
    type: "multi",
    kicker: "Words",
    prompt: "Name 3 vowels",
    required: 3,
    answers: vowels,
  },
  {
    category: "Science",
    type: "multi",
    kicker: "Body",
    prompt: "Name 3 common human senses",
    required: 3,
    answers: commonHumanSenses,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "US States",
    prompt: "Name the states that border California",
    required: 3,
    answers: californiaBorderStates,
  },
  {
    category: "Geography",
    type: "multi",
    kicker: "US States",
    prompt: "Name 3 states that border Texas",
    required: 3,
    answers: texasBorderStates,
  },
  {
    category: "Countries",
    type: "multi",
    kicker: "Europe",
    prompt: "Name 4 founding countries of the EU",
    required: 4,
    answers: euFoundingCountries,
  },
  {
    category: "Countries",
    type: "multi",
    kicker: "World",
    prompt: "Name 3 founding BRIC countries",
    required: 3,
    answers: bricsFoundingCountries,
  },
  {
    category: "Countries",
    type: "multi",
    kicker: "Currency",
    prompt: "Name 3 countries of the UK that use pound sterling",
    required: 3,
    answers: countriesUsingPoundSterling,
  },
];

const baseClassicQuestionBank: Question[] = [
  ...seedQuestions,
  ...capitalQuestions,
  ...populationQuestions,
  ...flagQuestions,
  ...landmarkImageQuestions,
  ...visualImageQuestions,
  ...textQuestions,
  ...rankingQuestions,
  ...multiQuestions,
];

const uniqueBaseClassicQuestionBank = Array.from(
  new Map(
    baseClassicQuestionBank.map((question) => [
      `${question.type}|${question.category}|${question.prompt}|${question.image?.src ?? ""}`,
      question,
    ]),
  ).values(),
);

const classicBankBucketOrder = [
  "multi",
  "number",
  "General",
  "Countries",
  "Capitals",
  "Flags",
  "Geography",
  "People",
  "Landmarks",
  "Animals",
  "Science",
  "Sports",
  "Movies & TV",
  "Music",
  "Songs",
  "Food",
  "History",
];

const getClassicBankBucket = (question: Question) =>
  question.type === "multi" || question.type === "number"
    ? question.type
    : question.category;

const withExpandedQuestionAnswers = (question: Question): Question => {
  if (question.type === "number" || question.type === "ranking") {
    return question;
  }

  return {
    ...question,
    answers: expandAnswerAliases(question.answers),
  };
};

const getQuestionDifficulty = (question: Question): Difficulty => {
  const questionText = normalize(
    `${question.prompt} ${question.kicker} ${
      question.type === "number" ? question.displayAnswer : question.answers.join(" ")
    }`,
  );

  if (
    question.type === "ranking" ||
    questionText.includes("james webb") ||
    questionText.includes("crispr") ||
    questionText.includes("higgs") ||
    questionText.includes("troposphere") ||
    questionText.includes("noble gases") ||
    questionText.includes("si base units") ||
    questionText.includes("andromeda") ||
    questionText.includes("billboard") ||
    questionText.includes("pulitzer") ||
    questionText.includes("golden slam") ||
    questionText.includes("time zones") ||
    questionText.includes("security council")
  ) {
    return "hard";
  }

  if (
    question.type === "multi" ||
    questionText.includes("chemical symbol") ||
    questionText.includes("cell contains dna") ||
    questionText.includes("dna") ||
    questionText.includes("microscope") ||
    questionText.includes("international space station") ||
    questionText.includes("iss") ||
    questionText.includes("apollo") ||
    questionText.includes("electrical resistance") ||
    questionText.includes("hardest natural substance") ||
    questionText.includes("grand slam") ||
    questionText.includes("grammy") ||
    questionText.includes("best picture") ||
    questionText.includes("population")
  ) {
    return "medium";
  }

  return "easy";
};

const getRankingAnswerIndex = (value: string, question: RankingQuestion) => {
  const normalizedValue = normalize(value);

  return question.answers.findIndex((answer) =>
    getAnswerAliases(answer).map(normalize).includes(normalizedValue),
  );
};

const extractRankingAnswersFromInput = (
  value: string,
  question: RankingQuestion,
  currentAnswers: string[],
) => {
  const normalizedInput = normalize(value);
  const usedIdentities = new Set(currentAnswers.map(getAnswerIdentity));
  const matches = question.answers.flatMap((answer) =>
    getAnswerAliases(answer)
      .map(normalize)
      .filter(Boolean)
      .map((alias) => ({
        answer,
        position: normalizedInput.search(
          new RegExp(`(?:^|\\s)${alias.replace(/\s+/g, "\\s+")}(?:\\s|$)`),
        ),
      }))
      .filter((match) => match.position >= 0),
  );

  return matches
    .sort((first, second) => first.position - second.position)
    .map((match) => match.answer)
    .filter((answer, index, answers) => {
      const identity = getAnswerIdentity(answer);

      if (usedIdentities.has(identity)) {
        return false;
      }

      const isFirstMatch = answers.findIndex(
        (candidate) => getAnswerIdentity(candidate) === identity,
      ) === index;

      if (isFirstMatch) {
        usedIdentities.add(identity);
      }

      return isFirstMatch;
    });
};

const extractMultiAnswersFromVoiceInput = (
  value: string,
  question: MultiQuestion,
  currentAnswers: string[],
) => {
  const normalizedInput = normalize(value);
  const usedIdentities = new Set(currentAnswers.map(getAnswerIdentity));
  const matches = question.answers.flatMap((answer) =>
    getAnswerAliases(answer)
      .map(normalize)
      .filter(Boolean)
      .map((alias) => ({
        answer,
        alias,
        position: normalizedInput.search(
          new RegExp(`(?:^|\\s)${alias.replace(/\s+/g, "\\s+")}(?:\\s|$)`),
        ),
      }))
      .filter((match) => match.position >= 0),
  );

  return matches
    .sort(
      (first, second) =>
        first.position - second.position || second.alias.length - first.alias.length,
    )
    .map((match) => match.answer)
    .filter((answer, index, answers) => {
      const identity = getAnswerIdentity(answer);

      if (usedIdentities.has(identity)) {
        return false;
      }

      const isFirstMatch = answers.findIndex(
        (candidate) => getAnswerIdentity(candidate) === identity,
      ) === index;

      if (isFirstMatch) {
        usedIdentities.add(identity);
      }

      return isFirstMatch;
    });
};

const applyRankingCommand = (
  value: string,
  question: RankingQuestion,
  currentAnswers: string[],
) => {
  const normalizedInput = normalize(value);

  if (["clear", "reset", "start over"].includes(normalizedInput)) {
    return {
      answers: [],
      handled: true,
      message: "Cleared",
    };
  }

  const removeMatch = normalizedInput.match(/^remove (.+)$/);

  if (removeMatch?.[1]) {
    const answerIndex = getRankingAnswerIndex(removeMatch[1], question);

    if (answerIndex >= 0) {
      const answerIdentity = getAnswerIdentity(question.answers[answerIndex]);

      return {
        answers: currentAnswers.filter(
          (answer) => getAnswerIdentity(answer) !== answerIdentity,
        ),
        handled: true,
        message: "Removed",
      };
    }
  }

  const moveMatch = normalizedInput.match(/^move (.+) to (\d+)$/);

  if (moveMatch?.[1] && moveMatch[2]) {
    const answerIndex = getRankingAnswerIndex(moveMatch[1], question);
    const nextPosition = Number(moveMatch[2]) - 1;

    if (answerIndex >= 0 && nextPosition >= 0) {
      const answer = question.answers[answerIndex];
      const answerIdentity = getAnswerIdentity(answer);
      const remainingAnswers = currentAnswers.filter(
        (candidate) => getAnswerIdentity(candidate) !== answerIdentity,
      );

      remainingAnswers.splice(
        Math.min(nextPosition, remainingAnswers.length),
        0,
        answer,
      );

      return {
        answers: remainingAnswers,
        handled: true,
        message: `Moved ${formatAnswerLabel(answer)}`,
      };
    }
  }

  const swapMatch = normalizedInput.match(/^swap (.+) and (.+)$/);

  if (swapMatch?.[1] && swapMatch[2]) {
    const firstIndex = getRankingAnswerIndex(swapMatch[1], question);
    const secondIndex = getRankingAnswerIndex(swapMatch[2], question);

    if (firstIndex >= 0 && secondIndex >= 0) {
      const firstIdentity = getAnswerIdentity(question.answers[firstIndex]);
      const secondIdentity = getAnswerIdentity(question.answers[secondIndex]);
      const nextAnswers = currentAnswers.map((answer) => {
        const identity = getAnswerIdentity(answer);

        if (identity === firstIdentity) {
          return question.answers[secondIndex];
        }

        if (identity === secondIdentity) {
          return question.answers[firstIndex];
        }

        return answer;
      });

      return {
        answers: nextAnswers,
        handled: true,
        message: "Swapped",
      };
    }
  }

  return {
    answers: currentAnswers,
    handled: false,
    message: "",
  };
};

const buildDifficultyQuestionBanks = () => {
  const buckets = new Map<string, Question[]>();

  for (const question of uniqueBaseClassicQuestionBank) {
    const bucketKey = `${getQuestionDifficulty(question)}:${getClassicBankBucket(question)}`;
    const bucket = buckets.get(bucketKey) ?? [];
    bucket.push(question);
    buckets.set(bucketKey, bucket);
  }

  const takeQuestion = (difficulty: Difficulty, bucketKey: string) =>
    buckets.get(`${difficulty}:${bucketKey}`)?.shift();
  const takeAnyQuestion = (difficulty: Difficulty) => {
    for (const [bucketKey, bucket] of buckets.entries()) {
      if (!bucketKey.startsWith(`${difficulty}:`)) {
        continue;
      }

      const question = bucket.shift();

      if (question) {
        return question;
      }
    }

    return null;
  };

  return difficulties.map((difficulty) => {
    const bank: Question[] = [];
    const addQuestion = (question: Question) => {
      bank.push({
        ...withExpandedQuestionAnswers(question),
        difficulty,
      });
    };

    for (let index = 0; index < 15; index += 1) {
      const question = takeQuestion(difficulty, "multi");

      if (question) {
        addQuestion(question);
      }
    }

    for (let index = 0; index < 3; index += 1) {
      const question = takeQuestion(difficulty, "number");

      if (question) {
        addQuestion(question);
      }
    }

    while (bank.length < 100) {
      let addedQuestion = false;

      for (const bucketKey of classicBankBucketOrder) {
        if (bucketKey === "multi" || bucketKey === "number") {
          continue;
        }

        const question = takeQuestion(difficulty, bucketKey);

        if (!question) {
          continue;
        }

        addQuestion(question);
        addedQuestion = true;

        if (bank.length >= 100) {
          break;
        }
      }

      if (!addedQuestion) {
        const fallbackQuestion = takeAnyQuestion(difficulty);

        if (!fallbackQuestion) {
          break;
        }

        addQuestion(fallbackQuestion);
      }
    }

    return bank;
  });
};

const classicQuestionBank: Question[] = buildDifficultyQuestionBanks().flat();

const getCategoryQuestions = (category: Category, difficulty: Difficulty) => {
  const exactQuestions = classicQuestionBank.filter(
    (question) =>
      question.difficulty === difficulty &&
      (category === "General" || question.category === category),
  );

  if (exactQuestions.length || category === "General") {
    return exactQuestions;
  }

  return classicQuestionBank.filter(
    (question) => question.difficulty === difficulty,
  );
};

const getModeQuestions = (
  mode: GameMode,
  category: Category,
  difficulty: Difficulty,
) => {
  if (mode === "classic") {
    return getCategoryQuestions(category, difficulty);
  }

  const dontSayQuestions = getDontSayQuestions(category, difficulty);

  return (dontSayQuestions.length
    ? dontSayQuestions
    : getDontSayQuestions("General", difficulty)
  ).map(toClassicQuestion);
};

const shuffleQuestionIndices = (indices: number[]) => {
  const shuffledIndices = [...indices];

  for (let index = shuffledIndices.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledIndices[index], shuffledIndices[randomIndex]] = [
      shuffledIndices[randomIndex],
      shuffledIndices[index],
    ];
  }

  return shuffledIndices;
};

const getRandomQuestionQueue = (questions: Question[]) =>
  shuffleQuestionIndices(questions.map((_, index) => index)).slice(
    0,
    Math.min(ROUND_QUESTION_COUNT, questions.length),
  );

const getBalancedQuestionQueue = (questions: Question[]) => {
  const buckets = new Map<string, number[]>();
  const selectedCategories = new Map<QuestionCategory, number>();
  const selectedQuestionIndices = new Set<number>();
  const targetCount = Math.min(ROUND_QUESTION_COUNT, questions.length);
  const maxPerCategory = 2;

  const canAddQuestion = (questionIndex: number, categoryLimit = maxPerCategory) => {
    const question = questions[questionIndex];

    return (
      question !== undefined &&
      !selectedQuestionIndices.has(questionIndex) &&
      (selectedCategories.get(question.category) ?? 0) < categoryLimit
    );
  };

  const addQuestion = (questionIndex: number) => {
    const question = questions[questionIndex];

    if (!question) {
      return;
    }

    selectedQuestionIndices.add(questionIndex);
    selectedCategories.set(
      question.category,
      (selectedCategories.get(question.category) ?? 0) + 1,
    );
  };

  questions.forEach((question, index) => {
    const bucketKey = question.category === "General" ? question.kicker : question.category;
    const bucket = buckets.get(bucketKey) ?? [];
    bucket.push(index);
    buckets.set(bucketKey, bucket);
  });

  const shuffledBuckets = shuffleQuestionIndices(
    Array.from({ length: buckets.size }, (_, index) => index),
  ).map((index) => Array.from(buckets.values())[index]);
  const balancedQueue: number[] = [];

  for (const bucket of shuffledBuckets) {
    const firstQuestionIndex = shuffleQuestionIndices(bucket).find((questionIndex) =>
      canAddQuestion(questionIndex),
    );

    if (firstQuestionIndex !== undefined) {
      addQuestion(firstQuestionIndex);
      balancedQueue.push(firstQuestionIndex);
    }

    if (balancedQueue.length >= targetCount) {
      return balancedQueue;
    }
  }

  const remainingIndices = questions
    .map((_, index) => index)
    .filter((index) => !selectedQuestionIndices.has(index));

  for (const questionIndex of shuffleQuestionIndices(remainingIndices)) {
    if (!canAddQuestion(questionIndex)) {
      continue;
    }

    addQuestion(questionIndex);
    balancedQueue.push(questionIndex);

    if (balancedQueue.length >= targetCount) {
      return balancedQueue;
    }
  }

  for (const questionIndex of shuffleQuestionIndices(remainingIndices)) {
    if (!canAddQuestion(questionIndex, 3)) {
      continue;
    }

    addQuestion(questionIndex);
    balancedQueue.push(questionIndex);

    if (balancedQueue.length >= targetCount) {
      return balancedQueue;
    }
  }

  for (const questionIndex of shuffleQuestionIndices(remainingIndices)) {
    if (selectedQuestionIndices.has(questionIndex)) {
      continue;
    }

    addQuestion(questionIndex);
    balancedQueue.push(questionIndex);

    if (balancedQueue.length >= targetCount) {
      return balancedQueue;
    }
  }

  return balancedQueue;
};

const getRoundQuestionQueue = (
  questions: Question[],
  category: Category,
  mode: GameMode,
) =>
  mode === "classic" && category === "General"
    ? getBalancedQuestionQueue(questions)
    : getRandomQuestionQueue(questions);

const fallbackQuestion = getCategoryQuestions("General", "medium")[0] ?? seedQuestions[0];

export default function Home() {
  const [questionQueue, setQuestionQueue] = useState(() =>
    getBalancedQuestionQueue(getCategoryQuestions("General", "medium")),
  );
  const [typedAnswer, setTypedAnswer] = useState("");
  const [acceptedAnswersByQuestion, setAcceptedAnswersByQuestion] = useState<
    Record<number, string[]>
  >({});
  const [secondsLeft, setSecondsLeft] = useState(() =>
    getQuestionSeconds(getCategoryQuestions("General", "medium")[0]),
  );
  const [score, setScore] = useState(0);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>("classic");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("medium");
  const [selectedCategory, setSelectedCategory] = useState<Category>("General");
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [voiceError, setVoiceError] = useState("");
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState("");
  const [lastWrongAnswer, setLastWrongAnswer] = useState("");
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const [homeView, setHomeView] = useState<
    "play" | "leaderboard" | "about" | "settings" | "lobby"
  >("play");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [otherMenuOpen, setOtherMenuOpen] = useState(false);
  const [leaderboardScope, setLeaderboardScope] =
    useState<LeaderboardScope>("Global");
  const [playerProfile, setPlayerProfile] =
    useState<PlayerProfile>(defaultPlayerProfile);
  const [leaderboardScroll, setLeaderboardScroll] = useState({
    canScrollUp: false,
    canScrollDown: true,
  });
  const [lobbyPlayersScroll, setLobbyPlayersScroll] = useState({
    canScrollUp: false,
    canScrollDown: true,
  });
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [activeGroupCode, setActiveGroupCode] = useState("");
  const [groupName, setGroupName] = useState(DEFAULT_GROUP_NAME);
  const [draftGroupName, setDraftGroupName] = useState(DEFAULT_GROUP_NAME);
  const [groupNameModalOpen, setGroupNameModalOpen] = useState(false);
  const [simulatedLobbyPlayers, setSimulatedLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [dummyJoinModalOpen, setDummyJoinModalOpen] = useState(false);
  const [dummyPlayerName, setDummyPlayerName] = useState("");
  const [dummyPlayerAvatar, setDummyPlayerAvatar] = useState<string>(playerAvatars[3]);
  const [dummyAvatarScroll, setDummyAvatarScroll] = useState({
    canScrollLeft: false,
    canScrollRight: true,
  });
  const [lobbyProfileModalOpen, setLobbyProfileModalOpen] = useState(false);
  const [draftLobbyName, setDraftLobbyName] = useState("");
  const [draftLobbyAvatar, setDraftLobbyAvatar] = useState<string>(playerAvatars[0]);
  const [lobbyAvatarScroll, setLobbyAvatarScroll] = useState({
    canScrollLeft: false,
    canScrollRight: true,
  });
  const [inviteCopied, setInviteCopied] = useState(false);
  const [aboutStep, setAboutStep] = useState(0);
  const [avatarScroll, setAvatarScroll] = useState({
    canScrollLeft: false,
    canScrollRight: true,
  });
  const [, setIsListening] = useState(false);
  const [status, setStatus] = useState<
    "ready" | "playing" | "correct" | "wrong" | "timeout" | "done"
  >("ready");
  const [message, setMessage] = useState("");
  const [scoreDelta, setScoreDelta] = useState(0);
  const [wrongAttemptCount, setWrongAttemptCount] = useState(0);
  const [dontSaySecret, setDontSaySecret] = useState<DontSaySecret | null>(null);
  const [dontSayValidationPending, setDontSayValidationPending] = useState(false);
  const [dontSayLastAnswer, setDontSayLastAnswer] = useState("");
  const [dontSayEliminated, setDontSayEliminated] = useState(false);
  const [gameLeaderboardOpen, setGameLeaderboardOpen] = useState(false);
  const [gameLeaderboardScroll, setGameLeaderboardScroll] = useState({
    canScrollUp: false,
    canScrollDown: false,
  });
  const [draggedRankingIndex, setDraggedRankingIndex] = useState<number | null>(null);
  const [dragOverRankingIndex, setDragOverRankingIndex] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const otherMenuRef = useRef<HTMLDivElement>(null);
  const gameLeaderboardRef = useRef<HTMLDivElement>(null);
  const gradeAnswerRef = useRef<(answer: string) => void | Promise<void>>(() => {});
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const realtimeSocketRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const voiceAudioContextRef = useRef<AudioContext | null>(null);
  const voiceAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const voiceAudioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const voiceAnalyserFrameRef = useRef<number | null>(null);
  const voiceTranscriptByItemRef = useRef<Record<string, string>>({});
  const voiceQuestionVersionByItemRef = useRef<Record<string, number>>({});
  const voiceStartedAtByItemRef = useRef<Record<string, number>>({});
  const manualVoiceTurnRef = useRef({
    isSpeaking: false,
    speechStartedAt: 0,
    silenceStartedAt: 0,
    lastCommitAt: 0,
    hasBufferedAudio: false,
  });
  const voiceQuestionVersionRef = useRef(0);
  const dontSaySecretRequestRef = useRef(0);
  const pendingVoiceSubmitRef = useRef<number | null>(null);
  const voiceTypingIntervalRef = useRef<number | null>(null);
  const autoSubmitRef = useRef<number | null>(null);
  const roundSavedRef = useRef(false);
  const statusRef = useRef(status);
  const currentQuestionRef = useRef<Question>(fallbackQuestion);
  const acceptedAnswersRef = useRef<string[]>([]);

  const activeDontSayQuestions = useMemo(
    () => {
      const categoryQuestions = getDontSayQuestions(
        selectedCategory,
        selectedDifficulty,
      );

      return categoryQuestions.length
        ? categoryQuestions
        : getDontSayQuestions("General", selectedDifficulty);
    },
    [selectedCategory, selectedDifficulty],
  );
  const activeQuestions = useMemo(
    () => getModeQuestions(selectedGameMode, selectedCategory, selectedDifficulty),
    [selectedCategory, selectedDifficulty, selectedGameMode],
  );
  const activeLeaderboard = leaderboards[leaderboardScope];
  const usernameReady = playerProfile.username.trim().length > 0;
  const groupInviteLink =
    typeof window === "undefined" || !activeGroupCode
      ? ""
      : `${window.location.origin}?join=${activeGroupCode}`;
  const activeLobbyPlayers = useMemo(() => {
    const mockPlayerSlots = Math.max(0, 7 - simulatedLobbyPlayers.length);
    const otherPlayers = [
      ...lobbyPlayers.slice(0, mockPlayerSlots),
      ...simulatedLobbyPlayers,
    ];
    const currentPlayer: LobbyPlayer = {
      name: playerProfile.username.trim() || "You",
      avatar: playerProfile.avatar,
      isHost: false,
      isCurrent: true,
    };

    if (currentPlayer.isHost) {
      return [currentPlayer, ...otherPlayers];
    }

    const hostPlayer = otherPlayers.find((player) => player.isHost);
    const nonHostPlayers = otherPlayers.filter((player) => !player.isHost);

    return hostPlayer
      ? [hostPlayer, currentPlayer, ...nonHostPlayers]
      : [currentPlayer, ...otherPlayers];
  }, [playerProfile.avatar, playerProfile.username, simulatedLobbyPlayers]);
  const visibleLobbyPlayers = activeLobbyPlayers.slice(0, 8);
  const canStartGroupGame = activeLobbyPlayers.length >= 2;
  const gameLeaderboard = useMemo(
    () =>
      activeLobbyPlayers.slice(0, 6).map((player, index) => ({
        ...player,
        score: player.isCurrent
          ? score
          : Math.max(0, 620 - index * 95 + (index % 2) * 35),
      })).sort((first, second) => second.score - first.score),
    [activeLobbyPlayers, score],
  );
  const gameLeader = gameLeaderboard[0];
  const currentIndex = questionQueue[0] ?? 0;
  const currentQuestion =
    activeQuestions[currentIndex] ?? activeQuestions[0] ?? fallbackQuestion;
  const currentDontSayQuestion =
    selectedGameMode === "dont-say"
      ? activeDontSayQuestions[currentIndex] ?? activeDontSayQuestions[0]
      : null;
  const isDontSayMode = selectedGameMode === "dont-say";
  const roundQuestionTotal = Math.min(ROUND_QUESTION_COUNT, activeQuestions.length);
  const roundQuestionNumber = Math.max(
    1,
    roundQuestionTotal - questionQueue.length + 1,
  );
  const acceptedAnswers = useMemo(
    () => acceptedAnswersByQuestion[currentIndex] ?? [],
    [acceptedAnswersByQuestion, currentIndex],
  );
  const acceptedAnswerIdentityKey = useMemo(
    () => acceptedAnswers.map(getAnswerIdentity).join("|"),
    [acceptedAnswers],
  );
  const currentAcceptedAnswerKey = useMemo(
    () =>
      currentQuestion.type === "number"
        ? ""
        : currentQuestion.answers.map(normalize).join("|"),
    [currentQuestion],
  );
  const isMultiQuestion = currentQuestion.type === "multi";
  const isRankingQuestion = currentQuestion.type === "ranking";
  const neededAnswers = isMultiQuestion
    ? currentQuestion.required
    : isRankingQuestion
      ? currentQuestion.answers.length
      : 1;
  const questionSeconds = getQuestionSeconds(currentQuestion);
  const timerProgress = secondsLeft / questionSeconds;
  const timerColor =
    secondsLeft <= 5 ? "#dc2626" : secondsLeft <= 10 ? "#f59e0b" : "#0f172a";
  const isResolvingQuestion =
    status === "correct" || status === "wrong" || status === "timeout";
  const answerAreaMessage = message
    .replace(/\s[+-]\d+(?=(\s|$))/g, "")
    .replace(/^Correct$/, "")
    .replace(/^Not quite!?$/, "")
    .trim();

  const answerHint = useMemo(() => {
    if (isDontSayMode) {
      return dontSaySecret?.answer ?? "the AI answer";
    }

    if (currentQuestion.type === "number") {
      return currentQuestion.displayAnswer;
    }

    return currentQuestion.answers[0]
      ? formatAnswerLabel(currentQuestion.answers[0])
      : "the answer";
  }, [currentQuestion, dontSaySecret?.answer, isDontSayMode]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
    acceptedAnswersRef.current = acceptedAnswers;
  }, [acceptedAnswers, currentQuestion]);

  const timeoutMessage = useMemo(() => {
    if (isDontSayMode) {
      return dontSaySecret
        ? `Time. The AI had ${dontSaySecret.answer}`
        : "Time";
    }

    if (currentQuestion.type === "ranking") {
      return `Correct order: ${currentQuestion.answers
        .map(formatAnswerLabel)
        .join(", ")}`;
    }

    if (currentQuestion.type !== "multi") {
      return `You didn't get it! It's ${answerHint}`;
    }

    const acceptedIdentities = acceptedAnswers.map(getAnswerIdentity);
    const remainingAnswers = currentQuestion.answers.filter(
      (possibleAnswer) =>
        !acceptedIdentities.includes(getAnswerIdentity(possibleAnswer)),
    );

    return `Other acceptable choices: ${getAllAnswerLabels(remainingAnswers)}`;
  }, [acceptedAnswers, answerHint, currentQuestion, dontSaySecret, isDontSayMode]);

  useEffect(() => {
    const savedPlayer = window.localStorage.getItem(PLAYER_STORAGE_KEY);

    if (!savedPlayer) {
      return;
    }

    try {
      const parsedPlayer = JSON.parse(savedPlayer) as Partial<PlayerProfile>;

      const loadPlayer = window.setTimeout(() => {
        setPlayerProfile({
          username: parsedPlayer.username ?? "",
          avatar: parsedPlayer.avatar ?? playerAvatars[0],
          totalScore: parsedPlayer.totalScore ?? 0,
        });
      }, 0);

      return () => window.clearTimeout(loadPlayer);
    } catch {
      window.localStorage.removeItem(PLAYER_STORAGE_KEY);
    }
  }, []);

  const updatePlayerProfile = useCallback((nextProfile: PlayerProfile) => {
    setPlayerProfile(nextProfile);
    window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(nextProfile));
  }, []);

  const cycleGameMode = useCallback(() => {
    setSelectedGameMode((currentMode) => {
      const currentModeIndex = gameModes.indexOf(currentMode);
      const nextMode = gameModes[(currentModeIndex + 1) % gameModes.length];
      const nextQuestions = getModeQuestions(
        nextMode,
        selectedCategory,
        selectedDifficulty,
      );

      setQuestionQueue(getRoundQuestionQueue(nextQuestions, selectedCategory, nextMode));
      setAcceptedAnswersByQuestion({});

      return nextMode;
    });
  }, [selectedCategory, selectedDifficulty]);

  const cycleCategory = useCallback(() => {
    setSelectedCategory((currentCategory) => {
      const currentCategoryIndex = categories.indexOf(currentCategory);
      const nextCategory =
        categories[(currentCategoryIndex + 1) % categories.length];
      const nextQuestions = getModeQuestions(
        selectedGameMode,
        nextCategory,
        selectedDifficulty,
      );

      setQuestionQueue(getRoundQuestionQueue(nextQuestions, nextCategory, selectedGameMode));
      setAcceptedAnswersByQuestion({});

      return nextCategory;
    });
  }, [selectedDifficulty, selectedGameMode]);

  const cycleDifficulty = useCallback(() => {
    setSelectedDifficulty((currentDifficulty) => {
      const currentDifficultyIndex = difficulties.indexOf(currentDifficulty);
      const nextDifficulty =
        difficulties[(currentDifficultyIndex + 1) % difficulties.length];
      const nextQuestions = getModeQuestions(
        selectedGameMode,
        selectedCategory,
        nextDifficulty,
      );

      setQuestionQueue(
        getRoundQuestionQueue(nextQuestions, selectedCategory, selectedGameMode),
      );
      setAcceptedAnswersByQuestion({});

      return nextDifficulty;
    });
  }, [selectedCategory, selectedGameMode]);

  useEffect(() => {
    if (!categoryMenuOpen && !otherMenuOpen) {
      return;
    }

    const closeMenus = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        categoryMenuRef.current?.contains(target) ||
        otherMenuRef.current?.contains(target)
      ) {
        return;
      }

      setCategoryMenuOpen(false);
      setOtherMenuOpen(false);
    };

    const closeMenusWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCategoryMenuOpen(false);
        setOtherMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenus);
    document.addEventListener("keydown", closeMenusWithEscape);

    return () => {
      document.removeEventListener("mousedown", closeMenus);
      document.removeEventListener("keydown", closeMenusWithEscape);
    };
  }, [categoryMenuOpen, otherMenuOpen]);

  useEffect(() => {
    if (!gameLeaderboardOpen) {
      return;
    }

    const closeGameLeaderboard = (event: MouseEvent) => {
      const target = event.target as Node;

      if (gameLeaderboardRef.current?.contains(target)) {
        return;
      }

      setGameLeaderboardOpen(false);
    };

    const closeGameLeaderboardWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGameLeaderboardOpen(false);
      }
    };

    document.addEventListener("mousedown", closeGameLeaderboard);
    document.addEventListener("keydown", closeGameLeaderboardWithEscape);

    return () => {
      document.removeEventListener("mousedown", closeGameLeaderboard);
      document.removeEventListener("keydown", closeGameLeaderboardWithEscape);
    };
  }, [gameLeaderboardOpen]);

  const uploadPlayerAvatar = useCallback(
    (file: File | undefined) => {
      if (!file || !file.type.startsWith("image/")) {
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result !== "string") {
          return;
        }

        updatePlayerProfile({
          ...playerProfile,
          avatar: reader.result,
        });
      };

      reader.readAsDataURL(file);
    },
    [playerProfile, updatePlayerProfile],
  );

  const validateJoinCode = useCallback((code: string) => {
    if (code.length !== 5) {
      setJoinError("");
      setIsJoining(false);
      return;
    }

    setJoinError("");
    setIsJoining(true);

    window.setTimeout(() => {
      setIsJoining(false);

      if (code === "00000") {
        setJoinError("");
        setJoinModalOpen(false);
        setActiveGroupCode(code);
        setJoinCode("");
        setHomeView("lobby");
        return;
      }

      setJoinError("No group found for that code.");
    }, 850);
  }, []);

  useEffect(() => {
    const validation = window.setTimeout(() => {
      validateJoinCode(joinCode);
    }, 0);

    return () => window.clearTimeout(validation);
  }, [joinCode, validateJoinCode]);

  const deleteLocalAccount = useCallback(() => {
    window.localStorage.removeItem(PLAYER_STORAGE_KEY);
    setPlayerProfile(defaultPlayerProfile);
  }, []);

  const copyInviteLink = useCallback(async () => {
    if (!groupInviteLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(groupInviteLink);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1400);
    } catch {
      setInviteCopied(false);
    }
  }, [groupInviteLink]);

  const saveGroupName = useCallback(() => {
    if (!draftGroupName.trim()) {
      return;
    }

    setGroupName(draftGroupName.trim());
    setGroupNameModalOpen(false);
  }, [draftGroupName]);

  const addSimulatedLobbyPlayer = useCallback(() => {
    const name = dummyPlayerName.trim();

    if (!name || simulatedLobbyPlayers.length >= 7) {
      return;
    }

    setSimulatedLobbyPlayers((players) => [
      ...players,
      {
        name,
        avatar: dummyPlayerAvatar,
        isHost: false,
      },
    ]);
    setDummyJoinModalOpen(false);
    setDummyPlayerName("");
    setDummyPlayerAvatar(playerAvatars[(simulatedLobbyPlayers.length + 4) % playerAvatars.length]);
  }, [dummyPlayerAvatar, dummyPlayerName, simulatedLobbyPlayers.length]);

  const openLobbyProfileModal = useCallback(() => {
    setDraftLobbyName(playerProfile.username.trim() || "You");
    setDraftLobbyAvatar(playerProfile.avatar);
    setLobbyProfileModalOpen(true);
  }, [playerProfile.avatar, playerProfile.username]);

  const saveLobbyProfile = useCallback(() => {
    const username = draftLobbyName.trim();

    if (!username) {
      return;
    }

    updatePlayerProfile({
      ...playerProfile,
      username,
      avatar: draftLobbyAvatar,
    });
    setLobbyProfileModalOpen(false);
  }, [draftLobbyAvatar, draftLobbyName, playerProfile, updatePlayerProfile]);

  const invalidateVoiceQuestion = useCallback(() => {
    voiceQuestionVersionRef.current += 1;
    voiceTranscriptByItemRef.current = {};
    voiceQuestionVersionByItemRef.current = {};

    if (voiceTypingIntervalRef.current) {
      window.clearInterval(voiceTypingIntervalRef.current);
      voiceTypingIntervalRef.current = null;
    }

    if (pendingVoiceSubmitRef.current) {
      window.clearTimeout(pendingVoiceSubmitRef.current);
      pendingVoiceSubmitRef.current = null;
    }
  }, []);

  const prepareDontSaySecret = useCallback(async (question: DontSayQuestion) => {
    const requestId = dontSaySecretRequestRef.current + 1;

    dontSaySecretRequestRef.current = requestId;
    setDontSaySecret(null);

    try {
      const response = await fetch("/api/dont-say/prepare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: question.prompt,
          guidance: question.guidance,
          examples: question.examples,
          difficulty: selectedDifficulty,
          roundNonce: `${Date.now()}-${Math.random()}`,
        }),
      });
      const data = (await response.json()) as DontSaySecret & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "The AI could not pick an answer.");
      }

      if (dontSaySecretRequestRef.current === requestId) {
        setDontSaySecret(data);
      }
    } catch {
      const answer = getRandomItem(question.examples, "eagle");

      if (dontSaySecretRequestRef.current === requestId) {
        setDontSaySecret({
          answer,
          normalizedAnswer: normalizeAnswer(answer),
        });
      }
    } finally {
    }
  }, [selectedDifficulty]);

  const resetQuestionState = useCallback((question: Question = currentQuestion) => {
    invalidateVoiceQuestion();

    if (autoSubmitRef.current) {
      window.clearTimeout(autoSubmitRef.current);
      autoSubmitRef.current = null;
    }

    setTypedAnswer("");
    setSecondsLeft(getQuestionSeconds(question));
    setStatus("playing");
    setMessage("");
    setScoreDelta(0);
    setLastCorrectAnswer("");
    setLastWrongAnswer("");
    setWrongAttemptCount(0);
    setDraggedRankingIndex(null);
    setDragOverRankingIndex(null);
    dontSaySecretRequestRef.current += 1;
    setDontSaySecret(null);
    setDontSayValidationPending(false);
    setDontSayLastAnswer("");
    setDontSayEliminated(false);
    setNextCountdown(null);
    setStartCountdown(null);
  }, [currentQuestion, invalidateVoiceQuestion]);

  const completeCurrentQuestion = useCallback(() => {
    if (questionQueue.length <= 1) {
      if (!roundSavedRef.current && playerProfile.username.trim()) {
        roundSavedRef.current = true;
        updatePlayerProfile({
          ...playerProfile,
          totalScore: playerProfile.totalScore + score,
        });
      }

      setQuestionQueue([]);
      setStatus("done");
      return;
    }

    const nextQuestionIndex = questionQueue[1];
    setQuestionQueue((queue) => queue.slice(1));
    resetQuestionState(activeQuestions[nextQuestionIndex] ?? currentQuestion);
  }, [
    activeQuestions,
    currentQuestion,
    playerProfile,
    questionQueue,
    resetQuestionState,
    score,
    updatePlayerProfile,
  ]);

  const skipQuestion = () => {
    if (status !== "playing" || questionQueue.length <= 1) {
      return;
    }

    const nextQuestionIndex = questionQueue[1];
    setQuestionQueue(([current, ...rest]) => [...rest, current]);
    resetQuestionState(activeQuestions[nextQuestionIndex] ?? currentQuestion);
  };

  useEffect(() => {
    if (status !== "playing" || dontSayValidationPending) {
      return;
    }

    inputRef.current?.focus();
  }, [currentIndex, dontSayValidationPending, questionQueue.length, status]);

  useEffect(() => {
    if (status !== "playing" || !currentDontSayQuestion || !isDontSayMode) {
      return;
    }

    const loadSecret = async () => {
      await prepareDontSaySecret(currentDontSayQuestion);
    };

    void loadSecret();
  }, [
    currentDontSayQuestion,
    currentIndex,
    isDontSayMode,
    prepareDontSaySecret,
    status,
  ]);

  useEffect(() => {
    if (status !== "playing" || dontSayValidationPending) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(timer);
          invalidateVoiceQuestion();
          setStatus("timeout");
          setMessage(timeoutMessage);
          return 0;
        }

        return remaining - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    dontSayValidationPending,
    invalidateVoiceQuestion,
    status,
    timeoutMessage,
  ]);

  useEffect(() => {
    if (status !== "correct" && status !== "timeout" && status !== "wrong") {
      return;
    }

    if (dontSayEliminated) {
      const endGame = window.setTimeout(() => {
        setStatus("done");
        setDontSayEliminated(false);
      }, 3800);

      return () => window.clearTimeout(endGame);
    }

    const startCountdown = window.setTimeout(() => {
      setNextCountdown(3);
    }, 0);
    const countdown = window.setInterval(() => {
      setNextCountdown((current) => {
        if (current === null || current <= 1) {
          return current;
        }

        return current - 1;
      });
    }, 1000);

    const advance = window.setTimeout(() => {
      window.clearInterval(countdown);
      setNextCountdown(null);
      completeCurrentQuestion();
    }, 3000);

    return () => {
      window.clearTimeout(startCountdown);
      window.clearInterval(countdown);
      window.clearTimeout(advance);
      setNextCountdown(null);
    };
  }, [completeCurrentQuestion, dontSayEliminated, status]);

  const stopRealtimeVoice = useCallback(() => {
    if (pendingVoiceSubmitRef.current) {
      window.clearTimeout(pendingVoiceSubmitRef.current);
      pendingVoiceSubmitRef.current = null;
    }

    if (voiceTypingIntervalRef.current) {
      window.clearInterval(voiceTypingIntervalRef.current);
      voiceTypingIntervalRef.current = null;
    }

    if (voiceAnalyserFrameRef.current) {
      window.cancelAnimationFrame(voiceAnalyserFrameRef.current);
      voiceAnalyserFrameRef.current = null;
    }

    void voiceAudioContextRef.current?.close();
    voiceAudioProcessorRef.current?.disconnect();
    voiceAudioSourceRef.current?.disconnect();

    realtimeSocketRef.current?.close();
    dataChannelRef.current?.close();
    peerConnectionRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());

    realtimeSocketRef.current = null;
    voiceAudioContextRef.current = null;
    voiceAudioProcessorRef.current = null;
    voiceAudioSourceRef.current = null;
    dataChannelRef.current = null;
    peerConnectionRef.current = null;
    localStreamRef.current = null;
    voiceTranscriptByItemRef.current = {};
    voiceQuestionVersionByItemRef.current = {};
    voiceStartedAtByItemRef.current = {};
    manualVoiceTurnRef.current = {
      isSpeaking: false,
      speechStartedAt: 0,
      silenceStartedAt: 0,
      lastCommitAt: 0,
      hasBufferedAudio: false,
    };
    setIsListening(false);
    setVoiceStatus("idle");
  }, []);

  const submitVoiceAnswer = useCallback((answer: string) => {
    const questionVersion = voiceQuestionVersionRef.current;
    const question = currentQuestionRef.current;

    if (statusRef.current !== "playing") {
      return;
    }

    if (pendingVoiceSubmitRef.current) {
      window.clearTimeout(pendingVoiceSubmitRef.current);
      pendingVoiceSubmitRef.current = null;
    }

    if (voiceTypingIntervalRef.current) {
      window.clearInterval(voiceTypingIntervalRef.current);
      voiceTypingIntervalRef.current = null;
    }

    if (question.type === "multi") {
      const voiceAnswers = extractMultiAnswersFromVoiceInput(
        answer,
        question,
        acceptedAnswersRef.current,
      );

      if (voiceAnswers.length > 1) {
        voiceAnswers.forEach((voiceAnswer, index) => {
          window.setTimeout(() => {
            if (
              questionVersion !== voiceQuestionVersionRef.current ||
              statusRef.current !== "playing"
            ) {
              return;
            }

            setTypedAnswer(voiceAnswer);
            gradeAnswerRef.current(voiceAnswer);
          }, index * 120);
        });
        return;
      }
    }

    setTypedAnswer(answer);

    pendingVoiceSubmitRef.current = window.setTimeout(() => {
      pendingVoiceSubmitRef.current = null;
      if (
        questionVersion !== voiceQuestionVersionRef.current ||
        statusRef.current !== "playing"
      ) {
        return;
      }
      gradeAnswerRef.current(answer);
    }, VOICE_SUBMIT_DELAY_MS);
  }, []);

  const startRealtimeVoice = useCallback(async () => {
    if (
      realtimeSocketRef.current ||
      peerConnectionRef.current ||
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      if (!navigator.mediaDevices?.getUserMedia) {
        setVoiceStatus("error");
        setVoiceError("Mic access is not available in this browser.");
      }
      return;
    }

    try {
      setVoiceStatus("connecting");
      setVoiceError("");

      const tokenResponse = await fetch("/api/realtime/session", {
        method: "POST",
      });
      const tokenData = (await tokenResponse.json()) as RealtimeTokenResponse & {
        error?: string;
      };

      if (!tokenResponse.ok) {
        throw new Error(tokenData.error ?? "Could not start OpenAI voice mode.");
      }

      const ephemeralKey = tokenData.value ?? tokenData.client_secret?.value;

      if (!ephemeralKey) {
        throw new Error("OpenAI did not return a client secret.");
      }

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const socket = new WebSocket(
        "wss://api.openai.com/v1/realtime?intent=transcription",
        ["realtime", `openai-insecure-api-key.${ephemeralKey}`],
      );

      realtimeSocketRef.current = socket;
      localStreamRef.current = localStream;

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: "session.update",
            session: REALTIME_TRANSCRIPTION_SESSION,
          }),
        );

        const AudioContextConstructor =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;

        if (AudioContextConstructor) {
          const audioContext = new AudioContextConstructor() as ScriptProcessorAudioContext;
          const source = audioContext.createMediaStreamSource(localStream);
          const processor = audioContext.createScriptProcessor(2048, 1, 1);

          source.connect(processor);
          processor.connect(audioContext.destination);
          voiceAudioContextRef.current = audioContext;
          voiceAudioSourceRef.current = source;
          voiceAudioProcessorRef.current = processor;

          processor.onaudioprocess = (audioEvent) => {
            if (
              socket.readyState !== WebSocket.OPEN ||
              statusRef.current !== "playing"
            ) {
              return;
            }

            const input = audioEvent.inputBuffer.getChannelData(0);
            const rms = getAudioRms(input);
            const now = Date.now();
            const turn = manualVoiceTurnRef.current;
            const hasVoice = rms >= VOICE_RMS_THRESHOLD;

            if (hasVoice) {
              if (!turn.isSpeaking) {
                turn.isSpeaking = true;
                turn.speechStartedAt = now;
                turn.silenceStartedAt = 0;
                turn.hasBufferedAudio = false;
                voiceQuestionVersionByItemRef.current.current =
                  voiceQuestionVersionRef.current;
                voiceStartedAtByItemRef.current.current = now;

                if (pendingVoiceSubmitRef.current) {
                  window.clearTimeout(pendingVoiceSubmitRef.current);
                  pendingVoiceSubmitRef.current = null;
                }

                if (voiceTypingIntervalRef.current) {
                  window.clearInterval(voiceTypingIntervalRef.current);
                  voiceTypingIntervalRef.current = null;
                }

                setTypedAnswer("");
              } else {
                turn.silenceStartedAt = 0;
              }
            }

            if (turn.isSpeaking) {
              socket.send(
                JSON.stringify({
                  type: "input_audio_buffer.append",
                  audio: encodePcm16Base64(input, audioContext.sampleRate),
                }),
              );
              turn.hasBufferedAudio = true;
            }

            if (!hasVoice && turn.isSpeaking) {
              if (!turn.silenceStartedAt) {
                turn.silenceStartedAt = now;
              }

              const speechDurationMs = now - turn.speechStartedAt;
              const silenceDurationMs = now - turn.silenceStartedAt;
              const canCommit =
                speechDurationMs >= VOICE_MIN_SPEECH_MS &&
                silenceDurationMs >= VOICE_SILENCE_COMMIT_MS &&
                now - turn.lastCommitAt >= VOICE_MIN_COMMIT_GAP_MS &&
                turn.hasBufferedAudio;

              if (canCommit) {
                turn.isSpeaking = false;
                turn.lastCommitAt = now;
                turn.silenceStartedAt = 0;
                turn.hasBufferedAudio = false;
                socket.send(
                  JSON.stringify({
                    type: "input_audio_buffer.commit",
                  }),
                );
              }
            }
          };
        }

        setIsListening(true);
        setVoiceStatus("listening");
      };

      socket.onclose = () => {
        setIsListening(false);
        setVoiceStatus((currentStatus) =>
          currentStatus === "error" ? currentStatus : "idle",
        );
      };

      socket.onerror = () => {
        setVoiceStatus("error");
        setVoiceError("Voice connection dropped.");
      };

      socket.onmessage = (event) => {
        const realtimeEvent = JSON.parse(event.data as string) as RealtimeServerEvent;

        if (realtimeEvent.type === "input_audio_buffer.speech_started") {
          if (statusRef.current !== "playing") {
            return;
          }

          const itemId = realtimeEvent.item_id;

          if (itemId) {
            voiceQuestionVersionByItemRef.current[itemId] =
              voiceQuestionVersionRef.current;
            voiceStartedAtByItemRef.current[itemId] = Date.now();
          }

          if (pendingVoiceSubmitRef.current) {
            window.clearTimeout(pendingVoiceSubmitRef.current);
            pendingVoiceSubmitRef.current = null;
          }

          if (voiceTypingIntervalRef.current) {
            window.clearInterval(voiceTypingIntervalRef.current);
            voiceTypingIntervalRef.current = null;
          }

          setTypedAnswer("");
        }

        if (
          realtimeEvent.type === "conversation.item.input_audio_transcription.delta" &&
          realtimeEvent.delta
        ) {
          const itemId = realtimeEvent.item_id ?? "current";

          if (!(itemId in voiceQuestionVersionByItemRef.current)) {
            voiceQuestionVersionByItemRef.current[itemId] =
              voiceQuestionVersionRef.current;
          }

          if (
            voiceQuestionVersionByItemRef.current[itemId] !==
              voiceQuestionVersionRef.current ||
            statusRef.current !== "playing"
          ) {
            return;
          }

          const nextTranscript = `${voiceTranscriptByItemRef.current[itemId] ?? ""}${
            realtimeEvent.delta
          }`;

          voiceTranscriptByItemRef.current[itemId] = nextTranscript;
        }

        if (realtimeEvent.type === "conversation.item.input_audio_transcription.completed") {
          const itemId = realtimeEvent.item_id ?? "current";
          const itemVersion =
            voiceQuestionVersionByItemRef.current[itemId] ??
            voiceQuestionVersionByItemRef.current.current;
          const transcript = (
            realtimeEvent.transcript ?? voiceTranscriptByItemRef.current[itemId] ?? ""
          ).trim();
          const cleanedTranscript = cleanVoiceAnswer(transcript);
          const speechDurationMs =
            Date.now() - (voiceStartedAtByItemRef.current[itemId] ?? Date.now());
          const normalizedTranscript = normalize(cleanedTranscript);
          const isVeryShortNoise =
            speechDurationMs < 280 && normalizedTranscript.replace(/\s/g, "").length < 4;

          if (
            isProbablyIntentionalVoiceAnswer(cleanedTranscript) &&
            !isVeryShortNoise &&
            itemVersion === voiceQuestionVersionRef.current &&
            statusRef.current === "playing"
          ) {
            submitVoiceAnswer(cleanedTranscript);
          }

          delete voiceTranscriptByItemRef.current[itemId];
          delete voiceQuestionVersionByItemRef.current[itemId];
          delete voiceStartedAtByItemRef.current[itemId];
          delete voiceQuestionVersionByItemRef.current.current;
          delete voiceStartedAtByItemRef.current.current;
        }

        if (realtimeEvent.type === "conversation.item.input_audio_transcription.failed") {
          setVoiceStatus("error");
          setVoiceError(realtimeEvent.error?.message ?? "Voice transcription failed.");
        }

        if (realtimeEvent.type === "error") {
          setVoiceStatus("error");
          setVoiceError(realtimeEvent.error?.message ?? "OpenAI voice mode hit an error.");
        }
      };
    } catch (error) {
      stopRealtimeVoice();
      setVoiceModeEnabled(false);
      setVoiceStatus("error");
      setVoiceError(error instanceof Error ? error.message : "Voice mode could not start.");
    }
  }, [stopRealtimeVoice, submitVoiceAnswer]);

  const startRound = () => {
    if (!usernameReady && homeView !== "lobby") {
      return;
    }

    const nextQueue = getRoundQuestionQueue(
      activeQuestions,
      selectedCategory,
      selectedGameMode,
    );
    const firstQuestion = activeQuestions[nextQueue[0]] ?? activeQuestions[0];

    roundSavedRef.current = false;
    setQuestionQueue(nextQueue);
    setScore(0);
    setAcceptedAnswersByQuestion({});
    setTypedAnswer("");
    setVoiceModeEnabled(true);
    setVoiceError("");
    setDontSayEliminated(false);
    setSecondsLeft(getQuestionSeconds(firstQuestion));
    setStatus("ready");
    setMessage("");
    setScoreDelta(0);
    setLastCorrectAnswer("");
    setLastWrongAnswer("");
    setWrongAttemptCount(0);
    setNextCountdown(null);
    setStartCountdown(3);
  };

  const returnToStart = () => {
    const nextQueue = getRoundQuestionQueue(
      activeQuestions,
      selectedCategory,
      selectedGameMode,
    );
    const firstQuestion = activeQuestions[nextQueue[0]] ?? activeQuestions[0];

    stopRealtimeVoice();
    setVoiceModeEnabled(false);
    setQuestionQueue(nextQueue);
    setTypedAnswer("");
    setAcceptedAnswersByQuestion({});
    setDontSayEliminated(false);
    setSecondsLeft(getQuestionSeconds(firstQuestion));
    setScore(0);
    setStatus("ready");
    setMessage("");
    setScoreDelta(0);
    setLastCorrectAnswer("");
    setLastWrongAnswer("");
    setWrongAttemptCount(0);
    setNextCountdown(null);
    setStartCountdown(null);
  };

  const toggleVoiceInput = () => {
    setVoiceModeEnabled((enabled) => !enabled);
  };

  const markCorrect = useCallback((answer?: string) => {
    const points = getQuestionPoints(currentQuestion, secondsLeft);

    invalidateVoiceQuestion();
    setScore((total) => total + points);
    setScoreDelta(points);
    setStatus("correct");
    setMessage(`Correct +${points}`);
    setLastCorrectAnswer(answer ?? answerHint);
    setLastWrongAnswer("");
  }, [answerHint, currentQuestion, invalidateVoiceQuestion, secondsLeft]);

  const markWrong = useCallback((answer: string, feedback: string) => {
    invalidateVoiceQuestion();
    setScore((total) => Math.max(0, total - WRONG_ANSWER_PENALTY));
    setScoreDelta(-WRONG_ANSWER_PENALTY);
    setStatus("wrong");
    setLastWrongAnswer(answer);
    setWrongAttemptCount((count) => count + 1);
    setMessage(`${feedback} -${WRONG_ANSWER_PENALTY}`);
  }, [invalidateVoiceQuestion]);

  const markMultiWrong = useCallback((answer: string, feedback: string) => {
    invalidateVoiceQuestion();
    setScore((total) => Math.max(0, total - WRONG_ANSWER_PENALTY));
    setScoreDelta(-WRONG_ANSWER_PENALTY);
    setLastWrongAnswer(answer);
    setWrongAttemptCount((count) => count + 1);
    setMessage(`${feedback} -${WRONG_ANSWER_PENALTY}`);
  }, [invalidateVoiceQuestion]);

  const validateDontSayAnswer = useCallback(async (rawAnswer: string) => {
    if (!currentDontSayQuestion || dontSayValidationPending) {
      setMessage("Try again");
      return;
    }

    setDontSayValidationPending(true);
    setMessage("Validating");

    try {
      const response = await fetch("/api/dont-say/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: currentDontSayQuestion.prompt,
          guidance: currentDontSayQuestion.guidance,
          answer: rawAnswer,
        }),
      });
      const validation = (await response.json()) as DontSayValidation & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(validation.error ?? "Validation failed.");
      }

      if (!validation.counts) {
        setMessage(
          validation.reason
            ? `Nope, pick something else. ${validation.reason}`
            : "Nope, pick something else.",
        );
        setTypedAnswer("");
        return;
      }

      const normalizedPlayerAnswer =
        validation.normalizedAnswer || normalizeAnswer(validation.canonicalAnswer);
      const fallbackSecretAnswer = getRandomItem(currentDontSayQuestion.examples, "");
      const secretAnswer =
        dontSaySecret ?? {
          answer: fallbackSecretAnswer,
          normalizedAnswer: normalizeAnswer(fallbackSecretAnswer),
        };
      const matchedAi =
        normalizedPlayerAnswer === secretAnswer.normalizedAnswer ||
        normalizeAnswer(rawAnswer) === secretAnswer.normalizedAnswer;

      setDontSayLastAnswer(validation.canonicalAnswer);
      setTypedAnswer("");
      invalidateVoiceQuestion();

      if (matchedAi) {
        setScoreDelta(-WRONG_ANSWER_PENALTY);
        setScore((total) => Math.max(0, total - WRONG_ANSWER_PENALTY));
        setStatus("wrong");
        setDontSayEliminated(true);
        setLastWrongAnswer(validation.canonicalAnswer);
        setWrongAttemptCount((count) => count + 1);
        setMessage(`Eliminated. AI had ${secretAnswer.answer}`);
        return;
      }

      const points = BASE_POINTS + secondsLeft * TIME_BONUS_PER_SECOND;

      setScore((total) => total + points);
      setScoreDelta(points);
      setStatus("correct");
      setLastCorrectAnswer(validation.canonicalAnswer);
      setLastWrongAnswer("");
      setMessage(`Safe. AI had ${secretAnswer.answer} +${points}`);
    } catch {
      setMessage("Could not reach AI. Try again");
      setTypedAnswer("");
    } finally {
      setDontSayValidationPending(false);
    }
  }, [
    currentDontSayQuestion,
    dontSaySecret,
    dontSayValidationPending,
    invalidateVoiceQuestion,
    secondsLeft,
  ]);

  const gradeAnswer = useCallback(async (answer: string) => {
    if (status !== "playing" || dontSayValidationPending) {
      return;
    }

    if (autoSubmitRef.current) {
      window.clearTimeout(autoSubmitRef.current);
      autoSubmitRef.current = null;
    }

    const rawAnswer = answer.trim();
    const normalizedAnswer = normalize(rawAnswer);

    if (!normalizedAnswer) {
      return;
    }

    if (isDontSayMode) {
      void validateDontSayAnswer(rawAnswer);
      return;
    }

    if (currentQuestion.type === "number") {
      const guessedNumber = extractNumber(rawAnswer);
      const isCorrect =
        guessedNumber !== null &&
        guessedNumber >= currentQuestion.min &&
        guessedNumber <= currentQuestion.max;

      if (isCorrect) {
        markCorrect(rawAnswer);
      } else if (
        guessedNumber !== null &&
        isCloseNumberAnswer(guessedNumber, currentQuestion.min, currentQuestion.max)
      ) {
        const points = getNumberClosenessScore(currentQuestion, guessedNumber, secondsLeft);
        const difference = Math.abs(
          guessedNumber - getNumberTarget(currentQuestion.min, currentQuestion.max),
        );

        invalidateVoiceQuestion();
        setScore((total) => total + points);
        setScoreDelta(points);
        setStatus("correct");
        setMessage(`Close +${points} · off by ~${formatApproxNumber(difference)}`);
        setLastCorrectAnswer(rawAnswer);
      } else {
        markWrong(rawAnswer, `Wrong, it's ${currentQuestion.displayAnswer}`);
      }
      return;
    }

    if (currentQuestion.type === "ranking") {
      const commandResult = applyRankingCommand(
        rawAnswer,
        currentQuestion,
        acceptedAnswers,
      );
      const nextRankingAnswers = commandResult.handled
        ? commandResult.answers
        : [
            ...acceptedAnswers,
            ...extractRankingAnswersFromInput(
              rawAnswer,
              currentQuestion,
              acceptedAnswers,
            ),
          ];

      if (nextRankingAnswers.length === acceptedAnswers.length && !commandResult.handled) {
        setLastWrongAnswer(rawAnswer);
        setMessage("Not in this ranking");
        setTypedAnswer("");
        return;
      }

      setAcceptedAnswersByQuestion((answers) => ({
        ...answers,
        [currentIndex]: nextRankingAnswers,
      }));
      setTypedAnswer("");
      setLastWrongAnswer("");
      setMessage(commandResult.message || `${nextRankingAnswers.length}/${neededAnswers}`);

      if (nextRankingAnswers.length >= currentQuestion.answers.length) {
        const correctPositions = nextRankingAnswers.filter(
          (answer, index) =>
            getAnswerIdentity(answer) ===
            getAnswerIdentity(currentQuestion.answers[index]),
        ).length;
        const basePoints = correctPositions * getRankingAnswerPoints(
          currentQuestion,
          secondsLeft,
        );
        const points = Math.max(0, basePoints);

        invalidateVoiceQuestion();
        setScore((total) => total + points);
        setScoreDelta(points);
        setStatus(correctPositions === currentQuestion.answers.length ? "correct" : "wrong");
        setMessage(
          correctPositions === currentQuestion.answers.length
            ? `Correct +${points}`
            : `You got ${correctPositions}/${currentQuestion.answers.length} in order`,
        );
        setLastCorrectAnswer(currentQuestion.answers.join(", "));
      }
      return;
    }

    const accepted = currentQuestion.answers.map(normalize);
    const isCorrect = accepted.includes(normalizedAnswer);

    if (!isCorrect) {
      const isClose = isCloseTextAnswer(normalizedAnswer, currentQuestion.answers);

      if (isClose) {
        setLastWrongAnswer(rawAnswer);
        setMessage("Close, but need a better answer");
        setTypedAnswer("");
        return;
      }

      if (currentQuestion.type === "multi") {
        try {
          setDontSayValidationPending(true);
          setMessage("Validating");

          const response = await fetch("/api/classic/validate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: currentQuestion.prompt,
              guidance: getClassicValidationGuidance(currentQuestion),
              answer: rawAnswer,
            }),
          });
          const validation = (await response.json()) as ClassicValidation & {
            error?: string;
          };

          if (!response.ok) {
            throw new Error(validation.error ?? "Open answer validation failed.");
          }

          if (
            validation.counts &&
            statusRef.current === "playing" &&
            normalize(validation.canonicalAnswer)
          ) {
            const canonicalAnswer = validation.canonicalAnswer.trim();
            const alreadyAccepted = acceptedAnswers
              .map(getAnswerIdentity)
              .includes(getAnswerIdentity(canonicalAnswer));

            if (!alreadyAccepted) {
              const points = getMultiAnswerPoints(currentQuestion, secondsLeft);
              const nextAccepted = [...acceptedAnswers, canonicalAnswer];

              setAcceptedAnswersByQuestion((answers) => ({
                ...answers,
                [currentIndex]: nextAccepted,
              }));
              setScore((total) => total + points);
              setScoreDelta(points);
              setTypedAnswer("");
              setLastWrongAnswer("");
              setMessage(`${nextAccepted.length}/${currentQuestion.required}`);

              if (nextAccepted.length >= currentQuestion.required) {
                invalidateVoiceQuestion();
                setStatus("correct");
                setMessage(`Correct +${points}`);
                setLastCorrectAnswer(canonicalAnswer);
              }
            } else {
              setTypedAnswer("");
            }

            return;
          }
        } catch {
          setMessage("Could not validate. Try again");
          setTypedAnswer("");
          return;
        } finally {
          setDontSayValidationPending(false);
        }

        markMultiWrong(rawAnswer, "Not quite!");
        setTypedAnswer("");
        return;
      }

      markWrong(
        rawAnswer,
        `Wrong, it's ${formatAnswerLabel(currentQuestion.answers[0])}`,
      );
      setTypedAnswer("");
      return;
    }

    if (currentQuestion.type === "multi") {
      const canonicalAnswer = currentQuestion.answers[accepted.indexOf(normalizedAnswer)];
      const alreadyAccepted = acceptedAnswers
        .map(getAnswerIdentity)
        .includes(getAnswerIdentity(normalizedAnswer));

      if (alreadyAccepted) {
        setTypedAnswer("");
        return;
      }

      const points = getMultiAnswerPoints(currentQuestion, secondsLeft);
      const nextAccepted = [...acceptedAnswers, canonicalAnswer];
      setAcceptedAnswersByQuestion((answers) => ({
        ...answers,
        [currentIndex]: nextAccepted,
      }));
      setScore((total) => total + points);
      setScoreDelta(points);
      setTypedAnswer("");
      setLastWrongAnswer("");
      setMessage(`${nextAccepted.length}/${currentQuestion.required}`);

      if (nextAccepted.length >= currentQuestion.required) {
        invalidateVoiceQuestion();
        setStatus("correct");
        setMessage(`Correct +${points}`);
        setLastCorrectAnswer(canonicalAnswer);
      }
      return;
    }

    markCorrect(currentQuestion.answers[accepted.indexOf(normalizedAnswer)]);
  }, [
    acceptedAnswers,
    currentIndex,
    currentQuestion,
    dontSayValidationPending,
    markCorrect,
    markMultiWrong,
    markWrong,
    neededAnswers,
    invalidateVoiceQuestion,
    isDontSayMode,
    secondsLeft,
    status,
    validateDontSayAnswer,
  ]);

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    gradeAnswer(typedAnswer);
  };

  const reorderRankingAnswer = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        currentQuestion.type !== "ranking" ||
        status !== "playing" ||
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= acceptedAnswers.length ||
        toIndex >= acceptedAnswers.length
      ) {
        return;
      }

      setAcceptedAnswersByQuestion((answers) => ({
        ...answers,
        [currentIndex]: moveArrayItem(
          answers[currentIndex] ?? [],
          fromIndex,
          toIndex,
        ),
      }));
      setMessage("Reordered");
    },
    [acceptedAnswers.length, currentIndex, currentQuestion.type, status],
  );

  const removeRankingAnswer = useCallback(
    (answerIndex: number) => {
      if (
        currentQuestion.type !== "ranking" ||
        status !== "playing" ||
        answerIndex < 0 ||
        answerIndex >= acceptedAnswers.length
      ) {
        return;
      }

      setAcceptedAnswersByQuestion((answers) => ({
        ...answers,
        [currentIndex]: (answers[currentIndex] ?? []).filter(
          (_, index) => index !== answerIndex,
        ),
      }));
      setMessage("Removed");
    },
    [acceptedAnswers.length, currentIndex, currentQuestion.type, status],
  );

  useEffect(() => {
    gradeAnswerRef.current = gradeAnswer;
  }, [gradeAnswer]);

  useEffect(() => {
    if (autoSubmitRef.current) {
      window.clearTimeout(autoSubmitRef.current);
      autoSubmitRef.current = null;
    }

    if (status !== "playing") {
      return;
    }

    const normalizedTypedAnswer = normalize(typedAnswer);

    if (!normalizedTypedAnswer || currentQuestion.type === "number") {
      return;
    }

    if (currentQuestion.type === "ranking") {
      const rankingCommand = applyRankingCommand(
        typedAnswer,
        currentQuestion,
        acceptedAnswers,
      );
      const hasRankingAnswer =
        rankingCommand.handled ||
        extractRankingAnswersFromInput(
          typedAnswer,
          currentQuestion,
          acceptedAnswers,
        ).length > 0;

      if (!hasRankingAnswer) {
        return;
      }

      autoSubmitRef.current = window.setTimeout(() => {
        autoSubmitRef.current = null;
        gradeAnswerRef.current(typedAnswer);
      }, 120);

      return () => {
        if (autoSubmitRef.current) {
          window.clearTimeout(autoSubmitRef.current);
          autoSubmitRef.current = null;
        }
      };
    }

    if (
      currentQuestion.type === "multi" &&
      acceptedAnswerIdentityKey
        .split("|")
        .includes(getAnswerIdentity(normalizedTypedAnswer))
    ) {
      return;
    }

    const isExactAcceptedAnswer = currentAcceptedAnswerKey
      .split("|")
      .includes(normalizedTypedAnswer);

    if (!isExactAcceptedAnswer) {
      return;
    }

    autoSubmitRef.current = window.setTimeout(() => {
      autoSubmitRef.current = null;
      gradeAnswerRef.current(typedAnswer);
    }, 60);

    return () => {
      if (autoSubmitRef.current) {
        window.clearTimeout(autoSubmitRef.current);
        autoSubmitRef.current = null;
      }
    };
  }, [
    acceptedAnswerIdentityKey,
    currentAcceptedAnswerKey,
    acceptedAnswers,
    currentQuestion.type,
    currentQuestion,
    status,
    typedAnswer,
  ]);

  useEffect(() => {
    if (voiceModeEnabled && status !== "ready" && status !== "done") {
      const connect = window.setTimeout(() => {
        void startRealtimeVoice();
      }, 0);

      return () => window.clearTimeout(connect);
    }

    if (!voiceModeEnabled || status === "ready" || status === "done") {
      const disconnect = window.setTimeout(() => {
        stopRealtimeVoice();
      }, 0);

      return () => window.clearTimeout(disconnect);
    }
  }, [startRealtimeVoice, status, stopRealtimeVoice, voiceModeEnabled]);

  useEffect(() => () => stopRealtimeVoice(), [stopRealtimeVoice]);

  useEffect(() => {
    if (startCountdown === null) {
      return;
    }

    if (startCountdown <= 0) {
      const begin = window.setTimeout(() => {
        resetQuestionState();
      }, 760);

      return () => window.clearTimeout(begin);
    }

    const tick = window.setTimeout(() => {
      setStartCountdown((countdown) =>
        countdown === null ? null : Math.max(0, countdown - 1),
      );
    }, 980);

    return () => window.clearTimeout(tick);
  }, [resetQuestionState, startCountdown]);

  if (status === "ready") {
    return (
      <main className="min-h-screen bg-white text-slate-950">
        {startCountdown !== null ? (
          <div className="fixed inset-0 z-30 grid place-items-center bg-white">
            {startCountdown > 0 ? (
              <div className="start-countdown grid h-36 w-36 place-items-center rounded-full border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
                <span className="text-7xl font-black leading-none text-slate-950">
                  {startCountdown}
                </span>
              </div>
            ) : (
              <div className="start-go text-8xl font-black leading-none text-slate-950 sm:text-9xl">
                Go!
              </div>
            )}
          </div>
        ) : null}
        <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-10">
          {homeView === "play" ? (
            <>
              <div className="fixed left-6 top-6 z-20" ref={otherMenuRef}>
                <button
                  aria-expanded={otherMenuOpen}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 shadow-[0_14px_35px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-[0_20px_46px_rgba(15,23,42,0.12)]"
                  onClick={() => setOtherMenuOpen((open) => !open)}
                  type="button"
                >
                  Other
                  <svg
                    className={[
                      "h-4 w-4 transition-transform",
                      otherMenuOpen ? "rotate-180" : "",
                    ].join(" ")}
                    aria-hidden="true"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.25"
                    />
                  </svg>
                </button>
                {otherMenuOpen ? (
                  <div className="popover-menu absolute left-0 top-[calc(100%+0.55rem)] w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                    <button
                      className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                      onClick={() => {
                        setHomeView("about");
                        setOtherMenuOpen(false);
                      }}
                      type="button"
                    >
                      About
                    </button>
                    <button
                      className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                      onClick={() => {
                        setHomeView("settings");
                        setOtherMenuOpen(false);
                      }}
                      type="button"
                    >
                      Settings
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                className="fixed right-6 top-6 z-20 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 shadow-[0_14px_35px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-[0_20px_46px_rgba(15,23,42,0.12)]"
                onClick={() => setHomeView("leaderboard")}
                type="button"
              >
                Leaderboard
              </button>
            </>
          ) : (
            <button
              className="fixed left-6 top-6 z-20 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 shadow-[0_14px_35px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-[0_20px_46px_rgba(15,23,42,0.12)]"
              onClick={() => setHomeView("play")}
              type="button"
            >
              Return
            </button>
          )}
          <div className="mx-auto w-full max-w-3xl text-center">
            <h1 className="text-5xl font-bold leading-[0.95] tracking-normal text-balance sm:text-7xl">
              {homeView === "play"
                ? "Gameboard"
                : homeView === "leaderboard"
                  ? "Leaderboard"
                  : homeView === "about"
                    ? "About the game"
                    : homeView === "settings"
                      ? "Settings"
                      : (
                        <span className="group/name inline-flex items-center gap-3">
                          <span>{groupName}</span>
                          <button
                            aria-label="Edit group name"
                            className="group-name-edit grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-slate-950 hover:text-slate-950 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
                            onClick={() => {
                              setDraftGroupName(groupName);
                              setGroupNameModalOpen(true);
                            }}
                            type="button"
                          >
                            <svg
                              className="h-4 w-4"
                              aria-hidden="true"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="m14.5 5.5 4 4M4 20l4.4-.9L19 8.5a2.8 2.8 0 0 0-4-4L4.4 15.1z"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                              />
                            </svg>
                          </button>
                        </span>
                      )}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-normal leading-8 text-slate-500">
              {homeView === "play"
                ? "Pick a mode and play solo or with a group."
                : homeView === "leaderboard"
                  ? "Top scores from players around the world."
                  : homeView === "about"
                    ? "A fast trivia game built for typing, voice answers, and quick rounds."
                    : homeView === "settings"
                      ? "Update your player name and avatar."
                      : "Wait for players, invite friends, and start when ready."}
            </p>

            {homeView === "play" ? (
              <div className="mx-auto mt-10 w-full max-w-3xl text-center">
                <div
                  className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xl font-bold leading-[1.45] text-slate-950 sm:text-2xl"
                >
                  <span>Play</span>
                  <button
                    aria-label="Change game mode"
                    className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xl font-bold text-violet-800 transition hover:bg-violet-200 active:scale-[0.98] sm:text-2xl"
                    onClick={cycleGameMode}
                    type="button"
                  >
                    {gameModeMeta[selectedGameMode].title}
                    <CycleIcon />
                  </button>
                  <span>in</span>
                  <button
                    aria-label="Change category"
                    className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xl font-bold text-teal-800 transition hover:bg-teal-200 active:scale-[0.98] sm:text-2xl"
                    onClick={cycleCategory}
                    type="button"
                  >
                    {categoryMeta[selectedCategory].label}
                    <CycleIcon />
                  </button>
                  <span>on</span>
                  <button
                    aria-label="Change difficulty"
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xl font-bold text-amber-800 transition hover:bg-amber-200 active:scale-[0.98] sm:text-2xl"
                    onClick={cycleDifficulty}
                    type="button"
                  >
                    {difficultyMeta[selectedDifficulty].toLowerCase()}
                    <CycleIcon />
                  </button>
                  <span>mode</span>
                </div>
                <div className="group/info relative mx-auto mt-6 inline-flex max-w-xl items-center justify-center gap-2 text-base font-medium leading-7 text-slate-500">
                  <span>{gameModeMeta[selectedGameMode].body}</span>
                  <button
                    aria-label={`${gameModeMeta[selectedGameMode].title} details`}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-950 focus:bg-slate-100 focus:text-slate-950 focus:outline-none"
                    type="button"
                  >
                    <svg
                      className="h-4 w-4"
                      aria-hidden="true"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 11v5M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.2"
                      />
                    </svg>
                  </button>
                  <div className="pointer-events-none absolute left-1/2 top-[calc(100%+0.65rem)] z-30 w-[min(22rem,calc(100vw-3rem))] -translate-x-1/2 translate-y-1 rounded-2xl border border-slate-200 bg-white p-4 text-left opacity-0 shadow-[0_22px_65px_rgba(15,23,42,0.14)] transition duration-150 group-hover/info:pointer-events-auto group-hover/info:translate-y-0 group-hover/info:opacity-100 group-focus-within/info:pointer-events-auto group-focus-within/info:translate-y-0 group-focus-within/info:opacity-100">
                    <p className="text-sm font-bold text-slate-950">
                      {gameModeMeta[selectedGameMode].title}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                      {gameModeMeta[selectedGameMode].detail}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={[
                  "mx-auto mt-8 w-full text-left",
                  homeView === "leaderboard" ? "max-w-md" : "max-w-xl",
                ].join(" ")}
              >
                {homeView === "about" ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                    <div className="about-step grid gap-5" key={aboutSteps[aboutStep].title}>
                      <AboutVisual
                        visual={aboutSteps[aboutStep].visual}
                        key={aboutSteps[aboutStep].visual}
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-400">
                          {String(aboutStep + 1).padStart(2, "0")} /{" "}
                          {String(aboutSteps.length).padStart(2, "0")}
                        </p>
                        <h2 className="mt-2 text-3xl font-bold text-slate-950">
                          {aboutSteps[aboutStep].title}
                        </h2>
                        <p className="mt-3 text-base leading-7 text-slate-500">
                          {aboutSteps[aboutStep].body}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-4">
                      <div className="flex gap-2">
                        {aboutSteps.map((step, index) => (
                          <button
                            aria-label={`Show ${step.title}`}
                            className={[
                              "h-2.5 rounded-full transition",
                              aboutStep === index
                                ? "w-8 bg-slate-950"
                                : "w-2.5 bg-slate-200 hover:bg-slate-300",
                            ].join(" ")}
                            key={step.title}
                            onClick={() => setAboutStep(index)}
                            type="button"
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-35"
                          disabled={aboutStep === 0}
                          onClick={() => setAboutStep((step) => Math.max(0, step - 1))}
                          type="button"
                        >
                          <svg
                            className="h-5 w-5"
                            aria-hidden="true"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M15 6l-6 6 6 6"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.25"
                            />
                          </svg>
                        </button>
                        <button
                          className="grid h-11 w-11 place-items-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
                          disabled={aboutStep === aboutSteps.length - 1}
                          onClick={() =>
                            setAboutStep((step) =>
                              Math.min(aboutSteps.length - 1, step + 1),
                            )
                          }
                          type="button"
                        >
                          <svg
                            className="h-5 w-5"
                            aria-hidden="true"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M9 6l6 6-6 6"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.25"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : homeView === "lobby" ? (
                  <div className="mx-auto max-h-[calc(100vh-15rem)] space-y-4 overflow-hidden pb-4">
                    <div
                      className={[
                        "relative overflow-hidden rounded-xl",
                        lobbyPlayersScroll.canScrollUp ? "leaderboard-fade-top" : "",
                        lobbyPlayersScroll.canScrollDown ? "leaderboard-fade-bottom" : "",
                      ].join(" ")}
                    >
                      <div
                        className="max-h-[16rem] overflow-y-auto overscroll-contain pr-1"
                        onScroll={(event) => {
                          const element = event.currentTarget;

                          setLobbyPlayersScroll({
                            canScrollUp: element.scrollTop > 2,
                            canScrollDown:
                              element.scrollTop + element.clientHeight <
                              element.scrollHeight - 2,
                          });
                        }}
                      >
                        <div
                          className="grid grid-cols-4 gap-3"
                          key={visibleLobbyPlayers
                            .map((player) => `${player.name}-${player.avatar}`)
                            .join("|")}
                        >
                        {visibleLobbyPlayers.map((player, index) => (
                          <div
                            className="lobby-player-card relative flex min-h-32 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-2 py-4 text-center"
                            key={`${player.name}-${index}`}
                            style={{ "--card-delay": `${index * 0.085}s` } as React.CSSProperties}
                          >
                            {player.isCurrent ? (
                              <button
                                aria-label="Edit your lobby profile"
                                className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-950 hover:text-slate-950"
                                onClick={openLobbyProfileModal}
                                type="button"
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="m14.5 5.5 4 4M4 20l4.4-.9L19 8.5a2.8 2.8 0 0 0-4-4L4.4 15.1z"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                  />
                                </svg>
                              </button>
                            ) : null}
                            <div className="flex min-w-0 flex-col items-center gap-2">
                              <Image
                                className="h-12 w-12 shrink-0 rounded-full bg-white object-cover ring-1 ring-slate-200"
                                src={getAvatarUrl(player.avatar)}
                                alt={`${player.name} avatar`}
                                width={48}
                                height={48}
                                unoptimized
                              />
                              <span className="flex max-w-full items-center gap-1.5">
                                <span className="truncate text-sm font-bold text-slate-950">
                                  {player.name}
                                </span>
                                {player.isHost ? (
                                  <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold leading-none text-violet-800">
                                    Host
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : homeView === "settings" ? (
                  <div className="space-y-4">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                      <label
                        className="mb-3 block text-sm font-medium text-slate-500"
                        htmlFor="settings-username"
                      >
                        Name
                      </label>
                      <input
                        className="h-14 w-full rounded-full border border-slate-200 bg-white px-5 text-lg font-medium text-slate-950 outline-none transition placeholder:text-slate-300 hover:border-slate-400 focus:border-slate-950"
                        id="settings-username"
                        maxLength={18}
                        onChange={(event) =>
                          updatePlayerProfile({
                            ...playerProfile,
                            username: event.target.value,
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }
                        }}
                        placeholder="Username"
                        value={playerProfile.username}
                      />
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                      <p className="mb-4 text-sm font-medium text-slate-500">Avatar</p>
                      <div className="flex items-start gap-5">
                        <div className="selected-avatar shrink-0 rounded-full border border-slate-200 bg-white p-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                          <Image
                            className="h-20 w-20 rounded-full bg-slate-100 object-cover"
                            src={getAvatarUrl(playerProfile.avatar)}
                            alt="Selected avatar"
                            width={80}
                            height={80}
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={[
                              "avatar-strip relative w-full overflow-hidden",
                              avatarScroll.canScrollLeft ? "avatar-fade-left" : "",
                              avatarScroll.canScrollRight ? "avatar-fade-right" : "",
                            ].join(" ")}
                          >
                          <div
                            className="flex max-w-full gap-2 overflow-x-auto px-1 py-3"
                            onScroll={(event) => {
                              const element = event.currentTarget;

                              setAvatarScroll({
                                canScrollLeft: element.scrollLeft > 2,
                                canScrollRight:
                                  element.scrollLeft + element.clientWidth <
                                  element.scrollWidth - 2,
                              });
                            }}
                          >
                            {playerAvatars.map((avatar) => (
                              <button
                                aria-label={`Use ${avatar} avatar`}
                                className={[
                                  "grid h-12 w-12 shrink-0 place-items-center rounded-full transition",
                                  playerProfile.avatar === avatar
                                    ? "ring-2 ring-slate-950/70 ring-offset-2"
                                    : "ring-1 ring-slate-200 hover:ring-slate-400",
                                ].join(" ")}
                                key={avatar}
                                onClick={() =>
                                  updatePlayerProfile({
                                    ...playerProfile,
                                    avatar,
                                  })
                                }
                                type="button"
                              >
                                <Image
                                  className="h-12 w-12 rounded-full bg-white object-cover"
                                  src={getAvatarUrl(avatar)}
                                  alt=""
                                  width={48}
                                  height={48}
                                  unoptimized
                                />
                              </button>
                            ))}
                          </div>
                          </div>
                          <label className="mt-4 flex h-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:border-slate-950 hover:text-slate-950">
                            Upload custom
                            <input
                              accept="image/*"
                              className="sr-only"
                              onChange={(event) => uploadPlayerAvatar(event.target.files?.[0])}
                              type="file"
                            />
                          </label>
                        </div>
                      </div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                      <p className="text-sm font-medium text-slate-500">Subscription</p>
                      <div className="mt-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-bold text-slate-950">Free plan</p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            Premium categories, groups, and stats will live here later.
                          </p>
                        </div>
                        <button
                          className="h-11 shrink-0 rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-400"
                          disabled
                          type="button"
                        >
                          Manage
                        </button>
                      </div>
                    </section>
                    <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                      <p className="text-sm font-medium text-red-600">Delete account</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Clears your local name, avatar, and saved total points on this
                        device.
                      </p>
                      <button
                        className="mt-4 h-11 rounded-full bg-red-600 px-5 text-sm font-medium text-white transition hover:bg-red-700"
                        onClick={deleteLocalAccount}
                        type="button"
                      >
                        Delete local account
                      </button>
                    </section>
                  </div>
                ) : (
                  <>
                <div className="mb-4 flex rounded-full border border-slate-200 bg-white p-1 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                  {leaderboardScopes.map((scope) => (
                    <button
                      className={[
                        "leaderboard-scope-button h-10 flex-1 rounded-full px-4 text-sm font-medium transition duration-300",
                        leaderboardScope === scope
                          ? "leaderboard-scope-active bg-slate-950 text-white"
                          : "text-slate-500 hover:text-slate-950",
                      ].join(" ")}
                      key={scope}
                      onClick={() => {
                        setLeaderboardScope(scope);
                        setLeaderboardScroll({
                          canScrollUp: false,
                          canScrollDown: true,
                        });
                      }}
                      type="button"
                    >
                      {leaderboardScopeLabels[scope]}
                    </button>
                  ))}
                </div>
                <div
                  className={[
                    "leaderboard-card relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]",
                    leaderboardScroll.canScrollUp ? "leaderboard-fade-top" : "",
                    leaderboardScroll.canScrollDown ? "leaderboard-fade-bottom" : "",
                  ].join(" ")}
                  key={leaderboardScope}
                >
                  <div
                    className="max-h-[28rem] overflow-y-auto overscroll-contain"
                    onScroll={(event) => {
                      const element = event.currentTarget;

                      setLeaderboardScroll({
                        canScrollUp: element.scrollTop > 2,
                        canScrollDown:
                          element.scrollTop + element.clientHeight <
                          element.scrollHeight - 2,
                      });
                    }}
                  >
                  {activeLeaderboard.map((entry, index) => (
                    <div
                      className="leaderboard-row flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-b-0"
                      key={entry.name}
                      style={{
                        "--row-delay": `${Math.min(index, 18) * 0.026}s`,
                      } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-4">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                          {index + 1}
                        </span>
                        {entry.avatar ? (
                          <Image
                            className="h-11 w-11 rounded-full bg-slate-100 object-cover ring-1 ring-slate-200"
                            src={entry.avatar}
                            alt={`${entry.name} avatar`}
                            width={44}
                            height={44}
                            unoptimized
                          />
                        ) : null}
                        <span className="text-lg font-bold text-slate-950">
                          {entry.name}
                        </span>
                      </div>
                      <span className="flex items-center gap-2 text-lg font-bold tabular-nums text-slate-950">
                        {index < 3 ? (
                          <span aria-label={["Gold", "Silver", "Bronze"][index]}>
                            {["🥇", "🥈", "🥉"][index]}
                          </span>
                        ) : null}
                        <span>{entry.score.toLocaleString()}</span>
                      </span>
                    </div>
                  ))}
                  </div>
                </div>
                </>
                )}
              </div>
            )}
          </div>
        </section>
        <div
          className={[
            "fixed inset-x-0 bottom-6 z-20 flex-col items-center justify-center gap-3 px-5 sm:flex-row",
            homeView === "play" ? "flex" : "hidden",
          ].join(" ")}
        >
          <button
            className="flex h-14 w-full max-w-[16rem] items-center justify-center rounded-full bg-slate-950 px-8 text-lg font-medium text-white shadow-[0_18px_60px_rgba(15,23,42,0.22)] transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_26px_76px_rgba(15,23,42,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white disabled:shadow-none disabled:hover:translate-y-0"
            disabled={!usernameReady}
            onClick={startRound}
            title={usernameReady ? "Play solo" : "Enter a username first"}
            type="button"
          >
            Play solo
          </button>
          <div className="flex h-14 w-full max-w-[25rem] overflow-hidden rounded-full border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] transition duration-300 ease-out hover:shadow-[0_24px_68px_rgba(15,23,42,0.12)]">
            <button
              className="flex min-w-0 flex-1 items-center justify-center px-5 text-base font-medium text-slate-400 transition hover:bg-slate-50 hover:text-slate-500 sm:text-lg"
              onClick={() => {}}
              type="button"
            >
              Start a group
            </button>
            <div className="my-3 w-px shrink-0 bg-slate-200" />
            <button
              className="flex min-w-0 flex-1 items-center justify-center px-5 text-base font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 sm:text-lg"
              onClick={() => setJoinModalOpen(true)}
              type="button"
            >
              Join with code
            </button>
          </div>
        </div>
        <div
          className={[
            "fixed inset-x-0 bottom-6 z-20 justify-center gap-3 px-5",
            homeView === "lobby" ? "flex" : "hidden",
          ].join(" ")}
        >
          <button
            className="flex h-14 w-full max-w-[14rem] items-center justify-center rounded-full bg-slate-950 px-8 text-lg font-medium text-white shadow-[0_18px_60px_rgba(15,23,42,0.22)] transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_26px_76px_rgba(15,23,42,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white disabled:shadow-none disabled:hover:translate-y-0"
            disabled={!canStartGroupGame}
            onClick={startRound}
            title={canStartGroupGame ? "Start game" : "Need at least 2 players"}
            type="button"
          >
            Start game
          </button>
          <button
            className="flex h-14 w-full max-w-[14rem] items-center justify-center rounded-full border border-slate-200 bg-white px-7 text-lg font-medium text-slate-600 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 active:translate-y-0 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:translate-y-0"
            disabled={simulatedLobbyPlayers.length >= 7}
            onClick={() => setDummyJoinModalOpen(true)}
            type="button"
          >
            Simulate join
          </button>
          <button
            className="flex h-14 w-full max-w-[16rem] items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 text-lg font-medium text-slate-600 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 active:translate-y-0"
            onClick={copyInviteLink}
            type="button"
          >
            <svg
              className="h-5 w-5 shrink-0"
              aria-hidden="true"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M8 8h9v11H8z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            {inviteCopied ? "Copied" : "Copy game URL"}
          </button>
        </div>
        {joinModalOpen ? (
          <div className="modal-backdrop fixed inset-0 z-40 grid place-items-center bg-white/55 px-5 backdrop-blur-xl">
            <div className="modal-panel w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
              <h2 className="text-3xl font-bold text-slate-950">Join a game</h2>
              <p className="mt-3 text-base text-slate-500">
                Enter the 5-character code from your group host.
              </p>
              <label className="relative mt-7 block cursor-text">
                <span className="sr-only">Game code</span>
                <input
                  autoFocus
                  className="absolute inset-0 h-full w-full cursor-text opacity-0"
                  disabled={isJoining}
                  maxLength={5}
                  onChange={(event) =>
                    setJoinCode(event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase())
                  }
                  value={joinCode}
                />
                <span className="flex justify-center gap-3" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      className="grid h-16 w-12 place-items-center border-b-2 border-slate-300 text-4xl font-bold uppercase text-slate-950"
                      key={index}
                    >
                      {joinCode[index] ?? ""}
                    </span>
                  ))}
                </span>
              </label>
              {joinError ? (
                <p className="mt-4 text-sm font-medium text-red-600">{joinError}</p>
              ) : null}
              <div className="mt-6 flex gap-3">
                <button
                  className="h-12 flex-1 rounded-full border border-slate-200 text-base font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
                  disabled={isJoining}
                  onClick={() => {
                    setJoinCode("");
                    setJoinError("");
                    setIsJoining(false);
                    setJoinModalOpen(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 text-base font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200"
                  disabled={joinCode.length !== 5 || isJoining}
                  onClick={() => validateJoinCode(joinCode)}
                  type="button"
                >
                  {isJoining ? (
                    <span className="join-spinner h-4 w-4 rounded-full border-2 border-white/35 border-t-white" />
                  ) : null}
                  {isJoining ? "Joining" : "Join"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {groupNameModalOpen ? (
          <div
            className="modal-backdrop fixed inset-0 z-40 grid place-items-center bg-white/55 px-5 backdrop-blur-xl"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setGroupNameModalOpen(false);
              }
            }}
          >
            <div className="modal-panel w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
              <h2 className="text-3xl font-bold text-slate-950">Group name</h2>
              <p className="mt-3 text-base text-slate-500">
                Pick a name everyone in the lobby can recognize.
              </p>
              <input
                autoFocus
                className="mt-6 h-14 w-full rounded-full border border-slate-200 bg-white px-5 text-center text-lg font-medium text-slate-950 outline-none transition placeholder:text-slate-300 hover:border-slate-400 focus:border-slate-950"
                maxLength={28}
                onChange={(event) => setDraftGroupName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    saveGroupName();
                  }
                }}
                placeholder="Group name"
                value={draftGroupName}
              />
              <div className="mt-6 flex gap-3">
                <button
                  className="h-12 flex-1 rounded-full border border-slate-200 text-base font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
                  onClick={() => setGroupNameModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-12 flex-1 rounded-full bg-slate-950 text-base font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200"
                  disabled={!draftGroupName.trim()}
                  onClick={saveGroupName}
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {dummyJoinModalOpen ? (
          <div className="modal-backdrop fixed inset-0 z-40 grid place-items-center bg-white/55 px-5 backdrop-blur-xl">
            <div className="modal-panel w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
              <h2 className="text-3xl font-bold text-slate-950">
                Join {groupName}
              </h2>
              <div className="mt-7 flex items-start gap-5 text-left">
                <div className="selected-avatar shrink-0 rounded-full border border-slate-200 bg-white p-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                  <Image
                    className="h-20 w-20 rounded-full bg-slate-100 object-cover"
                    src={getAvatarUrl(dummyPlayerAvatar)}
                    alt="Joining player avatar"
                    width={80}
                    height={80}
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label className="block text-sm font-medium text-slate-500" htmlFor="dummy-player-name">
                    Name
                  </label>
                  <input
                    autoFocus
                    className="mt-2 h-14 w-full rounded-full border border-slate-200 bg-white px-5 text-lg font-medium text-slate-950 outline-none transition placeholder:text-slate-300 hover:border-slate-400 focus:border-slate-950"
                    id="dummy-player-name"
                    maxLength={18}
                    onChange={(event) => setDummyPlayerName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        addSimulatedLobbyPlayer();
                      }
                    }}
                    placeholder="Player name"
                    value={dummyPlayerName}
                  />
                  <div
                    className={[
                      "avatar-strip relative mt-4 w-full overflow-hidden",
                      dummyAvatarScroll.canScrollLeft ? "avatar-fade-left" : "",
                      dummyAvatarScroll.canScrollRight ? "avatar-fade-right" : "",
                    ].join(" ")}
                  >
                    <div
                      className="flex max-w-full gap-2 overflow-x-auto px-1 py-3"
                      onScroll={(event) => {
                        const element = event.currentTarget;

                        setDummyAvatarScroll({
                          canScrollLeft: element.scrollLeft > 2,
                          canScrollRight:
                            element.scrollLeft + element.clientWidth <
                            element.scrollWidth - 2,
                        });
                      }}
                    >
                      {playerAvatars.slice(0, 24).map((avatar) => (
                        <button
                          aria-label={`Use ${avatar} avatar`}
                          className={[
                            "grid h-12 w-12 shrink-0 place-items-center rounded-full transition",
                            dummyPlayerAvatar === avatar
                              ? "ring-2 ring-slate-950/70 ring-offset-2"
                              : "ring-1 ring-slate-200 hover:ring-slate-400",
                          ].join(" ")}
                          key={avatar}
                          onClick={() => setDummyPlayerAvatar(avatar)}
                          type="button"
                        >
                          <Image
                            className="h-12 w-12 rounded-full bg-white object-cover"
                            src={getAvatarUrl(avatar)}
                            alt=""
                            width={48}
                            height={48}
                            unoptimized
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-7 flex justify-center">
                <button
                  className="h-12 w-full max-w-[15rem] rounded-full bg-slate-950 text-base font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200"
                  disabled={!dummyPlayerName.trim() || simulatedLobbyPlayers.length >= 7}
                  onClick={addSimulatedLobbyPlayer}
                  type="button"
                >
                  Join game
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {lobbyProfileModalOpen ? (
          <div
            className="modal-backdrop fixed inset-0 z-40 grid place-items-center bg-white/55 px-5 backdrop-blur-xl"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setLobbyProfileModalOpen(false);
              }
            }}
          >
            <div className="modal-panel w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
              <h2 className="text-3xl font-bold text-slate-950">Edit profile</h2>
              <div className="mt-7 flex items-start gap-5 text-left">
                <div className="selected-avatar shrink-0 rounded-full border border-slate-200 bg-white p-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                  <Image
                    className="h-20 w-20 rounded-full bg-slate-100 object-cover"
                    src={getAvatarUrl(draftLobbyAvatar)}
                    alt="Your selected avatar"
                    width={80}
                    height={80}
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label className="block text-sm font-medium text-slate-500" htmlFor="lobby-profile-name">
                    Name
                  </label>
                  <input
                    autoFocus
                    className="mt-2 h-14 w-full rounded-full border border-slate-200 bg-white px-5 text-lg font-medium text-slate-950 outline-none transition placeholder:text-slate-300 hover:border-slate-400 focus:border-slate-950"
                    id="lobby-profile-name"
                    maxLength={18}
                    onChange={(event) => setDraftLobbyName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        saveLobbyProfile();
                      }
                    }}
                    placeholder="Your name"
                    value={draftLobbyName}
                  />
                  <div
                    className={[
                      "avatar-strip relative mt-4 w-full overflow-hidden",
                      lobbyAvatarScroll.canScrollLeft ? "avatar-fade-left" : "",
                      lobbyAvatarScroll.canScrollRight ? "avatar-fade-right" : "",
                    ].join(" ")}
                  >
                    <div
                      className="flex max-w-full gap-2 overflow-x-auto px-1 py-3"
                      onScroll={(event) => {
                        const element = event.currentTarget;

                        setLobbyAvatarScroll({
                          canScrollLeft: element.scrollLeft > 2,
                          canScrollRight:
                            element.scrollLeft + element.clientWidth <
                            element.scrollWidth - 2,
                        });
                      }}
                    >
                      {playerAvatars.slice(0, 24).map((avatar) => (
                        <button
                          aria-label={`Use ${avatar} avatar`}
                          className={[
                            "grid h-12 w-12 shrink-0 place-items-center rounded-full transition",
                            draftLobbyAvatar === avatar
                              ? "ring-2 ring-slate-950/70 ring-offset-2"
                              : "ring-1 ring-slate-200 hover:ring-slate-400",
                          ].join(" ")}
                          key={avatar}
                          onClick={() => setDraftLobbyAvatar(avatar)}
                          type="button"
                        >
                          <Image
                            className="h-12 w-12 rounded-full bg-white object-cover"
                            src={getAvatarUrl(avatar)}
                            alt=""
                            width={48}
                            height={48}
                            unoptimized
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-7 flex gap-3">
                <button
                  className="h-12 flex-1 rounded-full border border-slate-200 text-base font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
                  onClick={() => setLobbyProfileModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-12 flex-1 rounded-full bg-slate-950 text-base font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200"
                  disabled={!draftLobbyName.trim()}
                  onClick={saveLobbyProfile}
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    );
  }

  if (status === "done") {
    return (
      <main className="min-h-screen bg-white text-slate-950">
        <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-10 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-600">
            Round complete
          </p>
          <h1 className="mt-5 text-5xl font-bold tracking-normal text-balance sm:text-7xl">
            {score} points
          </h1>
          <p className="mt-5 max-w-xl text-xl leading-8 text-slate-600">
            {playerProfile.username || "Player"} now has{" "}
            <span className="font-bold text-slate-950">
              {playerProfile.totalScore.toLocaleString()}
            </span>{" "}
            total points saved locally.
          </p>
          <button
            className="mt-10 h-14 rounded-md bg-slate-950 px-8 text-base font-bold text-white transition hover:bg-slate-800"
            onClick={returnToStart}
            type="button"
          >
            Choose category
          </button>
        </section>
      </main>
    );
  }

  return (
    <main
      className={[
        "relative min-h-screen overflow-hidden bg-white text-slate-950",
        secondsLeft <= 5 && status === "playing" ? "screen-flash" : "",
      ].join(" ")}
    >
      {status === "correct" ? <Confetti /> : null}
      {nextCountdown !== null ? (
        <div className="next-countdown fixed right-5 top-1/2 z-20 hidden h-20 w-20 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/78 text-center shadow-[0_18px_55px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:grid">
          <p className="text-4xl font-black leading-none text-slate-950">
            {nextCountdown}
          </p>
        </div>
      ) : null}
      <div className="pointer-events-none fixed inset-x-0 bottom-7 z-30 flex justify-center px-5">
        {status === "correct" && lastCorrectAnswer ? (
          <AnswerReveal
            key={`${currentIndex}-${lastCorrectAnswer}-${message}`}
            label={isDontSayMode ? "Safe" : "Correct"}
          />
        ) : null}

        {(status === "wrong" ||
          (status === "playing" &&
            isMultiQuestion &&
            lastWrongAnswer &&
            (message.startsWith("Wrong") || message.startsWith("Not quite")))) &&
        lastWrongAnswer ? (
          <WrongReveal
            key={`${currentIndex}-${lastWrongAnswer}-${message}-${wrongAttemptCount}`}
            label={isDontSayMode ? "Eliminated" : "Wrong"}
          />
        ) : null}

        {status === "timeout" ? (
          <TimeoutReveal key={`${currentIndex}-${message}`} />
        ) : null}
      </div>

      <div className="fixed left-5 top-5 z-20">
        <div className="relative" ref={gameLeaderboardRef}>
          <button
            aria-expanded={gameLeaderboardOpen}
            className="inline-flex max-w-[16rem] items-center gap-2 rounded-full border border-slate-200 bg-white/78 px-4 py-2.5 text-sm font-bold text-slate-600 shadow-[0_14px_38px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            onClick={() => {
              setGameLeaderboardOpen((open) => {
                const nextOpen = !open;

                setGameLeaderboardScroll({
                  canScrollUp: false,
                  canScrollDown: nextOpen && gameLeaderboard.length > 5,
                });

                return nextOpen;
              });
            }}
            type="button"
          >
            {gameLeader ? (
              <Image
                className="h-6 w-6 shrink-0 rounded-full bg-white object-cover ring-1 ring-slate-200"
                src={getAvatarUrl(gameLeader.avatar)}
                alt=""
                width={24}
                height={24}
                unoptimized
              />
            ) : null}
            <span className="truncate">
              {gameLeader ? `${gameLeader.name} is in the lead` : "Group"}
            </span>
          </button>
          {gameLeaderboardOpen ? (
            <div
              className={[
                "popover-menu absolute left-0 top-[calc(100%+0.55rem)] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl",
                gameLeaderboardScroll.canScrollUp ? "leaderboard-fade-top" : "",
                gameLeaderboardScroll.canScrollDown ? "leaderboard-fade-bottom" : "",
              ].join(" ")}
            >
              <div
                className="max-h-[15rem] overflow-y-auto overscroll-contain"
                onScroll={(event) => {
                  const element = event.currentTarget;

                  setGameLeaderboardScroll({
                    canScrollUp: element.scrollTop > 2,
                    canScrollDown:
                      element.scrollTop + element.clientHeight <
                      element.scrollHeight - 2,
                  });
                }}
              >
                {gameLeaderboard.map((player, index) => (
                  <div
                    className="leaderboard-row flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                    key={`${player.name}-${index}`}
                    style={{ "--row-delay": `${index * 0.045}s` } as React.CSSProperties}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                        {index + 1}
                      </span>
                      <Image
                        className="h-8 w-8 rounded-full bg-white object-cover ring-1 ring-slate-200"
                        src={getAvatarUrl(player.avatar)}
                        alt=""
                        width={32}
                        height={32}
                        unoptimized
                      />
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-slate-950">
                          {player.name}
                        </span>
                        {player.isHost ? (
                          <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[0.62rem] font-bold leading-none text-violet-800">
                            Host
                          </span>
                        ) : null}
                        {player.isCurrent ? (
                          <span className="rounded-full bg-slate-950 px-1.5 py-0.5 text-[0.62rem] font-bold leading-none text-white">
                            You
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5 text-sm font-black tabular-nums text-slate-950">
                      {index < 3 ? (
                        <span aria-label={["Gold", "Silver", "Bronze"][index]}>
                          {["🥇", "🥈", "🥉"][index]}
                        </span>
                      ) : null}
                      <span>{player.score}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="fixed right-5 top-5 z-20 text-right">
        <p className="text-sm font-medium text-slate-400">
          Score
        </p>
        <ScoreTicker delta={scoreDelta} score={score} />
      </div>

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-36 pt-20 sm:px-8">
        <div
          className="question-stage flex flex-1 flex-col items-center justify-center gap-8 lg:gap-10"
          key={currentIndex}
        >
          <div
            className={[
              "flex w-full flex-col items-center justify-center gap-8 transition duration-300 lg:gap-10",
              isResolvingQuestion ? "pointer-events-none opacity-30 grayscale" : "",
            ].join(" ")}
          >
          <div
            className="question-grid grid w-full items-center gap-8 lg:grid-cols-1"
          >
            <section
              className="question-prompt mx-auto w-full max-w-5xl text-center"
            >
              <div className="mb-5 flex justify-center">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/82 px-4 py-2 text-sm font-bold text-slate-700 shadow-[0_14px_38px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                  <span>
                    {getQuestionPillLabel(
                      selectedGameMode,
                      selectedCategory,
                      roundQuestionNumber,
                      roundQuestionTotal,
                    )}
                  </span>
                </div>
              </div>
              <h1
                className={[
                  "text-5xl font-bold leading-[0.98] tracking-normal text-balance sm:text-6xl",
                  currentQuestion.image
                    ? "mx-auto max-w-4xl lg:text-6xl"
                    : "mx-auto max-w-5xl lg:text-7xl",
                ].join(" ")}
              >
                {currentQuestion.prompt}
              </h1>
              {isDontSayMode ? (
                <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-500">
                  Give an answer that counts. If it matches the AI&apos;s hidden pick,
                  you&apos;re out.
                </p>
              ) : null}
            </section>

            {currentQuestion.image ? (
              <section className="w-full">
                <div className="relative mx-auto aspect-[16/9] w-full max-w-lg overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                  <Image
                    className="h-full w-full object-cover"
                    src={currentQuestion.image.src}
                    alt={currentQuestion.image.alt}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 32rem, 90vw"
                  />
                </div>
              </section>
            ) : null}

            {isRankingQuestion ? (
              <section className="answer-bank mx-auto flex min-h-0 w-full max-w-5xl justify-center">
                <div
                  className={[
                    "grid w-full gap-3 bg-white p-2 sm:gap-4 sm:p-4",
                    neededAnswers > 4 ? "sm:grid-cols-2" : "grid-cols-1",
                  ].join(" ")}
                >
                  {Array.from({ length: neededAnswers }, (_, index) => {
                    const answer = acceptedAnswers[index];

	                    return (
	                      <div
	                        draggable={Boolean(answer) && status === "playing"}
	                        className={[
	                          "ranking-row flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
	                          answer
	                            ? "cursor-grab border-slate-200 bg-white text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.05)] active:cursor-grabbing"
	                            : "border-dashed border-slate-200 bg-slate-50/60 text-slate-300",
	                          draggedRankingIndex === index ? "scale-[0.98] opacity-45" : "",
	                          dragOverRankingIndex === index &&
	                          draggedRankingIndex !== null &&
	                          draggedRankingIndex !== index
	                            ? "ring-2 ring-slate-950/40"
	                            : "",
	                        ].join(" ")}
	                        key={`${currentIndex}-ranking-${index}`}
	                        onDragEnd={() => {
	                          setDraggedRankingIndex(null);
	                          setDragOverRankingIndex(null);
	                        }}
	                        onDragEnter={(event) => {
	                          event.preventDefault();
	                          if (answer) {
	                            setDragOverRankingIndex(index);
	                          }
	                        }}
	                        onDragOver={(event) => {
	                          if (answer) {
	                            event.preventDefault();
	                          }
	                        }}
	                        onDragStart={(event) => {
	                          if (!answer) {
	                            event.preventDefault();
	                            return;
	                          }

	                          setDraggedRankingIndex(index);
	                          event.dataTransfer.effectAllowed = "move";
	                          event.dataTransfer.setData("text/plain", String(index));
	                        }}
	                        onDrop={(event) => {
	                          event.preventDefault();
	                          const fromIndex = Number(
	                            event.dataTransfer.getData("text/plain"),
	                          );

	                          reorderRankingAnswer(fromIndex, index);
	                          setDraggedRankingIndex(null);
	                          setDragOverRankingIndex(null);
	                        }}
	                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">
                          {index + 1}
                        </span>
	                        <span className="truncate text-xl font-black sm:text-2xl">
	                          {answer ? formatAnswerLabel(answer) : "Waiting"}
	                        </span>
	                        {answer ? (
	                          <button
	                            aria-label={`Remove ${formatAnswerLabel(answer)}`}
	                            className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300 transition hover:bg-slate-100 hover:text-slate-950"
	                            onClick={(event) => {
	                              event.stopPropagation();
	                              removeRankingAnswer(index);
	                            }}
	                            onDragStart={(event) => event.preventDefault()}
	                            type="button"
	                          >
	                            <XIcon className="h-4 w-4" />
	                          </button>
	                        ) : null}
	                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {isMultiQuestion && acceptedAnswers.length ? (
              <section className="answer-bank mx-auto flex min-h-0 w-full max-w-5xl justify-center">
                <div className="flex max-w-full flex-wrap justify-center gap-3 bg-white p-2 sm:gap-5 sm:p-4">
                  {acceptedAnswers.map((answer) => (
                    <AnswerChip answer={answer} key={answer} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <section className="w-full max-w-5xl">
            <form
              ref={formRef}
              className="mx-auto"
              onClick={() => inputRef.current?.focus()}
              onSubmit={submitAnswer}
            >
              <label
                className="sr-only"
                htmlFor="answer"
              >
                Answer
              </label>
              <div
                className="relative min-h-24 cursor-text py-2"
              >
                <input
                  ref={inputRef}
                  id="answer"
                  className="absolute inset-0 h-full w-full cursor-text opacity-0"
                  disabled={status !== "playing" || dontSayValidationPending}
                  onChange={(event) => setTypedAnswer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      formRef.current?.requestSubmit();
                    }
                  }}
                  value={typedAnswer}
                />
                <div className="flex min-h-20 flex-wrap items-center justify-center gap-x-4 gap-y-4 px-1">
                  {typedAnswer ? (
                    Array.from(typedAnswer).map((character, index) =>
                      character === " " ? (
                        <span className="w-7 sm:w-10" key={`${character}-${index}`} />
                      ) : (
                        <span
                          className="inline-grid min-w-8 place-items-center text-5xl font-bold uppercase leading-none tracking-normal sm:min-w-11 sm:text-7xl"
                          key={`${character}-${index}`}
                        >
                          {character}
                        </span>
                      ),
                    )
                  ) : (
                    <span className="text-4xl font-bold text-slate-200 sm:text-6xl">
                      Type or say it...
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex min-h-8 items-center justify-center gap-4 text-center">
                <p
                  className={[
                    "answer-feedback max-w-4xl px-4 text-base font-black leading-6",
                    answerAreaMessage.startsWith("Close")
                      ? "text-amber-600"
                      : answerAreaMessage.startsWith("Safe")
                        ? "text-emerald-600"
                      : answerAreaMessage.startsWith("Wrong") ||
                          answerAreaMessage.startsWith("You didn't get it") ||
                          answerAreaMessage.startsWith("Eliminated") ||
                          answerAreaMessage.startsWith("Nope")
                        ? "text-red-600"
                        : "text-slate-600",
                  ].join(" ")}
                >
                  {dontSayValidationPending ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="join-spinner h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-950" />
                      <span>Validating</span>
                    </span>
                  ) : (
                    answerAreaMessage ||
                    (isMultiQuestion ? `${acceptedAnswers.length}/${neededAnswers}` : "") ||
                    (isRankingQuestion ? `${acceptedAnswers.length}/${neededAnswers}` : "") ||
                    (dontSayLastAnswer ? `You said ${dontSayLastAnswer}` : "")
                  )}
                </p>

              </div>
              {voiceError ? (
                <p className="mt-2 text-center text-sm font-bold text-red-600">
                  {voiceError}
                </p>
              ) : null}

            </form>
          </section>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-5 z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
        <div className="flex justify-end">
          <button
            aria-label={voiceModeEnabled ? "Turn voice mode off" : "Turn voice mode on"}
            className={[
              "grid h-11 w-11 place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-35",
              voiceModeEnabled
                ? "border-slate-300 bg-slate-100 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.13)]"
                : "border-slate-200 bg-white/82 text-slate-500 shadow-[0_18px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
            disabled={voiceStatus === "connecting"}
            onClick={toggleVoiceInput}
            title={
              voiceStatus === "connecting"
                ? "Connecting OpenAI voice"
                : voiceModeEnabled
                  ? "Turn OpenAI voice mode off"
                  : "Turn OpenAI voice mode on"
            }
            type="button"
          >
            {voiceStatus === "connecting" ? (
              <span className="join-spinner h-5 w-5 rounded-full border-2 border-current/25 border-t-current" />
            ) : voiceModeEnabled ? (
              <svg
                className="voice-wave h-5 w-5"
                aria-hidden="true"
                fill="none"
                viewBox="0 0 28 28"
              >
                <path
                  d="M3.5 14c1.8-5.6 3.6-5.6 5.4 0s3.6 5.6 5.4 0 3.6-5.6 5.4 0 3.6 5.6 5.4 0"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.4"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                aria-hidden="true"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <path
                  d="M18 10.5a6 6 0 0 1-12 0M12 16.5V21M9 21h6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            )}
          </button>
        </div>
        <TimerRing
          color={timerColor}
          progress={timerProgress}
          secondsLeft={secondsLeft}
        />
        <div className="flex justify-start">
          <button
            aria-label="Skip for later"
            className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white/82 px-4 text-sm font-bold text-slate-500 shadow-[0_18px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={status !== "playing" || questionQueue.length <= 1}
            onClick={skipQuestion}
            title="Skip for later"
            type="button"
          >
            <svg
              className="h-5 w-5"
              aria-hidden="true"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M5 6.5v11M9 7l7 5-7 5zM18.5 7v10"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span>Skip</span>
          </button>
        </div>
      </div>
    </main>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 38 }).map((_, index) => (
        <span
          className="confetti-piece"
          key={index}
          style={{
            "--delay": `${(index % 10) * 0.04}s`,
            "--left": `${(index * 13) % 100}%`,
            "--spin": `${index % 2 === 0 ? 1 : -1}`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function TimerRing({
  color,
  progress,
  secondsLeft,
}: {
  color: string;
  progress: number;
  secondsLeft: number;
}) {
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div
      className="relative grid h-16 w-16 shrink-0 place-items-center"
      aria-label={`${secondsLeft} seconds left for this question`}
    >
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="5"
        />
        <circle
          className="timer-ring-progress"
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="5"
        />
      </svg>
      <span className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-xl font-bold text-slate-950 shadow-[0_8px_22px_rgba(15,23,42,0.08)]">
        {secondsLeft}
      </span>
    </div>
  );
}

function ScoreTicker({ delta, score }: { delta: number; score: number }) {
  const formattedScore = score.toLocaleString();
  const deltaLabel = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "";

  return (
    <div className="mt-1 flex items-end justify-end gap-2">
      {deltaLabel ? (
        <span
          className={[
            "score-delta text-base font-black leading-none",
            delta > 0 ? "text-emerald-600" : "text-red-600",
          ].join(" ")}
          key={`${delta}-${score}`}
        >
          {deltaLabel}
        </span>
      ) : null}
      <div
        className="flex justify-end text-3xl font-black leading-none text-slate-950"
        aria-label={`${formattedScore} points`}
      >
        {formattedScore.split("").map((character, index) => (
          <span
            className={[
              "score-ticker-tile relative inline-grid min-w-[0.56em] place-items-center overflow-hidden rounded-[0.22rem]",
              character === "," ? "score-ticker-comma min-w-[0.24em]" : "",
            ].join(" ")}
            key={`${character}-${index}-${formattedScore.length}`}
          >
            <span
              className="score-ticker-character"
              key={`${character}-${score}-${index}`}
            >
              {character}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function AboutVisual({ visual }: { visual: (typeof aboutSteps)[number]["visual"] }) {
  if (visual === "modes") {
    return (
      <div className="about-visual-scene relative h-48 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="about-float absolute left-6 top-7 grid h-20 w-20 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white shadow-[0_18px_42px_rgba(15,23,42,0.22)]">
          Solo
        </div>
        <div className="about-float-slow absolute right-8 top-6 flex -space-x-3">
          {["Maya", "Leo", "Nora"].map((name) => (
            <Image
              className="h-14 w-14 rounded-full border-2 border-white bg-white object-cover"
              src={getAvatarUrl(name)}
              alt=""
              width={56}
              height={56}
              key={name}
              unoptimized
            />
          ))}
        </div>
        <div className="about-code-pill absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
          <span className="text-xl font-bold tracking-[0.2em] text-slate-950">00000</span>
          <span className="h-2 w-2 rounded-full bg-teal-400" />
        </div>
      </div>
    );
  }

  if (visual === "answer") {
    return (
      <div className="about-visual-scene relative h-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
        <div className="relative mt-9 h-20">
          {aboutAnswerExamples.map((example, exampleIndex) => (
            <div
              className="about-answer-example absolute inset-0 text-center"
              key={example.answer}
              style={{
                "--example-index": exampleIndex,
              } as React.CSSProperties}
            >
              <p className="about-answer-prompt text-xs font-medium text-slate-400">
                {example.prompt}
              </p>
              <div className="mt-2 flex justify-center gap-2">
                {example.answer.split("").map((letter, letterIndex) => (
                  <span
                    className="about-letter grid h-10 min-w-7 place-items-center text-3xl font-bold"
                    key={`${example.answer}-${letterIndex}`}
                    style={{
                      "--letter-index": letterIndex,
                    } as React.CSSProperties}
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <svg className="about-timer absolute right-5 top-5 h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="25" fill="none" stroke="#e2e8f0" strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r="25"
            fill="none"
            stroke="#dc2626"
            strokeDasharray="157"
            strokeDashoffset="42"
            strokeLinecap="round"
            strokeWidth="5"
          />
        </svg>
        <span className="about-timer-number absolute right-5 top-5 grid h-16 w-16 place-items-center rounded-full bg-red-600 text-2xl font-bold text-white">
          <span className="about-time about-time-7">7</span>
          <span className="about-time about-time-6">6</span>
          <span className="about-time about-time-5">5</span>
        </span>
        <span className="about-correct-pill absolute bottom-5 left-6 rounded-full bg-teal-200 px-4 py-2 text-sm font-bold text-teal-950">
          {aboutAnswerExamples.map((example, exampleIndex) => (
            <span
              className="about-correct-text"
              key={example.points}
              style={{ "--example-index": exampleIndex } as React.CSSProperties}
            >
              Correct {example.points}
            </span>
          ))}
        </span>
        <span className="absolute bottom-5 right-6 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500">
          Voice on
        </span>
      </div>
    );
  }

  return (
    <div className="about-visual-scene relative h-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
      <div className="about-score-card absolute left-7 top-6 rotate-[-4deg] rounded-2xl bg-slate-950 px-5 py-4 text-white shadow-[0_18px_45px_rgba(15,23,42,0.2)]">
        <p className="text-xs font-medium text-white/60">You</p>
        <p className="about-score-number text-3xl font-bold tabular-nums">
          <span>6,410</span>
          <span>6,545</span>
          <span>6,680</span>
        </p>
      </div>
      <div className="about-score-card-alt absolute right-8 top-10 rotate-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-medium text-slate-400">Maya</p>
        <p className="about-score-number about-score-number-alt text-2xl font-bold tabular-nums text-slate-950">
          <span>7,420</span>
          <span>7,395</span>
          <span>7,360</span>
        </p>
      </div>
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950">
        <span>Leaderboard chase</span>
      </div>
    </div>
  );
}

function AnswerChip({ answer }: { answer: string }) {
  const flag = countryFlags[normalize(answer)];
  const label = formatAnswerLabel(answer);

  if (!flag) {
    return (
      <span className="answer-chip block max-w-[min(18rem,calc(100vw-3rem))] truncate rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center text-base font-black text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:rounded-xl sm:px-5 sm:py-3 sm:text-xl">
        {label}
      </span>
    );
  }

  return (
    <span className="answer-chip flex max-w-[min(18rem,calc(100vw-3rem))] items-center justify-start gap-2 overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base font-black text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:gap-3 sm:rounded-xl sm:px-5 sm:py-3 sm:text-xl">
      <Image
        className="h-7 w-10 shrink-0 rounded-sm object-cover sm:h-9 sm:w-13"
        src={`https://flagcdn.com/w80/${flag.code}.png`}
        alt={`${flag.name} flag`}
        width={52}
        height={36}
        unoptimized
      />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

function CycleIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7 7h10M14 4l3 3-3 3M17 17H7M10 14l-3 3 3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function XIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function AnswerReveal({ label = "Correct" }: { label?: string }) {
  return (
    <div className="answer-reveal inline-flex max-w-full items-center gap-3 rounded-full border border-emerald-200/80 bg-emerald-50/82 px-4 py-3 text-left shadow-[0_18px_45px_rgba(16,185,129,0.16)] backdrop-blur-xl">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"
        aria-hidden="true"
      >
        <svg
          className="h-4.5 w-4.5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="m6 12.5 4 4L18.5 8"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-base font-black text-slate-950">{label}</span>
      </span>
    </div>
  );
}

function WrongReveal({ label = "Wrong" }: { label?: string }) {
  return (
    <div className="wrong-reveal inline-flex max-w-full items-center gap-3 rounded-full border border-red-200/80 bg-red-50/82 px-4 py-3 text-left shadow-[0_18px_45px_rgba(239,68,68,0.14)] backdrop-blur-xl">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-600 text-white"
        aria-hidden="true"
      >
        <svg
          className="h-4.5 w-4.5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="m7.5 7.5 9 9M16.5 7.5l-9 9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-base font-black text-slate-950">{label}</span>
      </span>
    </div>
  );
}

function TimeoutReveal() {
  return (
    <div className="timeout-reveal inline-flex max-w-full items-center gap-3 rounded-full border border-slate-200/80 bg-white/82 px-4 py-3 text-left shadow-[0_18px_45px_rgba(15,23,42,0.1)] backdrop-blur-xl">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-sm font-black text-white"
        aria-hidden="true"
      >
        <svg
          className="h-4.5 w-4.5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 7v5l3 2M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-base font-black text-slate-950">Time</span>
      </span>
    </div>
  );
}
