export const categories = [
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
] as const;
export type Category = (typeof categories)[number];
export type QuestionCategory = Exclude<Category, "General"> | "General";

export const gameModes = ["classic", "dont-say", "karaoke", "taboo"] as const;
export type GameMode = (typeof gameModes)[number];
export const playableGameModes = ["classic", "dont-say"] as const satisfies readonly GameMode[];
export type PlayableGameMode = (typeof playableGameModes)[number];

export const difficulties = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof difficulties)[number];

export const gameModeMeta: Record<
  GameMode,
  { title: string; body: string; detail: string }
> = {
  classic: {
    title: "Classic",
    body: "Answer fast, bank points, clear the round.",
    detail:
      "One question at a time. Correct answers score points, speed adds a bonus, and wrong guesses can cost you.",
  },
  "dont-say": {
    title: "Survivor",
    body: "Avoid the AI's hidden pick at all costs.",
    detail:
      "The AI secretly chooses an answer. Your answer has to count, but if it matches the AI's hidden pick, you're eliminated. The game runs until one player is left standing.",
  },
  karaoke: {
    title: "Karaoke",
    body: "Sing the line, catch the lyric, keep the streak alive.",
    detail:
      "A voice-first music game where players sing or speak missing lyrics, hooks, and song moments against the clock.",
  },
  taboo: {
    title: "Taboo",
    body: "Give clues without saying the forbidden words.",
    detail:
      "A clue-giving game where players help teammates guess the target while avoiding blocked words and obvious shortcuts.",
  },
};

export const difficultyMeta: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export type DontSayQuestion = {
  id: string;
  category: QuestionCategory;
  difficulty: Difficulty;
  prompt: string;
  guidance: string;
  examples: string[];
  validationMode: "open" | "finite";
  acceptedAnswers: string[];
};

export type DontSaySecret = {
  answer: string;
  normalizedAnswer: string;
};

export type DontSayValidation = {
  counts: boolean;
  canonicalAnswer: string;
  normalizedAnswer: string;
  reason: string;
};

type DontSaySeed = [
  category: QuestionCategory,
  difficulty: Difficulty,
  prompt: string,
  guidance: string,
  examples: string[],
  validationMode?: "open" | "finite",
];

const dontSaySeeds: DontSaySeed[] = [
  ["General", "easy", "Name a color", "Any common color counts.", ["red", "blue", "green", "yellow"]],
  ["General", "easy", "Name something you find in a kitchen", "Any common kitchen object or appliance counts.", ["spoon", "plate", "fridge", "knife"]],
  ["General", "medium", "Name something people collect", "Any commonly collected object counts.", ["stamps", "coins", "cards", "records"]],
  ["General", "medium", "Name a board game", "Any tabletop board game counts.", ["Monopoly", "Scrabble", "Catan", "Chess"]],
  ["General", "hard", "Name a NATO phonetic alphabet word", "Any official NATO phonetic alphabet code word counts.", ["Alpha", "Bravo", "Charlie", "Delta"]],
  ["General", "hard", "Name a Shakespeare play", "Any play commonly attributed to Shakespeare counts.", ["Hamlet", "Macbeth", "Othello", "King Lear"]],

  ["Countries", "easy", "Name a country", "Any sovereign country commonly accepted in trivia counts.", ["France", "Japan", "Brazil", "Canada"]],
  ["Countries", "easy", "Name a country in Europe", "Any sovereign country in Europe counts.", ["France", "Germany", "Italy", "Spain"]],
  ["Countries", "medium", "Name an island country", "A country primarily made up of one or more islands counts.", ["Japan", "Iceland", "Madagascar", "New Zealand"]],
  ["Countries", "medium", "Name a country in South America", "Any sovereign country in South America counts.", ["Brazil", "Argentina", "Chile", "Peru"]],
  ["Countries", "hard", "Name a landlocked country", "Any sovereign country with no coastline counts.", ["Mongolia", "Bolivia", "Austria", "Chad"]],
  ["Countries", "hard", "Name a country that borders China", "Any country sharing a land border with China counts.", ["India", "Russia", "Mongolia", "Vietnam"]],

  ["Capitals", "easy", "Name a capital city in Europe", "Any national capital city in Europe counts.", ["Paris", "Berlin", "Madrid", "Rome"]],
  ["Capitals", "easy", "Name a capital city in North America", "Any national capital in North America or Central America counts.", ["Washington DC", "Ottawa", "Mexico City", "Havana"]],
  ["Capitals", "medium", "Name a capital city in Africa", "Any national capital city in Africa counts.", ["Cairo", "Nairobi", "Rabat", "Accra"]],
  ["Capitals", "medium", "Name a capital city in Asia", "Any national capital city in Asia counts.", ["Tokyo", "Seoul", "Beijing", "Bangkok"]],
  ["Capitals", "hard", "Name a capital city ending in the letter A", "Any national capital whose English name ends with A counts.", ["Sofia", "Lima", "Ottawa", "Ankara"]],
  ["Capitals", "hard", "Name a capital city with more than one word", "Any national capital commonly written with multiple words counts.", ["New Delhi", "Mexico City", "San Jose", "Port of Spain"]],

  ["Flags", "easy", "Name a country with red on its flag", "Any country whose national flag contains red counts.", ["Canada", "Japan", "China", "United States"]],
  ["Flags", "easy", "Name a country with blue on its flag", "Any country whose national flag contains blue counts.", ["France", "Greece", "Argentina", "Australia"]],
  ["Flags", "medium", "Name a country with a star on its flag", "Any country whose national flag includes at least one star counts.", ["United States", "China", "Chile", "Turkey"]],
  ["Flags", "medium", "Name a country with green on its flag", "Any country whose national flag contains green counts.", ["Brazil", "Mexico", "Italy", "Pakistan"]],
  ["Flags", "hard", "Name a country with a crescent on its flag", "Any country whose national flag contains a crescent counts.", ["Turkey", "Pakistan", "Algeria", "Tunisia"]],
  ["Flags", "hard", "Name a country with no red, white, or blue on its flag", "Any national flag lacking all three colors counts.", ["Jamaica", "Sri Lanka", "Mauritania", "Bhutan"]],

  ["Geography", "easy", "Name an ocean", "Any of the world's oceans counts.", ["Pacific", "Atlantic", "Indian", "Arctic"]],
  ["Geography", "easy", "Name a continent", "Any commonly taught continent counts.", ["Africa", "Asia", "Europe", "Australia"]],
  ["Geography", "medium", "Name a major river", "Any widely recognized major river counts.", ["Nile", "Amazon", "Mississippi", "Yangtze"]],
  ["Geography", "medium", "Name a mountain range", "Any recognized mountain range counts.", ["Himalayas", "Alps", "Andes", "Rockies"]],
  ["Geography", "hard", "Name a desert", "Any recognized desert counts.", ["Sahara", "Gobi", "Atacama", "Kalahari"]],
  ["Geography", "hard", "Name a sea", "Any recognized sea counts.", ["Mediterranean Sea", "Black Sea", "Red Sea", "Baltic Sea"]],

  ["People", "easy", "Name a famous scientist", "Any widely known scientist counts.", ["Einstein", "Newton", "Marie Curie", "Darwin"]],
  ["People", "easy", "Name a famous actor", "Any widely known film or TV actor counts.", ["Tom Hanks", "Zendaya", "Meryl Streep", "Denzel Washington"]],
  ["People", "medium", "Name a Nobel Peace Prize winner", "Any person or organization that won the Nobel Peace Prize counts.", ["Nelson Mandela", "Malala Yousafzai", "Martin Luther King Jr", "Mother Teresa"]],
  ["People", "medium", "Name a tech founder", "Any widely known founder of a technology company counts.", ["Bill Gates", "Steve Jobs", "Elon Musk", "Mark Zuckerberg"]],
  ["People", "hard", "Name a classical composer", "Any recognized classical composer counts.", ["Mozart", "Beethoven", "Bach", "Chopin"]],
  ["People", "hard", "Name a Supreme Court justice", "Any current or former US Supreme Court justice counts.", ["Sonia Sotomayor", "John Roberts", "Ruth Bader Ginsburg", "Thurgood Marshall"]],

  ["Landmarks", "easy", "Name a famous landmark", "Any widely recognized landmark counts.", ["Eiffel Tower", "Statue of Liberty", "Taj Mahal", "Great Wall of China"]],
  ["Landmarks", "easy", "Name a landmark in Europe", "Any famous landmark located in Europe counts.", ["Eiffel Tower", "Colosseum", "Big Ben", "Sagrada Familia"]],
  ["Landmarks", "medium", "Name a UNESCO World Heritage Site", "Any listed UNESCO World Heritage Site counts.", ["Machu Picchu", "Taj Mahal", "Petra", "Stonehenge"]],
  ["Landmarks", "medium", "Name an ancient wonder or ancient ruin", "Any ancient wonder or famous ancient ruin counts.", ["Pyramids of Giza", "Colosseum", "Petra", "Machu Picchu"]],
  ["Landmarks", "hard", "Name a landmark in South America", "Any famous landmark in South America counts.", ["Machu Picchu", "Christ the Redeemer", "Iguazu Falls", "Atacama Desert"]],
  ["Landmarks", "hard", "Name a landmark that is a religious site", "Any famous religious landmark or sacred site counts.", ["Mecca", "Vatican City", "Western Wall", "Angkor Wat"]],

  ["Animals", "easy", "Name a mammal", "Any real mammal counts.", ["dog", "cat", "elephant", "whale", "panther", "lion", "tiger", "bear", "horse", "dolphin", "bat", "kangaroo"]],
  ["Animals", "easy", "Name a bird", "Any real bird species or common bird name counts.", ["eagle", "sparrow", "penguin", "owl"]],
  ["Animals", "medium", "Name a reptile", "Any real reptile counts.", ["snake", "lizard", "crocodile", "turtle"]],
  ["Animals", "medium", "Name an animal that lives in the ocean", "Any real ocean animal counts.", ["shark", "dolphin", "octopus", "whale"]],
  ["Animals", "hard", "Name a marsupial", "Any real marsupial counts.", ["kangaroo", "koala", "wombat", "opossum"]],
  ["Animals", "hard", "Name a venomous animal", "Any real venomous animal counts.", ["cobra", "scorpion", "black widow", "stonefish"]],

  ["Science", "easy", "Name a planet", "Any recognized planet in our solar system counts.", ["Mars", "Venus", "Jupiter", "Earth"]],
  ["Science", "easy", "Name a body part", "Any common human body part or organ counts.", ["heart", "brain", "hand", "eye"]],
  ["Science", "medium", "Name a chemical element", "Any recognized chemical element counts.", ["oxygen", "gold", "carbon", "iron"]],
  ["Science", "medium", "Name a type of energy", "Any scientifically recognized energy form counts.", ["kinetic", "thermal", "solar", "chemical"]],
  ["Science", "hard", "Name a subatomic particle", "Any recognized subatomic particle counts.", ["proton", "neutron", "electron", "quark"]],
  ["Science", "hard", "Name a telescope or space observatory", "Any notable telescope or observatory counts.", ["Hubble", "James Webb", "Keck", "Chandra"]],

  ["Sports", "easy", "Name a sport played with a ball", "Any sport where a ball is central to play counts.", ["soccer", "basketball", "tennis", "baseball"]],
  ["Sports", "easy", "Name an Olympic sport", "Any sport in the Summer or Winter Olympics counts.", ["swimming", "gymnastics", "skiing", "basketball"]],
  ["Sports", "medium", "Name a sport with a net", "Any sport where a net is central to play counts.", ["tennis", "volleyball", "badminton", "table tennis"]],
  ["Sports", "medium", "Name a combat sport", "Any sport based on fighting or martial competition counts.", ["boxing", "judo", "wrestling", "taekwondo"]],
  ["Sports", "hard", "Name a Formula 1 team", "Any current or historic Formula 1 constructor/team counts.", ["Ferrari", "McLaren", "Mercedes", "Red Bull"]],
  ["Sports", "hard", "Name a tennis Grand Slam tournament", "Any of the four tennis Grand Slam tournaments counts.", ["Wimbledon", "US Open", "French Open", "Australian Open"]],

  ["Movies & TV", "easy", "Name a Disney movie", "Any theatrically released Disney movie counts.", ["Frozen", "The Lion King", "Moana", "Aladdin"]],
  ["Movies & TV", "easy", "Name a superhero movie", "Any movie focused on a superhero counts.", ["Spider-Man", "Black Panther", "Superman", "The Avengers"]],
  ["Movies & TV", "medium", "Name a sitcom", "Any television sitcom counts.", ["Friends", "The Office", "Seinfeld", "Abbott Elementary"]],
  ["Movies & TV", "medium", "Name an Oscar Best Picture winner", "Any film that won the Academy Award for Best Picture counts.", ["Parasite", "Moonlight", "Titanic", "Gladiator"]],
  ["Movies & TV", "hard", "Name a movie directed by Christopher Nolan", "Any feature film directed by Christopher Nolan counts.", ["Inception", "Oppenheimer", "Dunkirk", "Memento"]],
  ["Movies & TV", "hard", "Name an HBO original series", "Any HBO original scripted or unscripted series counts.", ["The Sopranos", "Game of Thrones", "Succession", "The Wire"]],

  ["Music", "easy", "Name a musical instrument", "Any real musical instrument counts.", ["piano", "guitar", "violin", "drums"]],
  ["Music", "easy", "Name a pop singer", "Any widely known pop singer counts.", ["Taylor Swift", "Ariana Grande", "Beyonce", "Harry Styles"]],
  ["Music", "medium", "Name a rock band", "Any widely recognized rock band counts.", ["The Beatles", "Nirvana", "Queen", "Radiohead"]],
  ["Music", "medium", "Name a rapper", "Any widely recognized rapper counts.", ["Kendrick Lamar", "Drake", "Nicki Minaj", "Jay-Z"]],
  ["Music", "hard", "Name a Grammy Album of the Year winner", "Any artist or album associated with a Grammy Album of the Year win counts.", ["Folklore", "Random Access Memories", "Thriller", "25"]],
  ["Music", "hard", "Name a jazz musician", "Any recognized jazz musician counts.", ["Miles Davis", "John Coltrane", "Ella Fitzgerald", "Thelonious Monk"]],

  ["Songs", "easy", "Name a Taylor Swift song", "Any released Taylor Swift song counts.", ["Shake It Off", "Anti-Hero", "Love Story", "Blank Space"]],
  ["Songs", "easy", "Name a Beatles song", "Any released Beatles song counts.", ["Hey Jude", "Yesterday", "Let It Be", "Come Together"]],
  ["Songs", "medium", "Name a song from a movie soundtrack", "Any notable song featured in or created for a movie counts.", ["My Heart Will Go On", "Let It Go", "Shallow", "Eye of the Tiger"]],
  ["Songs", "medium", "Name a number-one Billboard Hot 100 song", "Any song that reached number one on the Billboard Hot 100 counts.", ["Blinding Lights", "Old Town Road", "Uptown Funk", "Bad Guy"]],
  ["Songs", "hard", "Name a song that won Record of the Year at the Grammys", "Any Grammy Record of the Year winner counts.", ["Bad Guy", "Rolling in the Deep", "Get Lucky", "Flowers"]],
  ["Songs", "hard", "Name a song with a parenthetical title", "Any well-known song title containing parentheses counts.", ["I Wanna Dance with Somebody (Who Loves Me)", "Don't Stop 'Til You Get Enough", "We Are Never Ever Getting Back Together", "Sweet Dreams (Are Made of This)"]],

  ["Food", "easy", "Name a fruit", "Any edible fruit or common culinary fruit counts.", ["apple", "banana", "mango", "strawberry"]],
  ["Food", "easy", "Name a breakfast food", "Any food commonly eaten for breakfast counts.", ["eggs", "pancakes", "cereal", "toast"]],
  ["Food", "medium", "Name a pasta shape", "Any recognized pasta shape counts.", ["spaghetti", "penne", "rigatoni", "fusilli"]],
  ["Food", "medium", "Name a cuisine", "Any national, regional, or cultural cuisine counts.", ["Italian", "Mexican", "Thai", "Lebanese"]],
  ["Food", "hard", "Name a French sauce", "Any recognized French sauce counts.", ["hollandaise", "béchamel", "veloute", "espagnole"]],
  ["Food", "hard", "Name a fermented food", "Any commonly fermented food counts.", ["kimchi", "sauerkraut", "yogurt", "miso"]],

  ["History", "easy", "Name a US president", "Any US president counts.", ["Washington", "Lincoln", "Obama", "Biden"]],
  ["History", "easy", "Name an ancient civilization", "Any widely recognized ancient civilization counts.", ["Egypt", "Rome", "Greece", "Maya"]],
  ["History", "medium", "Name a major war", "Any widely recognized war counts.", ["World War II", "Civil War", "Vietnam War", "Korean War"]],
  ["History", "medium", "Name a historical empire", "Any recognized historical empire counts.", ["Roman Empire", "Ottoman Empire", "British Empire", "Mongol Empire"]],
  ["History", "hard", "Name a treaty", "Any historically significant treaty counts.", ["Treaty of Versailles", "Treaty of Paris", "Magna Carta", "Treaty of Tordesillas"]],
  ["History", "hard", "Name a Cold War event", "Any widely recognized Cold War event counts.", ["Cuban Missile Crisis", "Berlin Blockade", "Space Race", "Korean War"]],
];

const dontSayPromptPools: Partial<
  Record<
    Exclude<Category, "General">,
    Partial<Record<Difficulty, Array<[prompt: string, examples: string[]]>>>
  >
> = {
  Countries: {
    easy: [
      ["Name a country in Asia", ["Japan", "India", "China", "Thailand"]],
      ["Name a country in Africa", ["Egypt", "Kenya", "Nigeria", "Morocco"]],
      ["Name a country in Europe", ["France", "Germany", "Italy", "Spain"]],
      ["Name a country in the Americas", ["Canada", "Brazil", "Mexico", "Chile"]],
      ["Name a country with red on its flag", ["Canada", "Japan", "China", "Turkey"]],
      ["Name a country with blue on its flag", ["France", "Greece", "Argentina", "Australia"]],
      ["Name a country with mountains", ["Nepal", "Switzerland", "Chile", "Italy"]],
      ["Name a country with a coastline", ["Italy", "Brazil", "Australia", "Canada"]],
      ["Name a country that has hosted the Olympics", ["Japan", "Greece", "Brazil", "Australia"]],
      ["Name a country in the European Union", ["France", "Germany", "Italy", "Spain"]],
      ["Name a country with a royal family", ["United Kingdom", "Japan", "Spain", "Sweden"]],
      ["Name a country whose English name is one word", ["France", "Japan", "Brazil", "Canada"]],
      ["Name a country that starts with S", ["Spain", "Sweden", "Senegal", "Singapore"]],
    ],
    medium: [
      ["Name an island country", ["Japan", "Iceland", "Madagascar", "New Zealand"]],
      ["Name a country in South America", ["Brazil", "Argentina", "Chile", "Peru"]],
      ["Name a country that uses the euro", ["France", "Germany", "Italy", "Spain"]],
      ["Name a country in the Caribbean", ["Jamaica", "Cuba", "Barbados", "Bahamas"]],
      ["Name a country that borders Germany", ["France", "Poland", "Austria", "Denmark"]],
      ["Name a country that borders Brazil", ["Argentina", "Peru", "Colombia", "Uruguay"]],
      ["Name a country ending in A", ["Canada", "China", "India", "Argentina"]],
      ["Name a Nordic country", ["Norway", "Sweden", "Denmark", "Finland"]],
      ["Name a G7 country", ["Canada", "France", "Germany", "Japan"]],
      ["Name a country with Spanish as an official language", ["Mexico", "Spain", "Colombia", "Argentina"]],
      ["Name a country made up of many islands", ["Indonesia", "Philippines", "Japan", "Maldives"]],
      ["Name a country in the Balkans", ["Serbia", "Croatia", "Bulgaria", "Albania"]],
      ["Name a country with a desert", ["Egypt", "Australia", "Chile", "Mongolia"]],
    ],
    hard: [
      ["Name a landlocked country", ["Mongolia", "Bolivia", "Austria", "Chad"]],
      ["Name a country that borders China", ["India", "Russia", "Mongolia", "Vietnam"]],
      ["Name a country that borders only one country", ["Portugal", "Canada", "Denmark", "Lesotho"]],
      ["Name a double-landlocked country", ["Liechtenstein", "Uzbekistan"]],
      ["Name a country that starts and ends with A", ["Albania", "Algeria", "Angola", "Australia"]],
      ["Name a country with no standing army", ["Iceland", "Costa Rica", "Panama", "Liechtenstein"]],
      ["Name a Mediterranean island country", ["Malta", "Cyprus"]],
      ["Name a country that borders the Caspian Sea", ["Russia", "Kazakhstan", "Iran", "Azerbaijan"]],
      ["Name a country with a non-rectangular flag", ["Nepal"]],
      ["Name a country whose capital is not its largest city", ["Australia", "Canada", "Brazil", "Turkey"]],
      ["Name a landlocked country in Africa", ["Chad", "Mali", "Uganda", "Zambia"]],
      ["Name a country with territory in the Arctic Circle", ["Norway", "Sweden", "Finland", "Russia"]],
      ["Name a European microstate", ["Monaco", "Andorra", "San Marino", "Liechtenstein"]],
    ],
  },
};

const generalDontSayPromptPools: Record<
  Difficulty,
  Array<[prompt: string, examples: string[]]>
> = {
  easy: [
    ["Name something round", ["ball", "orange", "coin", "wheel"]],
    ["Name something you wear", ["shirt", "hat", "shoes", "jacket"]],
    ["Name something people drink", ["water", "coffee", "tea", "juice"]],
    ["Name something in a classroom", ["desk", "chair", "whiteboard", "pencil"]],
    ["Name a common pet", ["dog", "cat", "fish", "rabbit"]],
    ["Name a common vehicle", ["car", "bus", "train", "bike"]],
    ["Name a common job", ["teacher", "doctor", "nurse", "chef"]],
    ["Name a common sport", ["soccer", "basketball", "tennis", "baseball"]],
    ["Name something in a bathroom", ["sink", "towel", "mirror", "toothbrush"]],
    ["Name something you use to cook", ["pan", "pot", "oven", "knife"]],
    ["Name a common holiday", ["Christmas", "Halloween", "Thanksgiving", "Easter"]],
    ["Name something with wheels", ["car", "bike", "skateboard", "wagon"]],
    ["Name something you find at a beach", ["sand", "shell", "umbrella", "towel"]],
  ],
  medium: [
    ["Name something people collect", ["stamps", "coins", "cards", "records"]],
    ["Name a board game", ["Monopoly", "Scrabble", "Catan", "Chess"]],
    ["Name a streaming service", ["Netflix", "Hulu", "Disney Plus", "Max"]],
    ["Name a famous brand", ["Nike", "Apple", "Coca-Cola", "Toyota"]],
    ["Name a social media app", ["Instagram", "TikTok", "Snapchat", "Reddit"]],
    ["Name a type of pasta", ["spaghetti", "penne", "rigatoni", "fusilli"]],
    ["Name a movie genre", ["comedy", "horror", "action", "romance"]],
    ["Name a music genre", ["pop", "rock", "hip hop", "country"]],
    ["Name a programming language", ["JavaScript", "Python", "Java", "C++"]],
    ["Name a college major", ["biology", "history", "engineering", "psychology"]],
    ["Name a famous museum", ["Louvre", "Met", "British Museum", "MoMA"]],
    ["Name a type of weather event", ["hurricane", "blizzard", "tornado", "thunderstorm"]],
    ["Name a restaurant chain", ["McDonald's", "Subway", "Chipotle", "Starbucks"]],
  ],
  hard: [
    ["Name a Shakespeare play", ["Hamlet", "Macbeth", "Othello", "King Lear"]],
    ["Name a NATO phonetic alphabet word", ["Alpha", "Bravo", "Charlie", "Delta"]],
    ["Name a Nobel Prize category", ["Peace", "Physics", "Chemistry", "Literature"]],
    ["Name a chess opening", ["Sicilian Defense", "Queen's Gambit", "French Defense", "Ruy Lopez"]],
    ["Name a Roman emperor", ["Augustus", "Nero", "Trajan", "Hadrian"]],
    ["Name a Greek god or goddess", ["Zeus", "Athena", "Apollo", "Aphrodite"]],
    ["Name a jazz standard", ["Autumn Leaves", "Take Five", "So What", "All of Me"]],
    ["Name a Formula 1 team", ["Ferrari", "McLaren", "Mercedes", "Red Bull"]],
    ["Name a moon in the solar system", ["Europa", "Titan", "Ganymede", "Io"]],
    ["Name a treaty", ["Treaty of Versailles", "Treaty of Paris", "Magna Carta", "Treaty of Tordesillas"]],
    ["Name a dinosaur", ["Tyrannosaurus", "Triceratops", "Velociraptor", "Stegosaurus"]],
    ["Name a philosophical school", ["Stoicism", "Existentialism", "Empiricism", "Platonism"]],
    ["Name a famous opera", ["Carmen", "La Boheme", "The Magic Flute", "Aida"]],
  ],
};

const generalDontSaySeeds = dontSaySeeds.filter(
  ([category]) => category === "General",
);

const generatedGeneralDontSaySeeds: DontSaySeed[] = difficulties.flatMap((difficulty) =>
  generalDontSayPromptPools[difficulty].map(([prompt, examples]) => [
    "General",
    difficulty,
    prompt,
    `Any answer that satisfies "${prompt}" counts.`,
    examples,
  ] satisfies DontSaySeed),
);

const categoryPromptFillers: Partial<
  Record<
    Exclude<Category, "General">,
    Array<[
      prompt: string,
      examples: string[],
      validationMode?: "open" | "finite",
    ]>
  >
> = {
  Flags: [
    ["Name a country with a tricolor flag", ["France", "Italy", "Ireland", "Romania"], "open"],
    ["Name a country with a flag that includes a cross", ["United Kingdom", "Switzerland", "Sweden", "Norway"], "open"],
    ["Name a country with yellow on its flag", ["Brazil", "Germany", "Spain", "Colombia"], "open"],
    ["Name a country with black on its flag", ["Germany", "Belgium", "Jamaica", "Kenya"], "open"],
    ["Name a country with an animal on its flag", ["Mexico", "Albania", "Bhutan", "Sri Lanka"], "open"],
    ["Name a country with a sun on its flag", ["Japan", "Argentina", "Uruguay", "Philippines"], "open"],
    ["Name a country with a maple leaf on its flag", ["Canada"], "finite"],
    ["Name a country with a dragon on its flag", ["Bhutan", "Wales"], "finite"],
    ["Name a country with a Union Jack on its flag", ["Australia", "New Zealand", "Fiji", "Tuvalu"], "finite"],
  ],
  Capitals: [
    ["Name a capital city in South America", ["Lima", "Bogota", "Santiago", "Buenos Aires"]],
    ["Name a capital city in Oceania", ["Canberra", "Wellington", "Suva", "Apia"]],
    ["Name a capital city that starts with B", ["Berlin", "Bern", "Bogota", "Brussels"]],
    ["Name a capital city on a coast", ["Lisbon", "Tokyo", "Buenos Aires", "Dublin"]],
    ["Name a capital city on an island", ["Tokyo", "Dublin", "Reykjavik", "Wellington"]],
    ["Name a capital city with six letters", ["Madrid", "Athens", "Dublin", "Monaco"]],
    ["Name a capital city in the European Union", ["Paris", "Rome", "Madrid", "Berlin"]],
    ["Name a capital city in the Middle East", ["Riyadh", "Amman", "Doha", "Beirut"]],
    ["Name a capital city in Scandinavia", ["Oslo", "Stockholm", "Copenhagen", "Helsinki"]],
  ],
  Geography: [
    ["Name a US state", ["California", "Texas", "Florida", "New York"]],
    ["Name a mountain", ["Everest", "Kilimanjaro", "Denali", "Fuji"]],
    ["Name a lake", ["Lake Superior", "Lake Victoria", "Lake Michigan", "Lake Baikal"]],
    ["Name a country with a coastline", ["Italy", "Brazil", "Canada", "Australia"]],
    ["Name a place in the Arctic", ["Greenland", "Svalbard", "Alaska", "Nunavut"]],
    ["Name a major island", ["Greenland", "Madagascar", "Borneo", "Honshu"]],
    ["Name a volcano", ["Vesuvius", "Etna", "Krakatoa", "Mauna Loa"]],
    ["Name a peninsula", ["Iberian Peninsula", "Arabian Peninsula", "Korean Peninsula", "Yucatan Peninsula"]],
    ["Name a strait", ["Strait of Gibraltar", "Bering Strait", "Bosporus", "Strait of Hormuz"]],
  ],
  People: [
    ["Name a famous writer", ["Shakespeare", "Toni Morrison", "Jane Austen", "Mark Twain"]],
    ["Name a famous athlete", ["Serena Williams", "Lionel Messi", "Michael Jordan", "Simone Biles"]],
    ["Name a US president", ["Washington", "Lincoln", "Obama", "Biden"]],
    ["Name a famous painter", ["Picasso", "Van Gogh", "Frida Kahlo", "Monet"]],
    ["Name a famous inventor", ["Edison", "Tesla", "Bell", "Da Vinci"]],
    ["Name a famous woman in history", ["Cleopatra", "Rosa Parks", "Marie Curie", "Amelia Earhart"]],
    ["Name a famous musician", ["Beyonce", "Prince", "Taylor Swift", "Bob Dylan"]],
    ["Name a famous director", ["Spielberg", "Scorsese", "Christopher Nolan", "Greta Gerwig"]],
    ["Name a famous civil rights leader", ["Martin Luther King Jr", "Rosa Parks", "Nelson Mandela", "Malcolm X"]],
  ],
  Landmarks: [
    ["Name a landmark in Asia", ["Taj Mahal", "Great Wall of China", "Angkor Wat", "Petra"]],
    ["Name a landmark in Africa", ["Pyramids of Giza", "Table Mountain", "Abu Simbel", "Karnak Temple"]],
    ["Name a landmark in North America", ["Statue of Liberty", "Golden Gate Bridge", "Mount Rushmore", "CN Tower"]],
    ["Name a landmark in Australia", ["Sydney Opera House", "Uluru", "Great Barrier Reef", "Harbour Bridge"]],
    ["Name a castle or palace", ["Buckingham Palace", "Versailles", "Neuschwanstein", "Alhambra"]],
    ["Name a famous bridge", ["Golden Gate Bridge", "Tower Bridge", "Brooklyn Bridge", "Rialto Bridge"]],
    ["Name a famous tower", ["Eiffel Tower", "Burj Khalifa", "Leaning Tower of Pisa", "CN Tower"]],
    ["Name a landmark built before 1500", ["Colosseum", "Great Wall of China", "Machu Picchu", "Pyramids of Giza"]],
    ["Name a landmark in a capital city", ["Eiffel Tower", "Big Ben", "Colosseum", "Brandenburg Gate"]],
  ],
  Animals: [
    ["Name a big cat", ["lion", "tiger", "leopard", "jaguar"]],
    ["Name a primate", ["gorilla", "chimpanzee", "orangutan", "lemur"]],
    ["Name a hoofed animal", ["horse", "zebra", "deer", "goat"]],
    ["Name an animal that can fly", ["eagle", "bat", "falcon", "butterfly"]],
    ["Name an animal that lays eggs", ["chicken", "turtle", "duck", "platypus"]],
    ["Name an endangered animal", ["tiger", "rhino", "orangutan", "panda"]],
    ["Name a nocturnal animal", ["bat", "owl", "raccoon", "fox"]],
    ["Name an animal with horns or antlers", ["deer", "goat", "rhino", "moose"]],
    ["Name a farm animal", ["cow", "pig", "chicken", "sheep"]],
  ],
  Science: [
    ["Name a gas", ["oxygen", "nitrogen", "helium", "hydrogen"]],
    ["Name a human organ", ["heart", "brain", "liver", "lung"]],
    ["Name a branch of science", ["biology", "chemistry", "physics", "astronomy"]],
    ["Name a unit of measurement", ["meter", "second", "kelvin", "ampere"]],
    ["Name a constellation", ["Orion", "Ursa Major", "Cassiopeia", "Scorpius"]],
    ["Name a moon in the solar system", ["Europa", "Titan", "Ganymede", "Io"]],
    ["Name a type of rock", ["granite", "basalt", "limestone", "sandstone"]],
    ["Name a disease caused by a virus", ["flu", "COVID-19", "measles", "chickenpox"]],
    ["Name a lab tool", ["microscope", "beaker", "pipette", "test tube"]],
  ],
  Sports: [
    ["Name a Winter Olympic sport", ["skiing", "snowboarding", "ice hockey", "curling"]],
    ["Name a sport played on ice", ["ice hockey", "figure skating", "curling", "speed skating"]],
    ["Name a racket sport", ["tennis", "badminton", "squash", "pickleball"]],
    ["Name a team sport", ["soccer", "basketball", "baseball", "football"]],
    ["Name a track and field event", ["sprint", "long jump", "shot put", "high jump"]],
    ["Name a sport played in water", ["swimming", "water polo", "diving", "surfing"]],
    ["Name a famous sports league", ["NBA", "NFL", "MLB", "Premier League"]],
    ["Name a sport with a goal or net", ["soccer", "hockey", "lacrosse", "handball"]],
    ["Name a sport played at Wimbledon", ["tennis"]],
  ],
  "Movies & TV": [
    ["Name a Star Wars character", ["Luke Skywalker", "Darth Vader", "Leia", "Yoda"]],
    ["Name a Pixar movie", ["Toy Story", "Finding Nemo", "Up", "Inside Out"]],
    ["Name a Marvel character", ["Spider-Man", "Iron Man", "Black Panther", "Thor"]],
    ["Name a TV drama", ["Breaking Bad", "The Sopranos", "Succession", "The Crown"]],
    ["Name a streaming TV series", ["Stranger Things", "The Bear", "Ted Lasso", "The Mandalorian"]],
    ["Name an animated TV show", ["The Simpsons", "SpongeBob", "Avatar", "Bob's Burgers"]],
    ["Name a movie musical", ["La La Land", "Chicago", "The Sound of Music", "Grease"]],
    ["Name a Best Picture winner", ["Parasite", "Moonlight", "Titanic", "Gladiator"]],
    ["Name a Christopher Nolan movie", ["Inception", "Oppenheimer", "Dunkirk", "Interstellar"]],
  ],
  Music: [
    ["Name a pop star", ["Taylor Swift", "Beyonce", "Ariana Grande", "Harry Styles"]],
    ["Name a rock band from the UK", ["The Beatles", "Queen", "Radiohead", "Oasis"]],
    ["Name a singer-songwriter", ["Bob Dylan", "Joni Mitchell", "Taylor Swift", "Ed Sheeran"]],
    ["Name a classical composer", ["Mozart", "Beethoven", "Bach", "Chopin"]],
    ["Name a female rapper", ["Nicki Minaj", "Missy Elliott", "Cardi B", "Doja Cat"]],
    ["Name a music genre", ["pop", "rock", "hip hop", "jazz"]],
    ["Name a Grammy-winning artist", ["Adele", "Beyonce", "Taylor Swift", "Kendrick Lamar"]],
    ["Name a band with one-word name", ["Queen", "Nirvana", "Coldplay", "Radiohead"]],
    ["Name a Motown artist", ["Stevie Wonder", "Marvin Gaye", "Diana Ross", "The Supremes"]],
  ],
  Songs: [
    ["Name a song by Queen", ["Bohemian Rhapsody", "We Will Rock You", "Radio Ga Ga", "Don't Stop Me Now"]],
    ["Name a song by Beyonce", ["Halo", "Crazy in Love", "Single Ladies", "Formation"]],
    ["Name a song with a color in the title", ["Purple Rain", "Blackbird", "Yellow", "Blue Suede Shoes"]],
    ["Name a song with a city in the title", ["New York, New York", "Empire State of Mind", "Viva Las Vegas", "London Calling"]],
    ["Name a Christmas song", ["Jingle Bells", "Last Christmas", "All I Want for Christmas Is You", "Silent Night"]],
    ["Name a song by Michael Jackson", ["Billie Jean", "Thriller", "Beat It", "Smooth Criminal"]],
    ["Name a song from the 1980s", ["Take On Me", "Billie Jean", "Like a Prayer", "Sweet Dreams"]],
    ["Name a song with a person's name in the title", ["Hey Jude", "Billie Jean", "Roxanne", "Jolene"]],
    ["Name a song by Adele", ["Hello", "Rolling in the Deep", "Someone Like You", "Easy on Me"]],
  ],
  Food: [
    ["Name a vegetable", ["carrot", "broccoli", "spinach", "potato"]],
    ["Name a dessert", ["cake", "ice cream", "pie", "baklava"]],
    ["Name a cheese", ["cheddar", "brie", "mozzarella", "parmesan"]],
    ["Name a soup", ["tomato soup", "miso soup", "ramen", "minestrone"]],
    ["Name a street food", ["taco", "falafel", "hot dog", "kebab"]],
    ["Name a spice", ["cinnamon", "cumin", "paprika", "turmeric"]],
    ["Name a bread", ["baguette", "pita", "sourdough", "naan"]],
    ["Name a dish with rice", ["risotto", "paella", "sushi", "biryani"]],
    ["Name a food from Lebanon", ["hummus", "tabbouleh", "falafel", "kibbeh"]],
  ],
  History: [
    ["Name a historical revolution", ["French Revolution", "American Revolution", "Russian Revolution", "Haitian Revolution"]],
    ["Name an ancient ruler", ["Cleopatra", "Julius Caesar", "Augustus", "Hammurabi"]],
    ["Name a World War II leader", ["Churchill", "Roosevelt", "Stalin", "Hitler"]],
    ["Name a historical document", ["Magna Carta", "Declaration of Independence", "Constitution", "Treaty of Versailles"]],
    ["Name an explorer", ["Columbus", "Magellan", "Marco Polo", "Zheng He"]],
    ["Name a civil rights figure", ["Martin Luther King Jr", "Rosa Parks", "Malcolm X", "Nelson Mandela"]],
    ["Name an ancient city", ["Rome", "Athens", "Babylon", "Carthage"]],
    ["Name a dynasty", ["Ming", "Qing", "Tudor", "Romanov"]],
    ["Name a historical invention", ["printing press", "telephone", "steam engine", "wheel"]],
  ],
};

const generatedCategoryDontSaySeeds: DontSaySeed[] = categories
  .filter((category): category is Exclude<Category, "General"> => category !== "General")
  .flatMap((category) =>
    difficulties.flatMap((difficulty) => {
      const templates = dontSaySeeds.filter(
        ([seedCategory, seedDifficulty]) =>
          seedCategory === category && seedDifficulty === difficulty,
      );

      if (!templates.length) {
        return [];
      }

      const authoredPrompts = [
        ...(dontSayPromptPools[category]?.[difficulty] ?? []),
        ...templates.map(
          ([, , prompt, , examples, validationMode]) =>
            [prompt, examples, validationMode] as [
              string,
              string[],
              "open" | "finite" | undefined,
            ],
        ),
        ...(categoryPromptFillers[category] ?? []),
      ];

      return authoredPrompts.slice(0, 15).map(([prompt, examples, validationMode]) => {
        const isFinite = validationMode === "finite";
        const guidance = isFinite
          ? `Only these answers count for "${prompt}": ${examples.join(", ")}. Reject every other answer.`
          : `Any answer that satisfies "${prompt}" counts. Reject answers that do not fit that exact category.`;

        return [
          category,
          difficulty,
          prompt,
          guidance,
          examples,
          validationMode ?? "open",
        ] satisfies DontSaySeed;
      });
    }),
  );

const supplementalDontSayExamples: Record<string, string[]> = {
  "Name a landmark in a capital city": [
    "Eiffel Tower",
    "Big Ben",
    "Colosseum",
    "Brandenburg Gate",
    "Louvre",
    "Buckingham Palace",
    "Westminster Abbey",
    "Trevi Fountain",
    "Pantheon",
    "Acropolis",
    "Parthenon",
    "Senso-ji",
    "Tokyo Tower",
    "Imperial Palace",
    "Forbidden City",
    "Tiananmen Square",
    "Red Square",
    "Kremlin",
    "St. Basil's Cathedral",
    "Prague Castle",
    "Charles Bridge",
    "Hagia Sophia",
    "Blue Mosque",
    "Topkapi Palace",
    "Dublin Castle",
    "Christ Church Cathedral",
    "Palacio Real",
    "Plaza Mayor",
    "Belem Tower",
    "Jeronimos Monastery",
    "Little Mermaid",
    "Amalienborg",
    "Royal Palace of Stockholm",
    "Oslo Opera House",
    "Parliament Hill",
    "Casa Rosada",
    "Obelisco",
    "Moneda Palace",
    "Plaza de Mayo",
    "Qutub Minar",
    "India Gate",
    "Lotus Temple",
    "Humayun's Tomb",
    "Grand Palace",
    "Wat Arun",
    "Wat Pho",
    "Petronas Towers",
    "National Mosque",
    "Sheikh Zayed Grand Mosque",
  ],
  "Name a mammal": [
    "dog",
    "cat",
    "horse",
    "cow",
    "elephant",
    "lion",
    "tiger",
    "bear",
    "panther",
    "leopard",
    "jaguar",
    "cheetah",
    "whale",
    "dolphin",
    "bat",
    "kangaroo",
    "giraffe",
    "zebra",
    "monkey",
    "gorilla",
    "rabbit",
    "fox",
    "wolf",
    "otter",
  ],
  "Name a bird": [
    "eagle",
    "sparrow",
    "penguin",
    "owl",
    "hawk",
    "falcon",
    "robin",
    "cardinal",
    "crow",
    "raven",
    "duck",
    "goose",
    "swan",
    "parrot",
    "flamingo",
    "ostrich",
    "peacock",
    "hummingbird",
    "pigeon",
    "seagull",
  ],
  "Name a reptile": [
    "snake",
    "lizard",
    "crocodile",
    "alligator",
    "turtle",
    "tortoise",
    "iguana",
    "gecko",
    "chameleon",
    "komodo dragon",
    "cobra",
    "python",
    "viper",
    "rattlesnake",
    "skink",
    "monitor lizard",
    "caiman",
    "anole",
    "gila monster",
    "tuatara",
  ],
  "Name a fruit": [
    "apple",
    "banana",
    "orange",
    "grape",
    "mango",
    "pineapple",
    "strawberry",
    "blueberry",
    "pear",
    "peach",
    "watermelon",
    "kiwi",
    "cherry",
    "plum",
    "lemon",
    "lime",
    "papaya",
    "guava",
    "pomegranate",
    "coconut",
  ],
  "Name a sport played with a ball": [
    "soccer",
    "basketball",
    "tennis",
    "baseball",
    "football",
    "golf",
    "volleyball",
    "cricket",
    "rugby",
    "softball",
    "handball",
    "water polo",
    "lacrosse",
    "pickleball",
    "table tennis",
    "badminton",
    "squash",
    "field hockey",
    "netball",
    "bowling",
  ],
  "Name a musical instrument": [
    "piano",
    "guitar",
    "violin",
    "drums",
    "flute",
    "trumpet",
    "saxophone",
    "cello",
    "clarinet",
    "trombone",
    "harp",
    "bass",
    "ukulele",
    "accordion",
    "banjo",
    "oboe",
    "bassoon",
    "xylophone",
    "organ",
    "synthesizer",
  ],
};

const expandDontSayExamples = (prompt: string, examples: string[]) =>
  Array.from(
    new Set([
      ...examples,
      ...(supplementalDontSayExamples[prompt] ?? []),
      ...getBroadDontSayExamples(prompt),
    ]),
  );

const getBroadDontSayExamples = (prompt: string) => {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("color")) {
    return ["red", "blue", "green", "yellow", "orange", "purple", "pink", "black", "white", "brown", "gray", "gold", "silver"];
  }

  if (lowerPrompt.includes("country")) {
    return ["France", "Japan", "Brazil", "Canada", "Germany", "Italy", "Spain", "Mexico", "India", "China", "Australia", "Egypt", "Kenya", "Argentina", "Chile", "South Korea", "Sweden", "Norway", "Greece", "Turkey"];
  }

  if (lowerPrompt.includes("capital")) {
    return ["Paris", "Berlin", "Madrid", "Rome", "London", "Tokyo", "Seoul", "Beijing", "Cairo", "Nairobi", "Ottawa", "Mexico City", "Buenos Aires", "Lima", "Ankara", "Oslo", "Stockholm", "Athens", "Dublin", "Lisbon"];
  }

  if (lowerPrompt === "name a famous landmark") {
    return ["Eiffel Tower", "Statue of Liberty", "Taj Mahal", "Great Wall of China", "Colosseum", "Big Ben", "Machu Picchu", "Christ the Redeemer", "Petra", "Stonehenge", "Sagrada Familia", "Sydney Opera House", "Angkor Wat", "Mount Rushmore", "Burj Khalifa"];
  }

  if (lowerPrompt.includes("scientist")) {
    return ["Einstein", "Newton", "Marie Curie", "Darwin", "Galileo", "Tesla", "Ada Lovelace", "Alan Turing", "Rosalind Franklin", "Stephen Hawking", "Katherine Johnson", "Jane Goodall"];
  }

  if (lowerPrompt.includes("actor")) {
    return ["Tom Hanks", "Zendaya", "Meryl Streep", "Denzel Washington", "Leonardo DiCaprio", "Viola Davis", "Morgan Freeman", "Natalie Portman", "Keanu Reeves", "Sandra Bullock", "Ryan Gosling", "Emma Stone"];
  }

  if (lowerPrompt.includes("instrument")) {
    return supplementalDontSayExamples["Name a musical instrument"] ?? [];
  }

  if (lowerPrompt.includes("fruit")) {
    return supplementalDontSayExamples["Name a fruit"] ?? [];
  }

  if (lowerPrompt.includes("mammal")) {
    return supplementalDontSayExamples["Name a mammal"] ?? [];
  }

  if (lowerPrompt.includes("bird")) {
    return supplementalDontSayExamples["Name a bird"] ?? [];
  }

  if (lowerPrompt.includes("reptile")) {
    return supplementalDontSayExamples["Name a reptile"] ?? [];
  }

  if (lowerPrompt.includes("sport")) {
    return supplementalDontSayExamples["Name a sport played with a ball"] ?? [];
  }

  if (lowerPrompt.includes("movie")) {
    return ["Frozen", "The Lion King", "Moana", "Aladdin", "Spider-Man", "Black Panther", "Superman", "The Avengers", "Titanic", "Parasite", "Moonlight", "Gladiator", "Inception", "Oppenheimer", "Dunkirk", "Memento"];
  }

  if (lowerPrompt.includes("song")) {
    return ["Hey Jude", "Yesterday", "Let It Be", "Shake It Off", "Anti-Hero", "Love Story", "Blinding Lights", "Old Town Road", "Uptown Funk", "Bad Guy", "Rolling in the Deep", "Flowers"];
  }

  if (lowerPrompt.includes("food")) {
    return ["eggs", "pancakes", "cereal", "toast", "pizza", "tacos", "sushi", "pasta", "rice", "bread", "yogurt", "kimchi", "miso", "sauerkraut"];
  }

  return [];
};

export const dontSayQuestions: DontSayQuestion[] = [
  ...generalDontSaySeeds,
  ...generatedGeneralDontSaySeeds,
  ...generatedCategoryDontSaySeeds,
].map(
  ([category, difficulty, prompt, guidance, examples, validationMode], index) => {
    const expandedExamples = expandDontSayExamples(prompt, examples);

    return {
      id: `${category}-${difficulty}-${index}-${prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`,
      category,
      difficulty,
      prompt,
      guidance,
      examples: expandedExamples,
      validationMode: validationMode ?? "open",
      acceptedAnswers: validationMode === "finite" ? examples : expandedExamples,
    };
  },
);

export const getDontSayQuestions = (category: Category, difficulty?: Difficulty) => {
  const categoryQuestions =
    category === "General"
      ? dontSayQuestions
      : dontSayQuestions.filter((question) => question.category === category);
  const difficultyQuestions = difficulty
    ? categoryQuestions.filter((question) => question.difficulty === difficulty)
    : categoryQuestions;

  if (difficultyQuestions.length) {
    return difficultyQuestions;
  }

  return categoryQuestions.length ? categoryQuestions : dontSayQuestions;
};

export const normalizeAnswer = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\bthe\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
