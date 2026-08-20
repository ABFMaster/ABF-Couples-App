// question_solo — added Aug 20 2026, single-user arc. Same question, same
// id/tone/level/rotation logic, redirected from "the app-partner speaking to
// you" ("I"/"me"/"my"/"we"/"our") to "your partner" ("your"/"they"/"their")
// so it's answerable about a real person the solo user actually has in
// their life, without needing that person to hold an app account yet.
// Resolved once at generation time (see processDailyContent in
// cron/scheduled-tasks/route.js) based on whether the couple has a partner
// yet — never re-resolved client-side, so a Spark generated while solo
// keeps its solo phrasing even if a partner joins later that same week;
// the following Monday's generation picks up the real coupled version
// (with the partner's actual name) automatically. Still direct address
// throughout ("your partner", not "they/them" as the primary reference) —
// consistent with the existing no-third-person voice rule elsewhere.
export const SPARK_QUESTIONS = [
  { "id": "spark_001", "question": "What's a version of yourself you've left behind that you sometimes miss?", "question_solo": "What's a version of yourself you've left behind that you sometimes miss?", "tone": "deep", "level": 2 },
  { "id": "spark_002", "question": "What do you need from me that you've never directly asked for?", "question_solo": "What do you need from a partner that you've never directly asked for?", "tone": "deep", "level": 3 },
  { "id": "spark_003", "question": "What's something you've forgiven me for that you never told me about?", "question_solo": "What's something you've forgiven a partner for without ever telling them?", "tone": "deep", "level": 3 },
  { "id": "spark_004", "question": "When do you feel most like yourself in this relationship?", "question_solo": "When do you feel most like yourself with your partner?", "tone": "deep", "level": 2 },
  { "id": "spark_005", "question": "What's a fear about us you've never said out loud?", "question_solo": "What's a fear about your relationship you've never said out loud?", "tone": "deep", "level": 3 },
  { "id": "spark_006", "question": "What's a version of our future you hope for but are afraid to say?", "question_solo": "What's a version of your future together you hope for but are afraid to say?", "tone": "deep", "level": 2 },
  { "id": "spark_007", "question": "What's something I do that makes you feel safe?", "question_solo": "What's something your partner does that makes you feel safe?", "tone": "deep", "level": 1 },
  { "id": "spark_008", "question": "What's the hardest thing you think {partnerName} has ever had to forgive someone for?", "question_solo": "What's the hardest thing you think your partner has ever had to forgive someone for?", "tone": "deep", "level": 2 },
  { "id": "spark_009", "question": "What part of your childhood still shows up in our relationship?", "question_solo": "What part of your childhood still shows up in your relationship?", "tone": "deep", "level": 2 },
  { "id": "spark_010", "question": "What's something you want me to understand about how you love?", "question_solo": "What's something you want your partner to understand about how you love?", "tone": "deep", "level": 2 },
  { "id": "spark_011", "question": "When do you feel most alone, even when we're together?", "question_solo": "When do you feel most alone, even with your partner around?", "tone": "deep", "level": 3 },
  { "id": "spark_012", "question": "What's a dream you think {partnerName} has quietly given up on?", "question_solo": "What's a dream you think your partner has quietly given up on?", "tone": "deep", "level": 2 },
  { "id": "spark_013", "question": "What's the most honest thing you could say about where we are right now?", "question_solo": "What's the most honest thing you could say about where your relationship is right now?", "tone": "deep", "level": 3 },
  { "id": "spark_014", "question": "What's something you wish I asked you more often?", "question_solo": "What's something you wish your partner asked you more often?", "tone": "deep", "level": 2 },
  { "id": "spark_015", "question": "What's a way I've changed you that I might not know about?", "question_solo": "What's a way your partner has changed you that they might not know about?", "tone": "deep", "level": 2 },
  { "id": "spark_016", "question": "When did you first know you loved me?", "question_solo": "When did you first know you were in love with your partner?", "tone": "deep", "level": 2 },
  { "id": "spark_017", "question": "What's a part of yourself you hide from most people but not from me?", "question_solo": "What's a part of yourself you hide from most people but not from your partner?", "tone": "deep", "level": 2 },
  { "id": "spark_018", "question": "What's something you need more of in this relationship?", "question_solo": "What's something you need more of in your relationship?", "tone": "deep", "level": 2 },
  { "id": "spark_019", "question": "What's the thing I do that makes you feel most chosen?", "question_solo": "What's the thing your partner does that makes you feel most chosen?", "tone": "deep", "level": 1 },
  { "id": "spark_020", "question": "What's a wound from {partnerName}'s past that you think still shows up in your relationship sometimes?", "question_solo": "What's a wound from your partner's past that you think still shows up in your relationship sometimes?", "tone": "deep", "level": 3 },
  { "id": "spark_021", "question": "What's a moment from our relationship you'd want to live again?", "question_solo": "What's a moment from your relationship you'd want to live again?", "tone": "deep", "level": 2 },
  { "id": "spark_022", "question": "What do you think I misunderstand about you?", "question_solo": "What do you think your partner misunderstands about you?", "tone": "deep", "level": 2 },
  { "id": "spark_023", "question": "What's something you've needed to say to me but haven't?", "question_solo": "What's something you've needed to say to your partner but haven't?", "tone": "deep", "level": 3 },
  { "id": "spark_024", "question": "What are you most proud of in how we've handled something hard?", "question_solo": "What are you most proud of in how you and your partner have handled something hard?", "tone": "deep", "level": 2 },
  { "id": "spark_025", "question": "What's a way you feel like we've grown apart lately?", "question_solo": "What's a way you feel like you and your partner have grown apart lately?", "tone": "deep", "level": 3 },
  { "id": "spark_026", "question": "What do you want our relationship to feel like five years from now?", "question_solo": "What do you want your relationship to feel like five years from now?", "tone": "deep", "level": 1 },
  { "id": "spark_027", "question": "What's something you've sacrificed for us that you've never mentioned?", "question_solo": "What's something you've sacrificed for your relationship that you've never mentioned?", "tone": "deep", "level": 3 },
  { "id": "spark_028", "question": "What's a conversation you've been avoiding having with me?", "question_solo": "What's a conversation you've been avoiding having with your partner?", "tone": "deep", "level": 3 },
  { "id": "spark_029", "question": "What's a belief about love that this relationship has changed?", "question_solo": "What's a belief about love that your relationship has changed?", "tone": "deep", "level": 2 },
  { "id": "spark_030", "question": "What's the most important thing I could do for you right now?", "question_solo": "What's the most important thing your partner could do for you right now?", "tone": "deep", "level": 1 },
  { "id": "spark_031", "question": "What moment in our relationship made you feel the most understood?", "question_solo": "What moment in your relationship made you feel the most understood?", "tone": "deep", "level": 2 },
  { "id": "spark_032", "question": "What's something you think {partnerName} is grieving that they haven't told you?", "question_solo": "What's something you think your partner is grieving that they haven't told you?", "tone": "deep", "level": 3 },
  { "id": "spark_033", "question": "What's a part of you that emerged because of this relationship?", "question_solo": "What's a part of you that emerged because of your relationship?", "tone": "deep", "level": 2 },
  { "id": "spark_034", "question": "What's something about {partnerName}'s past you sense they carry quietly?", "question_solo": "What's something about your partner's past you sense they carry quietly?", "tone": "deep", "level": 3 },
  { "id": "spark_035", "question": "What do you think we do really well together that we take for granted?", "question_solo": "What do you think you and your partner do really well together that you take for granted?", "tone": "deep", "level": 2 },
  { "id": "spark_036", "question": "What's something I said once that has stayed with you?", "question_solo": "What's something your partner said once that has stayed with you?", "tone": "deep", "level": 2 },
  { "id": "spark_037", "question": "What are you most afraid of losing?", "question_solo": "What are you most afraid of losing?", "tone": "deep", "level": 2 },
  { "id": "spark_038", "question": "What's a way you show love that you don't think I fully notice?", "question_solo": "What's a way you show love that you don't think your partner fully notices?", "tone": "deep", "level": 2 },
  { "id": "spark_039", "question": "What's the most vulnerable you've ever felt with me?", "question_solo": "What's the most vulnerable you've ever felt with your partner?", "tone": "deep", "level": 3 },
  { "id": "spark_040", "question": "What do you think I'm most afraid of in our relationship?", "question_solo": "What do you think your partner is most afraid of in your relationship?", "tone": "deep", "level": 2 },
  { "id": "spark_041", "question": "What's something you've changed your mind about because of me?", "question_solo": "What's something you've changed your mind about because of your partner?", "tone": "deep", "level": 2 },
  { "id": "spark_042", "question": "What part of our relationship do you take for granted?", "question_solo": "What part of your relationship do you take for granted?", "tone": "deep", "level": 2 },
  { "id": "spark_043", "question": "What's a version of us you sometimes mourn?", "question_solo": "What's a version of you and your partner you sometimes mourn?", "tone": "deep", "level": 3 },
  { "id": "spark_044", "question": "What would you want me to know if something happened to you?", "question_solo": "What would you want your partner to know if something happened to you?", "tone": "deep", "level": 3 },
  { "id": "spark_045", "question": "What's the thing you most want me to remember about this season of our life?", "question_solo": "What's the thing you most want your partner to remember about this season of your life?", "tone": "deep", "level": 2 },
  { "id": "spark_046", "question": "What do you think our biggest unspoken agreement is?", "question_solo": "What do you think your biggest unspoken agreement with your partner is?", "tone": "deep", "level": 3 },
  { "id": "spark_047", "question": "What's something you think {partnerName} is still figuring out about themselves?", "question_solo": "What's something you think your partner is still figuring out about themselves?", "tone": "deep", "level": 1 },
  { "id": "spark_048", "question": "What's a need you've been trying to meet on your own instead of asking me for?", "question_solo": "What's a need you've been trying to meet on your own instead of asking your partner for?", "tone": "deep", "level": 3 },
  { "id": "spark_049", "question": "What do you think love looks like at its best, and are we close?", "question_solo": "What do you think love looks like at its best, and are you and your partner close?", "tone": "deep", "level": 2 },
  { "id": "spark_050", "question": "What's the most important thing you've learned from loving me?", "question_solo": "What's the most important thing you've learned from loving your partner?", "tone": "deep", "level": 3 },
  { "id": "spark_051", "question": "If our relationship were a movie genre, what would it be and why?", "question_solo": "If your relationship were a movie genre, what would it be and why?", "tone": "playful", "level": 1 },
  { "id": "spark_052", "question": "What's a talent I have that I'm weirdly underconfident about?", "question_solo": "What's a talent your partner has that they're weirdly underconfident about?", "tone": "playful", "level": 1 },
  { "id": "spark_053", "question": "What's the most chaotic thing we've survived together?", "question_solo": "What's the most chaotic thing you and your partner have survived together?", "tone": "playful", "level": 2 },
  { "id": "spark_054", "question": "If you had to describe me in three words to a stranger, what would they be?", "question_solo": "If you had to describe your partner in three words to a stranger, what would they be?", "tone": "playful", "level": 1 },
  { "id": "spark_055", "question": "What's a habit of mine that secretly amuses you?", "question_solo": "What's a habit of your partner's that secretly amuses you?", "tone": "playful", "level": 1 },
  { "id": "spark_056", "question": "What fictional couple reminds you most of us?", "question_solo": "What fictional couple reminds you most of you and your partner?", "tone": "playful", "level": 1 },
  { "id": "spark_057", "question": "If we swapped roles for a day, what would I do wrong?", "question_solo": "If you swapped roles with your partner for a day, what would they do wrong?", "tone": "playful", "level": 2 },
  { "id": "spark_058", "question": "What's a phase I went through that you loved but would never admit?", "question_solo": "What's a phase your partner went through that you loved but would never admit?", "tone": "playful", "level": 2 },
  { "id": "spark_059", "question": "What's my worst habit that you've actually gotten used to?", "question_solo": "What's your partner's worst habit that you've actually gotten used to?", "tone": "playful", "level": 2 },
  { "id": "spark_060", "question": "What's the weirdest thing about how we communicate?", "question_solo": "What's the weirdest thing about how you and your partner communicate?", "tone": "playful", "level": 2 },
  { "id": "spark_061", "question": "What's a food I genuinely love that you find completely inexplicable?", "question_solo": "What's a food your partner genuinely loves that you find completely inexplicable?", "tone": "playful", "level": 1 },
  { "id": "spark_062", "question": "If our relationship had a theme song right now, what is it?", "question_solo": "If your relationship had a theme song right now, what would it be?", "tone": "playful", "level": 1 },
  { "id": "spark_063", "question": "What's the most ridiculous argument we've ever had?", "question_solo": "What's the most ridiculous argument you and your partner have ever had?", "tone": "playful", "level": 2 },
  { "id": "spark_064", "question": "What skill of mine do you find most useful and most annoying at the same time?", "question_solo": "What skill of your partner's do you find most useful and most annoying at the same time?", "tone": "playful", "level": 2 },
  { "id": "spark_065", "question": "What's a weird thing I do that you've secretly started doing too?", "question_solo": "What's a weird thing your partner does that you've secretly started doing too?", "tone": "playful", "level": 2 },
  { "id": "spark_066", "question": "What's the most embarrassing thing I've done in public that you witnessed?", "question_solo": "What's the most embarrassing thing your partner has done in public that you witnessed?", "tone": "playful", "level": 2 },
  { "id": "spark_067", "question": "What's a decision I made that seemed terrible at the time but turned out fine?", "question_solo": "What's a decision your partner made that seemed terrible at the time but turned out fine?", "tone": "playful", "level": 2 },
  { "id": "spark_068", "question": "If you had to cast someone to play me in a movie, who would it be?", "question_solo": "If you had to cast someone to play your partner in a movie, who would it be?", "tone": "playful", "level": 1 },
  { "id": "spark_069", "question": "What's something I'm weirdly good at that has no practical application?", "question_solo": "What's something your partner is weirdly good at that has no practical application?", "tone": "playful", "level": 1 },
  { "id": "spark_070", "question": "What's the dumbest thing we've ever spent money on together?", "question_solo": "What's the dumbest thing you and your partner have ever spent money on together?", "tone": "playful", "level": 2 },
  { "id": "spark_071", "question": "What's a phase {partnerName} went through before you met that you wish you'd witnessed?", "question_solo": "What's a phase your partner went through before you met that you wish you'd witnessed?", "tone": "playful", "level": 2 },
  { "id": "spark_072", "question": "What's a prediction you had about me early on that was completely wrong?", "question_solo": "What's a prediction you had about your partner early on that was completely wrong?", "tone": "playful", "level": 2 },
  { "id": "spark_073", "question": "What would be the title of the chapter of our relationship we're currently in?", "question_solo": "What would be the title of the chapter of your relationship you're currently in?", "tone": "playful", "level": 2 },
  { "id": "spark_074", "question": "What's the most impressive thing I've improvised that I pretended was planned?", "question_solo": "What's the most impressive thing your partner has improvised that they pretended was planned?", "tone": "playful", "level": 2 },
  { "id": "spark_075", "question": "What's a compliment someone gave you about me that you were secretly proud of?", "question_solo": "What's a compliment someone gave you about your partner that you were secretly proud of?", "tone": "playful", "level": 2 },
  { "id": "spark_076", "question": "What's one thing about me that took you the longest to get used to?", "question_solo": "What's one thing about your partner that took you the longest to get used to?", "tone": "playful", "level": 2 },
  { "id": "spark_077", "question": "What's the most ridiculous thing we've seriously disagreed about?", "question_solo": "What's the most ridiculous thing you and your partner have seriously disagreed about?", "tone": "playful", "level": 2 },
  { "id": "spark_078", "question": "What's something I do that makes you laugh when I'm not trying to be funny?", "question_solo": "What's something your partner does that makes you laugh when they're not trying to be funny?", "tone": "playful", "level": 1 },
  { "id": "spark_079", "question": "What's a weird ritual we have that would be hard to explain to anyone else?", "question_solo": "What's a weird ritual you and your partner have that would be hard to explain to anyone else?", "tone": "playful", "level": 2 },
  { "id": "spark_080", "question": "What's the worst advice I've ever given you that you took anyway?", "question_solo": "What's the worst advice your partner has ever given you that you took anyway?", "tone": "playful", "level": 2 },
  { "id": "spark_081", "question": "What's something I'm irrationally confident about?", "question_solo": "What's something your partner is irrationally confident about?", "tone": "playful", "level": 2 },
  { "id": "spark_082", "question": "What's a moment you thought I was going to embarrass you but I didn't?", "question_solo": "What's a moment you thought your partner was going to embarrass you but they didn't?", "tone": "playful", "level": 2 },
  { "id": "spark_083", "question": "What's the most 'us' thing we do?", "question_solo": "What's the most 'you two' thing you and your partner do?", "tone": "playful", "level": 2 },
  { "id": "spark_084", "question": "What's a song that, for better or worse, will always remind you of me?", "question_solo": "What's a song that, for better or worse, will always remind you of your partner?", "tone": "playful", "level": 1 },
  { "id": "spark_085", "question": "What's an inside joke you remember that I've probably already forgotten?", "question_solo": "What's an inside joke you remember that your partner has probably already forgotten?", "tone": "playful", "level": 2 },
  { "id": "spark_086", "question": "What's the most dramatic I've ever been about something completely minor?", "question_solo": "What's the most dramatic your partner has ever been about something completely minor?", "tone": "playful", "level": 2 },
  { "id": "spark_087", "question": "What would our relationship look like as a reality TV show?", "question_solo": "What would your relationship look like as a reality TV show?", "tone": "playful", "level": 2 },
  { "id": "spark_088", "question": "What's something I do that would horrify my younger self?", "question_solo": "What's something your partner does that would horrify their younger self?", "tone": "playful", "level": 2 },
  { "id": "spark_089", "question": "What's my most predictable behavior that you could set a clock by?", "question_solo": "What's your partner's most predictable behavior that you could set a clock by?", "tone": "playful", "level": 2 },
  { "id": "spark_090", "question": "What's an opinion I have that is objectively wrong but I will never abandon?", "question_solo": "What's an opinion your partner has that is objectively wrong but they will never abandon?", "tone": "playful", "level": 2 },
  { "id": "spark_091", "question": "What's a time you said 'I told you so' in your head but not out loud?", "question_solo": "What's a time you said 'I told you so' about your partner in your head but not out loud?", "tone": "playful", "level": 2 },
  { "id": "spark_092", "question": "What's the strangest compliment I've ever given you?", "question_solo": "What's the strangest compliment your partner has ever given you?", "tone": "playful", "level": 2 },
  { "id": "spark_093", "question": "What's something I pretend not to care about but obviously care about a lot?", "question_solo": "What's something your partner pretends not to care about but obviously cares about a lot?", "tone": "playful", "level": 2 },
  { "id": "spark_094", "question": "What's the funniest misunderstanding we've ever had?", "question_solo": "What's the funniest misunderstanding you and your partner have ever had?", "tone": "playful", "level": 2 },
  { "id": "spark_095", "question": "What's a movie or show I convinced you to watch that you're actually glad about?", "question_solo": "What's a movie or show your partner convinced you to watch that you're actually glad about?", "tone": "playful", "level": 2 },
  { "id": "spark_096", "question": "What's the most extravagant response I've ever had to a minor inconvenience?", "question_solo": "What's the most extravagant response your partner has ever had to a minor inconvenience?", "tone": "playful", "level": 2 },
  { "id": "spark_097", "question": "What's a phrase I say so often it's become part of how you think?", "question_solo": "What's a phrase your partner says so often it's become part of how you think?", "tone": "playful", "level": 2 },
  { "id": "spark_098", "question": "What's something I taught you without meaning to?", "question_solo": "What's something your partner taught you without meaning to?", "tone": "playful", "level": 2 },
  { "id": "spark_099", "question": "What's the most spontaneous thing I've ever done?", "question_solo": "What's the most spontaneous thing your partner has ever done?", "tone": "playful", "level": 2 },
  { "id": "spark_100", "question": "What's a version of me from the past that you have a soft spot for?", "question_solo": "What's a version of your partner from the past that you have a soft spot for?", "tone": "playful", "level": 2 },
  { "id": "spark_101", "question": "What's something I do that you've never told me you love?", "question_solo": "What's something your partner does that you've never told them you love?", "tone": "spicy", "level": 1 },
  { "id": "spark_102", "question": "What's the most attractive I've ever looked to you, and what was I doing?", "question_solo": "What's the most attractive your partner has ever looked to you, and what were they doing?", "tone": "spicy", "level": 1 },
  { "id": "spark_103", "question": "What's a fantasy you've thought about but never brought up?", "question_solo": "What's a fantasy you've thought about but never brought up?", "tone": "spicy", "level": 2 },
  { "id": "spark_104", "question": "What's a way I could pursue you that I've never tried?", "question_solo": "What's a way your partner could pursue you that they've never tried?", "tone": "spicy", "level": 2 },
  { "id": "spark_105", "question": "What's the most turned on you've ever been by something I said?", "question_solo": "What's the most turned on you've ever been by something your partner said?", "tone": "spicy", "level": 2 },
  { "id": "spark_106", "question": "What's something you've always wanted to do with me that feels too risky to ask?", "question_solo": "What's something you've always wanted to do with your partner that feels too risky to ask?", "tone": "spicy", "level": 3 },
  { "id": "spark_107", "question": "What's the boldest thing you've ever done to get my attention?", "question_solo": "What's the boldest thing you've ever done to get your partner's attention?", "tone": "spicy", "level": 2 },
  { "id": "spark_108", "question": "What would a perfect night with me look like, no constraints, no judgment?", "question_solo": "What would a perfect night with your partner look like, no constraints, no judgment?", "tone": "spicy", "level": 2 },
  { "id": "spark_109", "question": "What's something about how I carry myself that you find unexpectedly attractive?", "question_solo": "What's something about how your partner carries themselves that you find unexpectedly attractive?", "tone": "spicy", "level": 1 },
  { "id": "spark_110", "question": "What's a moment you wanted to kiss me and didn't?", "question_solo": "What's a moment you wanted to kiss your partner and didn't?", "tone": "spicy", "level": 2 },
  { "id": "spark_111", "question": "What's something about our physical connection that you want more of?", "question_solo": "What's something about your physical connection with your partner that you want more of?", "tone": "spicy", "level": 3 },
  { "id": "spark_112", "question": "What's a compliment you've been holding back because it feels like too much?", "question_solo": "What's a compliment you've been holding back because it feels like too much?", "tone": "spicy", "level": 2 },
  { "id": "spark_113", "question": "What do you find attractive about me that you'd be embarrassed to say publicly?", "question_solo": "What do you find attractive about your partner that you'd be embarrassed to say publicly?", "tone": "spicy", "level": 2 },
  { "id": "spark_114", "question": "What's a place you've always wanted us to be together?", "question_solo": "What's a place you've always wanted to go with your partner?", "tone": "spicy", "level": 1 },
  { "id": "spark_115", "question": "What's the last thing I did that made you want to drop everything and be close to me?", "question_solo": "What's the last thing your partner did that made you want to drop everything and be close to them?", "tone": "spicy", "level": 2 },
  { "id": "spark_116", "question": "What's something you've been curious about trying but haven't brought up?", "question_solo": "What's something you've been curious about trying but haven't brought up?", "tone": "spicy", "level": 2 },
  { "id": "spark_117", "question": "What's a version of a date with me that you'd never suggest but would love?", "question_solo": "What's a version of a date with your partner that you'd never suggest but would love?", "tone": "spicy", "level": 2 },
  { "id": "spark_118", "question": "What's something I wear that does something to you?", "question_solo": "What's something your partner wears that does something to you?", "tone": "spicy", "level": 1 },
  { "id": "spark_119", "question": "What's the most charged moment between us that didn't go anywhere?", "question_solo": "What's the most charged moment between you and your partner that didn't go anywhere?", "tone": "spicy", "level": 2 },
  { "id": "spark_120", "question": "What's a secret you have that you think would genuinely surprise me?", "question_solo": "What's a secret you have that you think would genuinely surprise your partner?", "tone": "spicy", "level": 3 },
  { "id": "spark_121", "question": "What's a way you'd like me to be more bold with you?", "question_solo": "What's a way you'd like your partner to be more bold with you?", "tone": "spicy", "level": 2 },
  { "id": "spark_122", "question": "What's something you find irresistible about me that has nothing to do with looks?", "question_solo": "What's something you find irresistible about your partner that has nothing to do with looks?", "tone": "spicy", "level": 2 },
  { "id": "spark_123", "question": "What's the most daring thing you've ever considered doing to get my attention?", "question_solo": "What's the most daring thing you've ever considered doing to get your partner's attention?", "tone": "spicy", "level": 2 },
  { "id": "spark_124", "question": "What's a detail about me you notice that you've never mentioned?", "question_solo": "What's a detail about your partner you notice that you've never mentioned?", "tone": "spicy", "level": 1 },
  { "id": "spark_125", "question": "What's something from {partnerName}'s past that you think would surprise most people?", "question_solo": "What's something from your partner's past that you think would surprise most people?", "tone": "spicy", "level": 3 },
  { "id": "spark_126", "question": "What's a compliment about me you've given someone else that I've never heard?", "question_solo": "What's a compliment about your partner you've given someone else that they've never heard?", "tone": "spicy", "level": 2 },
  { "id": "spark_127", "question": "What's something you want to try that you've assumed I'd say no to?", "question_solo": "What's something you want to try that you've assumed your partner would say no to?", "tone": "spicy", "level": 3 },
  { "id": "spark_128", "question": "What's the most interesting thing you've thought about me in the last week?", "question_solo": "What's the most interesting thing you've thought about your partner in the last week?", "tone": "spicy", "level": 1 },
  { "id": "spark_129", "question": "What's a way I've gotten better over time that you've noticed but not said?", "question_solo": "What's a way your partner has gotten better over time that you've noticed but not said?", "tone": "spicy", "level": 2 },
  { "id": "spark_130", "question": "What's something about our dynamic that you find unexpectedly attractive?", "question_solo": "What's something about your dynamic with your partner that you find unexpectedly attractive?", "tone": "spicy", "level": 2 },
  { "id": "spark_131", "question": "What's something you want me to initiate more often?", "question_solo": "What's something you want your partner to initiate more often?", "tone": "spicy", "level": 2 },
  { "id": "spark_132", "question": "What's a scenario that sounds questionable on paper but would be great in practice?", "question_solo": "What's a scenario that sounds questionable on paper but would be great in practice?", "tone": "spicy", "level": 3 },
  { "id": "spark_133", "question": "What's something about how I look at you that you've noticed and liked?", "question_solo": "What's something about how your partner looks at you that you've noticed and liked?", "tone": "spicy", "level": 2 },
  { "id": "spark_134", "question": "What's a risk you want us to take together?", "question_solo": "What's a risk you want to take with your partner?", "tone": "spicy", "level": 2 },
  { "id": "spark_135", "question": "What's something you'd tell me to do if you knew I'd actually do it?", "question_solo": "What's something you'd tell your partner to do if you knew they'd actually do it?", "tone": "spicy", "level": 2 },
  { "id": "spark_136", "question": "What's a way I surprise you that I probably don't know about?", "question_solo": "What's a way your partner surprises you that they probably don't know about?", "tone": "spicy", "level": 2 },
  { "id": "spark_137", "question": "What's a piece of yourself you've never fully shown me?", "question_solo": "What's a piece of yourself you've never fully shown your partner?", "tone": "spicy", "level": 3 },
  { "id": "spark_138", "question": "What's something you've wanted to say to me in the middle of a moment but held back?", "question_solo": "What's something you've wanted to say to your partner in the middle of a moment but held back?", "tone": "spicy", "level": 3 },
  { "id": "spark_139", "question": "What's something from early in our relationship you want to recreate?", "question_solo": "What's something from early in your relationship you want to recreate?", "tone": "spicy", "level": 2 },
  { "id": "spark_140", "question": "What's a way you'd want me to show up for you that feels too vulnerable to ask for?", "question_solo": "What's a way you'd want your partner to show up for you that feels too vulnerable to ask for?", "tone": "spicy", "level": 3 },
  { "id": "spark_141", "question": "What's the most complicated feeling you've had about me?", "question_solo": "What's the most complicated feeling you've had about your partner?", "tone": "spicy", "level": 3 },
  { "id": "spark_142", "question": "What's an assumption you made about me that I've completely shattered?", "question_solo": "What's an assumption you made about your partner that they've completely shattered?", "tone": "spicy", "level": 2 },
  { "id": "spark_143", "question": "What's something you want us to do before the year is over?", "question_solo": "What's something you want to do with your partner before the year is over?", "tone": "spicy", "level": 1 },
  { "id": "spark_144", "question": "What's a way I've changed physically that you've noticed and haven't mentioned?", "question_solo": "What's a way your partner has changed physically that you've noticed and haven't mentioned?", "tone": "spicy", "level": 2 },
  { "id": "spark_145", "question": "What's the most surprising thing you find beautiful about me?", "question_solo": "What's the most surprising thing you find beautiful about your partner?", "tone": "spicy", "level": 1 },
  { "id": "spark_146", "question": "What's a version of spontaneous that you want us to be?", "question_solo": "What's a version of spontaneous you want to be with your partner?", "tone": "spicy", "level": 1 },
  { "id": "spark_147", "question": "What's something about me that gets more attractive the longer you know me?", "question_solo": "What's something about your partner that gets more attractive the longer you know them?", "tone": "spicy", "level": 2 },
  { "id": "spark_148", "question": "What's the most attractive thing I've done that I had no idea was attractive?", "question_solo": "What's the most attractive thing your partner has done that they had no idea was attractive?", "tone": "spicy", "level": 2 },
  { "id": "spark_149", "question": "What's something you want to ask me but keep deciding not to?", "question_solo": "What's something you want to ask your partner but keep deciding not to?", "tone": "spicy", "level": 3 },
  { "id": "spark_150", "question": "What's a line we haven't crossed that you've thought about?", "question_solo": "What's a line you and your partner haven't crossed that you've thought about?", "tone": "spicy", "level": 3 },
  { "id": "spark_151", "question": "What's something you want us to learn together in the next year?", "question_solo": "What's something you want to learn together with your partner in the next year?", "tone": "forward", "level": 1 },
  { "id": "spark_152", "question": "What's a place we haven't been that you think would change us?", "question_solo": "What's a place you and your partner haven't been that you think would change you?", "tone": "forward", "level": 1 },
  { "id": "spark_153", "question": "What's a version of our life in ten years that excites you most?", "question_solo": "What's a version of your life together in ten years that excites you most?", "tone": "forward", "level": 1 },
  { "id": "spark_154", "question": "What's a tradition you want us to start?", "question_solo": "What's a tradition you want to start with your partner?", "tone": "forward", "level": 1 },
  { "id": "spark_155", "question": "What's something you want to be able to say about us in five years?", "question_solo": "What's something you want to be able to say about you and your partner in five years?", "tone": "forward", "level": 2 },
  { "id": "spark_156", "question": "What's a dream you have for us that you've never said out loud?", "question_solo": "What's a dream you have for you and your partner that you've never said out loud?", "tone": "forward", "level": 2 },
  { "id": "spark_157", "question": "What's a skill you want to teach me someday?", "question_solo": "What's a skill you want to teach your partner someday?", "tone": "forward", "level": 1 },
  { "id": "spark_158", "question": "What's a season of life you're most looking forward to sharing with me?", "question_solo": "What's a season of life you're most looking forward to sharing with your partner?", "tone": "forward", "level": 1 },
  { "id": "spark_159", "question": "What's something you want us to build together that isn't a career or a family?", "question_solo": "What's something you want to build with your partner that isn't a career or a family?", "tone": "forward", "level": 2 },
  { "id": "spark_160", "question": "What's a version of Sunday mornings that you want us to eventually have?", "question_solo": "What's a version of Sunday mornings you want to eventually have with your partner?", "tone": "forward", "level": 1 },
  { "id": "spark_161", "question": "What's a place you want us to live, even if just for a year?", "question_solo": "What's a place you want to live with your partner, even if just for a year?", "tone": "forward", "level": 1 },
  { "id": "spark_162", "question": "What's something you want to be different about how we handle hard things?", "question_solo": "What's something you want to be different about how you and your partner handle hard things?", "tone": "forward", "level": 2 },
  { "id": "spark_163", "question": "What's a goal you have for yourself that you want me involved in?", "question_solo": "What's a goal you have for yourself that you want your partner involved in?", "tone": "forward", "level": 2 },
  { "id": "spark_164", "question": "What's something you're looking forward to doing when we're old?", "question_solo": "What's something you're looking forward to doing with your partner when you're both old?", "tone": "forward", "level": 1 },
  { "id": "spark_165", "question": "What's a chapter of our life you're most excited to get to?", "question_solo": "What's a chapter of your life together you're most excited to get to?", "tone": "forward", "level": 1 },
  { "id": "spark_166", "question": "What's a hobby you want us to share that we don't share yet?", "question_solo": "What's a hobby you want to share with your partner that you don't share yet?", "tone": "forward", "level": 1 },
  { "id": "spark_167", "question": "What's something we've been putting off that you want to prioritize this year?", "question_solo": "What's something you and your partner have been putting off that you want to prioritize this year?", "tone": "forward", "level": 2 },
  { "id": "spark_168", "question": "What's a version of us being generous together that you'd love to make real?", "question_solo": "What's a version of being generous together with your partner that you'd love to make real?", "tone": "forward", "level": 2 },
  { "id": "spark_169", "question": "What kind of home do you want us to have — not the space, but the feeling?", "question_solo": "What kind of home do you want to have with your partner — not the space, but the feeling?", "tone": "forward", "level": 1 },
  { "id": "spark_170", "question": "What's a conversation you want to have with me once we're through something hard?", "question_solo": "What's a conversation you want to have with your partner once you're through something hard?", "tone": "forward", "level": 3 },
  { "id": "spark_171", "question": "What's something you want us to have figured out by the time we're 60?", "question_solo": "What's something you want to have figured out with your partner by the time you're 60?", "tone": "forward", "level": 2 },
  { "id": "spark_172", "question": "What's a way you want to grow as a couple in the next two years?", "question_solo": "What's a way you want to grow with your partner in the next two years?", "tone": "forward", "level": 2 },
  { "id": "spark_173", "question": "What's a risk you want us to take together before the decade is over?", "question_solo": "What's a risk you want to take with your partner before the decade is over?", "tone": "forward", "level": 2 },
  { "id": "spark_174", "question": "What's something you want us to protect no matter what life throws at us?", "question_solo": "What's something you want to protect with your partner no matter what life throws at you?", "tone": "forward", "level": 2 },
  { "id": "spark_175", "question": "What's a way you'd love to spend our time that you haven't asked for?", "question_solo": "What's a way you'd love to spend time with your partner that you haven't asked for?", "tone": "forward", "level": 2 },
  { "id": "spark_176", "question": "What's a person you want us to be around more?", "question_solo": "What's a person you want you and your partner to be around more?", "tone": "forward", "level": 2 },
  { "id": "spark_177", "question": "What's a memory you want to make with me this year?", "question_solo": "What's a memory you want to make with your partner this year?", "tone": "forward", "level": 1 },
  { "id": "spark_178", "question": "What's a way you want to show up for the world together?", "question_solo": "What's a way you want to show up for the world with your partner?", "tone": "forward", "level": 2 },
  { "id": "spark_179", "question": "What's something you want to be able to say I taught you?", "question_solo": "What's something you want to be able to say your partner taught you?", "tone": "forward", "level": 2 },
  { "id": "spark_180", "question": "What's a way you hope our relationship will surprise us?", "question_solo": "What's a way you hope your relationship will surprise you?", "tone": "forward", "level": 2 },
  { "id": "spark_181", "question": "What's a decision we've been delaying that you think we should finally make?", "question_solo": "What's a decision you and your partner have been delaying that you think you should finally make?", "tone": "forward", "level": 3 },
  { "id": "spark_182", "question": "What's a version of our relationship that feels just out of reach right now?", "question_solo": "What's a version of your relationship that feels just out of reach right now?", "tone": "forward", "level": 3 },
  { "id": "spark_183", "question": "What's something you want to be true about us in year twenty?", "question_solo": "What's something you want to be true about you and your partner in year twenty?", "tone": "forward", "level": 2 },
  { "id": "spark_184", "question": "What's a value you want at the center of how we build our life?", "question_solo": "What's a value you want at the center of how you and your partner build your life?", "tone": "forward", "level": 1 },
  { "id": "spark_185", "question": "What's a way you want to get better at loving me?", "question_solo": "What's a way you want to get better at loving your partner?", "tone": "forward", "level": 3 },
  { "id": "spark_186", "question": "What's something you want our relationship to model for other people?", "question_solo": "What's something you want your relationship to model for other people?", "tone": "forward", "level": 2 },
  { "id": "spark_187", "question": "What's a version of adventure you want us to have before we settle into routine?", "question_solo": "What's a version of adventure you want to have with your partner before you settle into routine?", "tone": "forward", "level": 1 },
  { "id": "spark_188", "question": "What's a fear you want us to face together?", "question_solo": "What's a fear you want to face together with your partner?", "tone": "forward", "level": 2 },
  { "id": "spark_189", "question": "What's something you want us to be braver about?", "question_solo": "What's something you want you and your partner to be braver about?", "tone": "forward", "level": 2 },
  { "id": "spark_190", "question": "What's a way you want to celebrate us that we haven't done yet?", "question_solo": "What's a way you want to celebrate you and your partner that you haven't done yet?", "tone": "forward", "level": 2 },
  { "id": "spark_191", "question": "What's a project you want to take on together that seems too ambitious?", "question_solo": "What's a project you want to take on with your partner that seems too ambitious?", "tone": "forward", "level": 2 },
  { "id": "spark_192", "question": "What's something you want more of and something you want less of next year?", "question_solo": "What's something you want more of and something you want less of next year?", "tone": "forward", "level": 2 },
  { "id": "spark_193", "question": "What's a version of how we handle money together that you want to eventually reach?", "question_solo": "What's a version of how you and your partner handle money that you want to eventually reach?", "tone": "forward", "level": 3 },
  { "id": "spark_194", "question": "What's a life you could imagine us building somewhere completely different?", "question_solo": "What's a life you could imagine building with your partner somewhere completely different?", "tone": "forward", "level": 2 },
  { "id": "spark_195", "question": "What's something you hope we never stop doing?", "question_solo": "What's something you hope you and your partner never stop doing?", "tone": "forward", "level": 2 },
  { "id": "spark_196", "question": "What's a way you want to invest in us when things are good, not just when they're hard?", "question_solo": "What's a way you want to invest in your relationship when things are good, not just when they're hard?", "tone": "forward", "level": 2 },
  { "id": "spark_197", "question": "What's a future version of our daily life that sounds quietly perfect?", "question_solo": "What's a future version of your daily life with your partner that sounds quietly perfect?", "tone": "forward", "level": 1 },
  { "id": "spark_198", "question": "What's something you want to be able to say we stood for, as a couple?", "question_solo": "What's something you want to be able to say you and your partner stood for?", "tone": "forward", "level": 2 },
  { "id": "spark_199", "question": "What's a gift you want to give this relationship in the next year?", "question_solo": "What's a gift you want to give your relationship in the next year?", "tone": "forward", "level": 2 },
  { "id": "spark_200", "question": "What's the most important thing you want to build with me?", "question_solo": "What's the most important thing you want to build with your partner?", "tone": "forward", "level": 2 },
]

export function getSparkQuestion({ coupleAgeDays, skipCount, usedIds = [], forceLevel }) {
  function buildPool(ignoreUsed) {
    let pool = SPARK_QUESTIONS

    // Level filtering
    if (forceLevel) {
      pool = pool.filter(q => q.level === forceLevel)
    } else if (skipCount >= 2) {
      pool = pool.filter(q => q.level === 1)
    } else if (skipCount === 1) {
      pool = pool.filter(q => q.level <= 2)
    } else {
      // skipCount === 0
      if (coupleAgeDays < 14) {
        pool = pool.filter(q => q.level === 1)
      } else if (coupleAgeDays < 30) {
        pool = pool.filter(q => q.level <= 2)
      }
      // coupleAgeDays >= 30: all levels eligible
    }

    // Tone filtering
    if (skipCount >= 2) {
      pool = pool.filter(q => q.tone === 'playful')
    } else if (skipCount === 1) {
      pool = pool.filter(q => q.tone === 'playful' || q.tone === 'forward')
    } else {
      // skipCount === 0: filter spicy if coupleAgeDays < 30
      if (coupleAgeDays < 30) {
        pool = pool.filter(q => q.tone !== 'spicy')
      }
    }

    // Exclude used ids unless ignoreUsed
    if (!ignoreUsed) {
      pool = pool.filter(q => !usedIds.includes(q.id))
    }

    return pool
  }

  let pool = buildPool(false)

  // If pool is empty (all used), retry ignoring usedIds
  if (pool.length === 0) {
    pool = buildPool(true)
  }

  return pool[Math.floor(Math.random() * pool.length)]
}
