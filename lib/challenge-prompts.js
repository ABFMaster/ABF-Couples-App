// Challenge prompt library
// Structure: each type has an array of prompts
// Each prompt has: key (unique id), prompt (the challenge text), category (for Nora context)
// Rank prompts always framed "most to least [X]" — position 1 = most, last = least
// Memory prompts include dataSource so Nora knows where to pull the specific fact

export const CHALLENGE_PROMPTS = {
  story: [
    { key: 'story_01', category: 'absurd', prompt: 'Write the world\'s worst first date — that somehow leads to a second one.' },
    { key: 'story_02', category: 'domestic', prompt: 'Your apartment is haunted. The ghost only bothers one of you. Write the story of the first week.' },
    { key: 'story_03', category: 'absurd', prompt: 'You\'ve just won a competition neither of you entered. Write what happens next.' },
    { key: 'story_04', category: 'tender', prompt: 'Write a love letter from your pet\'s perspective. If you don\'t have a pet, invent one.' },
    { key: 'story_05', category: 'absurd', prompt: 'You\'re both astronauts. One of you has been accidentally left behind on the space station. Write the first message home.' },
    { key: 'story_06', category: 'absurd', prompt: 'You open a business together that has absolutely no right to succeed. Write the opening day.' },
    { key: 'story_07', category: 'romantic', prompt: 'Write the origin story of how you met — but set it 200 years ago.' },
    { key: 'story_08', category: 'absurd', prompt: 'One of you can suddenly read minds. Write the first 24 hours.' },
    { key: 'story_09', category: 'tender', prompt: 'Write a children\'s book about your relationship. Two sentences per page. At least five pages.' },
    { key: 'story_10', category: 'absurd', prompt: 'You\'ve been challenged to a cook-off by your downstairs neighbor. Neither of you can cook. Write the prep.' },
    { key: 'story_11', category: 'domestic', prompt: 'Write the Yelp review one of you would leave for the other as a roommate. Be honest.' },
    { key: 'story_12', category: 'absurd', prompt: 'A documentary crew has been following you for a year without your knowledge. Write the scene where you find out.' },
    { key: 'story_13', category: 'romantic', prompt: 'Write the story of your relationship as if it\'s being told by a stranger who only saw you together once, briefly, in public.' },
    { key: 'story_14', category: 'absurd', prompt: 'You\'ve been assigned to the same work project. Neither of you can tell anyone you\'re together. Write day one.' },
    { key: 'story_15', category: 'absurd', prompt: 'You\'ve been assigned to negotiate a peace treaty between two countries. Write the moment it nearly falls apart because of something trivial.' },
    { key: 'story_16', category: 'absurd', prompt: 'Write the speech one of you would give introducing the other at an event where absolutely no one knows who they are. Make them sound incredible and slightly unhinged.' },
    { key: 'story_17', category: 'domestic', prompt: 'Write the email chain between you two planning a holiday that slowly descends into chaos.' },
    { key: 'story_18', category: 'absurd', prompt: 'You\'re both contestants on a reality show designed to end relationships. Write the episode where you win.' },
    { key: 'story_19', category: 'absurd', prompt: 'One of you has developed an unexplained British accent. Write the first 24 hours of the other pretending not to notice.' },
    { key: 'story_20', category: 'absurd', prompt: 'You\'ve accidentally adopted a second pet without discussing it. Write the moment the first pet finds out.' },
    { key: 'story_21', category: 'absurd', prompt: 'A hotel has given you the wrong room. It\'s clearly better than yours. Write what happens next.' },
    { key: 'story_22', category: 'absurd', prompt: 'You\'re both on a game show where the prize is something only one of you actually wants. Write the episode.' },
    { key: 'story_23', category: 'absurd', prompt: 'One of you has been accidentally verified on social media as a minor celebrity. Write the first week.' },
    { key: 'story_24', category: 'absurd', prompt: 'You\'re stuck in an elevator together for two hours. Write the conversation you\'ve been avoiding for a month.' },
    { key: 'story_25', category: 'domestic', prompt: 'One of you has started sleepwalking and doing very specific tasks. Write the morning after the third incident.' },
    { key: 'story_26', category: 'absurd', prompt: 'You\'ve won a trip to a destination neither of you chose. Write the first morning there.' },
    { key: 'story_27', category: 'absurd', prompt: 'Your Uber driver clearly knows more about your relationship than he should. Write the ride.' },
    { key: 'story_28', category: 'absurd', prompt: 'One of you has a secret talent the other just discovered. Write the reveal.' },
    { key: 'story_29', category: 'absurd', prompt: 'You\'re both at a fancy dinner where neither of you knows which fork to use. Write the meal.' },
    { key: 'story_30', category: 'absurd', prompt: 'A celebrity you both feel differently about has sat down next to you at a restaurant. Write what happens.' },
    { key: 'story_31', category: 'absurd', prompt: 'You\'ve accidentally sent a text meant for each other to a family member. Write the fallout.' },
    { key: 'story_32', category: 'absurd', prompt: 'One of you has been asked to give a toast at a wedding where you both have history. Write the toast being drafted.' },
    { key: 'story_33', category: 'absurd', prompt: 'You\'re both pretending to enjoy an activity one of you suggested and neither of you is enjoying. Write the afternoon.' },
    { key: 'story_34', category: 'absurd', prompt: 'A minor household argument has somehow escalated to a full debate with rules and a timer. Write round two.' },
    { key: 'story_35', category: 'absurd', prompt: 'One of you has started a side project that is either brilliant or a disaster. Write the pitch to the other.' },
    { key: 'story_36', category: 'absurd', prompt: 'You\'re road tripping and have been lost for 45 minutes. One of you refuses to admit it. Write the next ten minutes.' },
    { key: 'story_37', category: 'domestic', prompt: 'Write the group chat you two would start — and what the first week of messages looks like.' },
    { key: 'story_38', category: 'domestic', prompt: 'Write the Airbnb review you\'d leave for each other if your home was a rental.' },
    { key: 'story_39', category: 'domestic', prompt: 'Write the user manual one of you would write for the other. Three features, two known bugs.' },
    { key: 'story_40', category: 'domestic', prompt: 'You\'re moving apartments. Write the negotiation over what gets kept and what gets donated.' },
    { key: 'story_41', category: 'domestic', prompt: 'Write the voicemail one of you would leave the other in a mild emergency that feels major.' },
    { key: 'story_42', category: 'domestic', prompt: 'One of you has reorganized something important without asking. Write the discovery.' },
    { key: 'story_43', category: 'domestic', prompt: 'Write the shopping list one of you left for the other, and what actually came home.' },
    { key: 'story_44', category: 'domestic', prompt: 'You\'re both working from home on a day when things keep going wrong. Write the midday check-in.' },
    { key: 'story_45', category: 'domestic', prompt: 'One of you has started watching a show ahead without the other. Write the confrontation.' },
    { key: 'story_46', category: 'genre', prompt: 'Write your relationship as a nature documentary. One of you is narrating.' },
    { key: 'story_47', category: 'genre', prompt: 'Write the scene from your relationship that would be the trailer for a movie. Make it dramatic.' },
    { key: 'story_48', category: 'genre', prompt: 'Write the Wikipedia article about your couple three years from now. Include one disputed fact.' },
    { key: 'story_49', category: 'genre', prompt: 'Write the TripAdvisor review of your last trip together. Be honest about the low points.' },
    { key: 'story_50', category: 'genre', prompt: 'Write the pilot episode of a reality show about your apartment. Give it a title.' },
    { key: 'story_51', category: 'genre', prompt: 'Write the song one of you would perform at a talent show about the other. Genre: country.' },
    { key: 'story_52', category: 'genre', prompt: 'Write the Instagram caption that tells the true story of a photo you\'ve posted together.' },
    { key: 'story_53', category: 'genre', prompt: 'Write the deleted scene from your first date — the moment that didn\'t make the story you tell.' },
    { key: 'story_54', category: 'genre', prompt: 'Write your relationship as a sports commentary. One of you is currently winning.' },
    { key: 'story_55', category: 'genre', prompt: 'Write the obituary for a habit one of you has finally given up. Make it a eulogy.' },
    { key: 'story_56', category: 'relationship', prompt: 'Write the terms and conditions of your relationship. Include at least one clause neither of you will enforce.' },
    { key: 'story_57', category: 'relationship', prompt: 'Write the performance review one of you would give the other at their six-month relationship anniversary.' },
    { key: 'story_58', category: 'relationship', prompt: 'Write the origin story of a running joke in your relationship. Get the details wrong and see if the other corrects you.' },
    { key: 'story_59', category: 'relationship', prompt: 'Write the email you\'d send to a couples therapist explaining why you definitely don\'t need one.' },
    { key: 'story_60', category: 'relationship', prompt: 'Write the speech one of you would give nominating the other for an award that doesn\'t exist yet.' },
    { key: 'story_61', category: 'relationship', prompt: 'Write the two-star review one of you would leave for an experience you did together that was actually great.' },
    { key: 'story_62', category: 'relationship', prompt: 'Write the contract you\'d both sign before attempting to assemble IKEA furniture together.' },
    { key: 'story_63', category: 'relationship', prompt: 'Write the holiday card you\'d send that tells the actual truth about your year.' },
    { key: 'story_64', category: 'relationship', prompt: 'Write the negotiation one of you is currently losing without knowing it yet.' },
    { key: 'story_65', category: 'relationship', prompt: 'Write the scene from ten years from now where you\'re telling someone how you got here.' },
  ],

  pitch: [
    { key: 'pitch_01', category: 'food', prompt: 'Pitch a restaurant where the entire menu is foods your partner refuses to eat.' },
    { key: 'pitch_02', category: 'tech', prompt: 'Pitch an app that solves a problem only the two of you have.' },
    { key: 'pitch_03', category: 'entertainment', prompt: 'Pitch a reality TV show starring the two of you. Give it a name, a format, and a tagline.' },
    { key: 'pitch_04', category: 'product', prompt: 'Pitch a product made entirely from something you\'d otherwise throw away.' },
    { key: 'pitch_05', category: 'hospitality', prompt: 'Pitch a hotel where every room is themed around a different relationship stage.' },
    { key: 'pitch_06', category: 'product', prompt: 'Pitch a subscription box for people who are terrible at gift-giving.' },
    { key: 'pitch_07', category: 'entertainment', prompt: 'Pitch a theme park ride based on a specific memory from your relationship.' },
    { key: 'pitch_08', category: 'publishing', prompt: 'Pitch a self-help book neither of you is remotely qualified to write.' },
    { key: 'pitch_09', category: 'food', prompt: 'Pitch a fast food chain built around a single ingredient you both love. Name it. Price the menu.' },
    { key: 'pitch_10', category: 'tech', prompt: 'Pitch a social network for a demographic that has never been targeted before.' },
    { key: 'pitch_11', category: 'hospitality', prompt: 'Pitch a travel company that designs trips specifically for couples who disagree on everything.' },
    { key: 'pitch_12', category: 'product', prompt: 'Pitch a board game based on the unspoken rules of your relationship.' },
    { key: 'pitch_13', category: 'entertainment', prompt: 'Pitch a podcast hosted by the two of you. Topic, format, episode one.' },
    { key: 'pitch_14', category: 'product', prompt: 'Pitch a clothing line that solves one specific problem you have getting dressed.' },
    { key: 'pitch_15', category: 'tech', prompt: 'Pitch an AI product — but it can only do one extremely specific thing.' },
    { key: 'pitch_16', category: 'hospitality', prompt: 'Pitch a gym concept where the entire workout is disguised as something else.' },
    { key: 'pitch_17', category: 'publishing', prompt: 'Pitch a children\'s book series based on a life lesson one of you learned the hard way.' },
    { key: 'pitch_18', category: 'entertainment', prompt: 'Pitch a museum exhibit about modern relationships. Three rooms, three themes.' },
    { key: 'pitch_19', category: 'food', prompt: 'Pitch a meal kit service but the twist is it\'s designed for people who hate cooking.' },
    { key: 'pitch_20', category: 'product', prompt: 'Pitch the worst possible product you could actually see people buying anyway.' },
  ],

  rank: [
    {
      key: 'rank_01',
      category: 'relationship',
      prompt: 'Rank from most to least likely to change your relationship:',
      items: ['Winning the lottery', 'Moving countries', 'One of you becomes briefly famous', 'Adopting a dog']
    },
    {
      key: 'rank_02',
      category: 'domestic',
      prompt: 'Rank from most to least challenging to navigate together:',
      items: ['Money', 'Shared chores', 'Personal space', 'Different schedules', 'Clashing tastes']
    },
    {
      key: 'rank_03',
      category: 'dates',
      prompt: 'Rank from most to least "you two" as a date night:',
      items: ['An outdoor adventure', 'A cultural experience', 'A full stay-in night', 'A long foodie dinner', 'Trying something neither of you has done']
    },
    {
      key: 'rank_04',
      category: 'relationship',
      prompt: 'Rank from most to least defining moment in a relationship:',
      items: ['The first fight', 'Moving in together', 'Meeting each other\'s families', 'The first big trip', 'Saying I love you']
    },
    {
      key: 'rank_05',
      category: 'future',
      prompt: 'Rank from most to least important in a home:',
      items: ['Location', 'Size', 'Character and history', 'Price', 'Outdoor space']
    },
    {
      key: 'rank_06',
      category: 'leisure',
      prompt: 'Rank from most to least how you\'d want to spend a surprise free weekend:',
      items: ['A spontaneous city trip', 'Getting into nature', 'Complete rest', 'Finally catching up on life', 'Something brand new']
    },
    {
      key: 'rank_07',
      category: 'relationship',
      prompt: 'Rank from most to least threatening to a long relationship:',
      items: ['Money stress', 'Growing apart', 'Living far apart', 'Outside opinions', 'Wanting different futures']
    },
    {
      key: 'rank_08',
      category: 'domestic',
      prompt: 'Rank from most to least stressful to plan together:',
      items: ['A holiday', 'A big purchase', 'A dinner party', 'Redecorating a room', 'Choosing where to eat tonight']
    },
    {
      key: 'rank_09',
      category: 'future',
      prompt: 'Rank from most to least excited you\'d be about:',
      items: ['Moving to a new city', 'Buying your first home', 'Getting a pet', 'Starting a business together', 'Taking a year off to travel']
    },
    {
      key: 'rank_10',
      category: 'leisure',
      prompt: 'Rank from most to least satisfying to accomplish together:',
      items: ['Running a race', 'Finishing a renovation', 'Cooking a complex meal from scratch', 'Completing a long trip', 'Learning something new side by side']
    },
    {
      key: 'rank_11',
      category: 'relationship',
      prompt: 'Rank from most to least important in a partner long-term:',
      items: ['Shared values', 'Physical attraction', 'Making each other laugh', 'Financial compatibility', 'Wanting the same future']
    },
    {
      key: 'rank_12',
      category: 'domestic',
      prompt: 'Rank from most to least likely to start a disagreement in your house:',
      items: ['Temperature of the room', 'What to watch', 'When to sleep', 'How to spend money', 'Who does what']
    },
  ],

  memory: [
    // SMALL THINGS — specific preferences and quirks only a paying-attention partner knows
    { key: 'memory_01', category: 'small_things', hintStrategy: 'small_things', prompt: 'Name two of {answerHolder}\'s closest friends right now — not historically, right now.' },
    { key: 'memory_02', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite musical artist, composer, or genre — the one {answerHolder} always comes back to?' },
    { key: 'memory_03', category: 'small_things', hintStrategy: 'small_things', prompt: 'What was {answerHolder} wearing the first time you met?' },
    { key: 'memory_04', category: 'small_things', hintStrategy: 'small_things', prompt: 'Name one of {answerHolder}\'s hobbies — something {answerHolder} actually does, not something they say they\'ll get back to.' },
    { key: 'memory_05', category: 'small_things', hintStrategy: 'small_things', prompt: 'Where was {answerHolder} born?' },
    { key: 'memory_06', category: 'small_things', hintStrategy: 'small_things', prompt: 'When is {answerHolder}\'s birthday?' },
    { key: 'memory_07', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is the date of your anniversary?' },
    { key: 'memory_08', category: 'small_things', hintStrategy: 'small_things', prompt: 'Who is {answerHolder}\'s favorite relative — the one {answerHolder} actually lights up around?' },
    { key: 'memory_09', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite meal — the one they\'d choose if nothing was off the table?' },
    { key: 'memory_10', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite way to spend an evening when {answerHolder} gets to choose?' },
    { key: 'memory_11', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite color?' },
    { key: 'memory_12', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is the best gift you could give {answerHolder} right now — something they\'d actually want?' },
    { key: 'memory_13', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite way to relax when they\'re genuinely unwinding?' },
    { key: 'memory_14', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite sport or physical activity?' },
    { key: 'memory_15', category: 'small_things', hintStrategy: 'small_things', prompt: 'What does {answerHolder} most like to do with time off — not what {answerHolder} should do, what {answerHolder} actually does?' },
    { key: 'memory_16', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is one of {answerHolder}\'s favorite weekend activities?' },
    { key: 'memory_17', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s dream getaway — the place they\'d go if logistics didn\'t matter?' },
    { key: 'memory_18', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite movie?' },
    { key: 'memory_19', category: 'small_things', hintStrategy: 'small_things', prompt: 'What are {answerHolder}\'s favorite ways to work out or stay active?' },
    { key: 'memory_20', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite holiday?' },
    { key: 'memory_21', category: 'small_things', hintStrategy: 'small_things', prompt: 'What kinds of books does {answerHolder} most like to read — or wish {answerHolder} had time to read?' },
    { key: 'memory_22', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite TV show right now?' },
    { key: 'memory_23', category: 'small_things', hintStrategy: 'small_things', prompt: 'Which side of the bed does {answerHolder} prefer?' },
    { key: 'memory_24', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite ice cream flavor?' },
    { key: 'memory_25', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite dessert?' },
    { key: 'memory_26', category: 'small_things', hintStrategy: 'small_things', prompt: 'What foods does {answerHolder} genuinely hate — not just dislike, actually hate?' },
    { key: 'memory_27', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite animal?' },
    { key: 'memory_28', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite song right now — the one that keeps showing up?' },
    { key: 'memory_29', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder} most loyal to — a team, a show, a band, an institution — the thing they\'d defend in any argument?' },
    { key: 'memory_30', category: 'small_things', hintStrategy: 'small_things', prompt: 'What app or podcast has {answerHolder} been most into lately?' },
    { key: 'memory_31', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder} currently reading, or what does {answerHolder} wish they were reading?' },
    { key: 'memory_32', category: 'small_things', hintStrategy: 'small_things', prompt: 'What is {answerHolder}\'s favorite restaurant — the one they\'d pick if you were celebrating something?' },

    // INNER WORLD — dreams, fears, what makes them tick
    { key: 'memory_33', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'What is {answerHolder}\'s fondest unrealized dream — the one {answerHolder} doesn\'t talk about much anymore?' },
    { key: 'memory_34', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'What is {answerHolder}\'s greatest fear — not a surface fear, the real one underneath?' },
    { key: 'memory_35', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'What makes {answerHolder} feel most competent — the situations where {answerHolder} comes alive?' },
    { key: 'memory_36', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'What personal improvements does {answerHolder} most want to make in their life right now?' },
    { key: 'memory_37', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'What would {answerHolder} consider their dream job — the one they\'d do if money and practicality weren\'t factors?' },
    { key: 'memory_38', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'What is {answerHolder} most sad about right now — something they\'re carrying quietly?' },
    { key: 'memory_39', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'Name two people {answerHolder} most admires — living or dead.' },
    { key: 'memory_40', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'What are two of {answerHolder}\'s deepest aspirations, hopes, or wishes for their life?' },
    { key: 'memory_41', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'Does {answerHolder} have a secret ambition — something {answerHolder} wants but rarely says out loud?' },
    { key: 'memory_42', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'What is the one thing {answerHolder} would most like to change about themselves?' },
    { key: 'memory_43', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'How would {answerHolder} like their life to look three years from now — what\'s different?' },
    { key: 'memory_44', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'If {answerHolder} could instantly possess three skills, what would {answerHolder} choose?' },
    { key: 'memory_45', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'When it comes to the future, what does {answerHolder} worry about most?' },
    { key: 'memory_46', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'If {answerHolder} could choose a completely different career, what would it be and why?' },
    { key: 'memory_47', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'Does {answerHolder} feel like something is missing from their life right now — what is it?' },
    { key: 'memory_48', category: 'inner_world', hintStrategy: 'inner_world', prompt: 'What adventures does {answerHolder} most want to have in their life — the ones still on the list?' },

    // SHARED HISTORY — firsts, specific moments, the story of you two
    { key: 'memory_49', category: 'shared_history', hintStrategy: 'shared_history', prompt: 'What was one of {answerHolder}\'s best childhood experiences — a memory they\'ve described more than once?' },
    { key: 'memory_50', category: 'shared_history', hintStrategy: 'shared_history', prompt: 'What was {answerHolder}\'s favorite vacation — before you, or together?' },
    { key: 'memory_51', category: 'shared_history', hintStrategy: 'shared_history', prompt: 'Who was {answerHolder}\'s best friend in childhood?' },
    { key: 'memory_52', category: 'shared_history', hintStrategy: 'shared_history', prompt: 'What was {answerHolder}\'s most embarrassing moment — the one {answerHolder} can laugh about now?' },
    { key: 'memory_53', category: 'shared_history', hintStrategy: 'shared_history', prompt: 'What was {answerHolder}\'s worst childhood experience — something that shaped who {answerHolder} became?' },
    { key: 'memory_54', category: 'shared_history', hintStrategy: 'shared_history', prompt: 'What were the best and worst things that happened to {answerHolder} as a teenager?' },
    { key: 'memory_55', category: 'shared_history', hintStrategy: 'shared_history', prompt: 'If {answerHolder} could redo a five-year period of their life, which would {answerHolder} choose and why?' },
    { key: 'memory_56', category: 'shared_history', hintStrategy: 'shared_history', prompt: 'What is the most exciting thing that has happened in {answerHolder}\'s life in the last year?' },
    { key: 'memory_57', category: 'shared_history', hintStrategy: 'shared_history', prompt: 'What have been the highlights and low points of the last year for {answerHolder}?' },

    // PRESENT DAY — today\'s map, what\'s happening in their world right now
    { key: 'memory_58', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'What stresses is {answerHolder} currently facing — the ones sitting just below the surface?' },
    { key: 'memory_59', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'What are some important events coming up in {answerHolder}\'s life, and how does {answerHolder} feel about them?' },
    { key: 'memory_60', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'What is {answerHolder}\'s greatest source of support right now, other than you?' },
    { key: 'memory_61', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'Name one concern or worry {answerHolder} is sitting with right now.' },
    { key: 'memory_62', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'What medical or health concern has {answerHolder} mentioned that {answerHolder} quietly thinks about?' },
    { key: 'memory_63', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'Of all the people you both know, who does {answerHolder} like the least — and why?' },
    { key: 'memory_64', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'Who are {answerHolder}\'s best friends or closest allies right now — has that list shifted recently?' },
    { key: 'memory_65', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'How is {answerHolder} feeling about their work right now — energised, drained, somewhere in between?' },
    { key: 'memory_66', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'What is the most exciting thing happening in {answerHolder}\'s life right now?' },
    { key: 'memory_67', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'Has {answerHolder} changed in the last year — how would {answerHolder} describe it?' },
    { key: 'memory_68', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'What are {answerHolder}\'s goals just for themselves right now — not for the relationship, just them?' },
    { key: 'memory_69', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'What have been the highlights and low points of the last year for {answerHolder}?' },
    { key: 'memory_70', category: 'present_day', hintStrategy: 'present_day', recyclable: true, prompt: 'What qualities does {answerHolder} value most in their friendships right now?' },
  ],

  plan: [
    { key: 'plan_01', category: 'travel', prompt: 'Plan a 72-hour trip to a city neither of you has been to. Pick the city, name three things you\'d do, and decide what you\'d skip.' },
    { key: 'plan_02', category: 'future', prompt: 'Plan your ideal Sunday five years from now. Where are you, what\'s changed, what\'s exactly the same?' },
    { key: 'plan_03', category: 'social', prompt: 'Plan a dinner party for six. Who\'s invited, what\'s on the menu, and name the one thing that\'s guaranteed to go sideways.' },
    { key: 'plan_04', category: 'travel', prompt: 'Plan a trip to visit one of your families — and design it so it\'s actually fun for both of you.' },
    { key: 'plan_05', category: 'adventure', prompt: 'Plan a micro-adventure you could realistically do in the next 30 days. No flights required.' },
    { key: 'plan_06', category: 'future', prompt: 'Plan your dream home. Not the building — the life inside it. Daily rhythms, who does what, what it feels like on a Tuesday.' },
    { key: 'plan_07', category: 'travel', prompt: 'Plan a sabbatical. One month, anywhere, both of you. Make it specific enough that you could actually book it.' },
    { key: 'plan_08', category: 'celebration', prompt: 'Plan a milestone birthday trip for whichever of you has one coming up. Make it worth remembering.' },
    { key: 'plan_09', category: 'adventure', prompt: 'Plan a 24-hour date in your own city as if you\'re tourists who\'ve never been there before.' },
    { key: 'plan_10', category: 'future', prompt: 'Plan the first year of living somewhere completely new. City, neighbourhood, how you\'d find your people, what you\'d miss.' },
    { key: 'plan_11', category: 'social', prompt: 'Plan a holiday tradition you\'d want to start this year and do every year after. What is it, and why would it stick?' },
    { key: 'plan_12', category: 'travel', prompt: 'Plan a trip built around one specific thing — a food, a landscape, a sport, an artist. Let that one thing drive every decision.' },
    { key: 'plan_13', category: 'adventure', prompt: 'Plan a weekend designed specifically to get you both out of your comfort zones. What scares you a little but excites you more?' },
    { key: 'plan_14', category: 'future', prompt: 'Plan your retirement. Where, how, with who around you, and what does a good day look like?' },
    { key: 'plan_15', category: 'celebration', prompt: 'Plan how you\'d celebrate if one of you achieved something you\'ve been working toward for years. Make it specific to them.' },
  ],
};

// Memory unlock thresholds
export const MEMORY_UNLOCK = {
  minTimelineEvents: 0,
  minSparkBetResponses: 0,
  minAccountAgeWeeks: 0,
};

// Memory locked state copy
export const MEMORY_LOCKED_COPY = {
  headline: 'Memory unlocks as your story grows.',
  body: 'The more you add to your timeline and answer each other\'s questions, the better Nora knows your story — and the harder she can make it. Come back after a few more weeks together in ABF.',
  cta: 'Add to your timeline',
};

// Memory unlock notification copy (fires when all thresholds met)
export const MEMORY_UNLOCK_COPY = {
  title: 'Nora\'s ready to test you.',
  body: 'She\'s been paying attention. Think you remember everything?',
};
