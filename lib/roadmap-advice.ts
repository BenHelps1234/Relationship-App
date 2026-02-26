export type RoadmapCategory = 'physicality' | 'resources' | 'safety' | 'reliability';
export type AdviceGender = 'male' | 'female' | 'both';

export type RoadmapAdviceBucket = {
  id: string;
  category: RoadmapCategory;
  gender: AdviceGender;
  title: string;
  body: string;
};

export const ROADMAP_ADVICE_BUCKETS: RoadmapAdviceBucket[] = [
  {
    id: 'physicality_male_photos',
    category: 'physicality',
    gender: 'male',
    title: 'Your Photos Are Losing You Matches Before You Say a Word',
    body: "Research consistently shows women decide on a profile within seconds and photos are the primary driver. Your main photo should be a clean, well-lit headshot where your face is clearly visible - no sunglasses, no group shots, no hats pulled low. Add at least one full-body photo and one photo showing you doing something you care about. Smiling in at least one photo is not optional - studies show genuine smiles significantly increase perceived trustworthiness and approachability."
  },
  {
    id: 'physicality_male_fitness',
    category: 'physicality',
    gender: 'male',
    title: 'Physical Fitness Signals More Than Just Health',
    body: 'Women are evolutionarily attuned to physical fitness as a proxy for health, discipline, and protective capacity. You do not need to be exceptional - you need to be visibly consistent. Resistance training three times per week produces visible changes within 8-12 weeks that meaningfully improve how your photos read. Posture is free and immediate - shoulders back, chin level, standing tall changes how you photograph and how you present in person.'
  },
  {
    id: 'physicality_male_grooming',
    category: 'physicality',
    gender: 'male',
    title: 'Grooming Is the Lowest Effort, Highest Return Investment You Can Make',
    body: 'A clean, intentional appearance signals self-respect and the capacity to take care of others. Get a haircut that suits your face shape from an actual barber, not a discount chain. Maintain facial hair - fully grown or fully clean, never neglected stubble. Clean, fitted clothing matters more than expensive clothing. Women notice shoes - they should be clean and in good condition.'
  },
  {
    id: 'physicality_male_style',
    category: 'physicality',
    gender: 'male',
    title: 'Dress Like Someone Who Has Already Arrived',
    body: 'Style is a legible signal of status and self-awareness. You do not need an expensive wardrobe - you need a coherent one. Wear clothes that fit your current body, not the body you plan to have. Neutral colors (navy, grey, white, black, olive) are easy to combine and photograph well. One well-fitting blazer or structured jacket will elevate nearly any outfit and is worth the investment.'
  },
  {
    id: 'physicality_male_presence',
    category: 'physicality',
    gender: 'male',
    title: 'How You Carry Yourself Is Part of Your Profile',
    body: 'Physical presence extends beyond photos into video dates and first meetings. Men who move deliberately and occupy space comfortably are perceived as higher status across multiple studies. Slow down your movements, make deliberate eye contact, and resist the urge to fill silence. Voice matters - speaking from your chest rather than your throat projects calm confidence. These are trainable skills, not fixed traits.'
  },

  {
    id: 'resources_male_career',
    category: 'resources',
    gender: 'male',
    title: 'Women Are Not Shallow for Caring About Stability - Encode It Clearly',
    body: 'Hypergamy is real and well-documented - women are broadly attracted to men who meet or exceed their own status level. This does not mean you need to be wealthy. It means your profile should communicate direction and momentum. Name your field or role clearly. If you are building toward something, say so specifically. Vague bios read as either unemployed or unambitious - neither is attractive.'
  },
  {
    id: 'resources_male_ambition',
    category: 'resources',
    gender: 'male',
    title: 'Ambition Is Attractive. Communicate Yours Explicitly.',
    body: 'Research on mate preference consistently ranks ambition and industriousness among the top traits women seek in long-term partners. Your profile should answer the implicit question: where is this man going? One concrete sentence about what you are building, working toward, or committed to does more work than three sentences of generic personality descriptors. Avoid humble-bragging - state it plainly.'
  },
  {
    id: 'resources_male_provider',
    category: 'resources',
    gender: 'male',
    title: 'The Provider Signal Is Not About Money - It Is About Capacity',
    body: "Women are wired to assess whether a man could provide stability for a family even when they are not consciously thinking about children. This signal is communicated through behavior as much as income - do you plan ahead, follow through, handle logistics, show up on time? In your profile and early conversations, demonstrate these capacities naturally. Suggesting a specific plan for a first date rather than asking 'what do you want to do' is a simple example that reads as high-capacity."
  },
  {
    id: 'resources_male_financial',
    category: 'resources',
    gender: 'male',
    title: 'Financial Chaos Is a Red Flag. Basic Order Is a Green One.',
    body: 'You do not need to be rich to signal financial competence - you need to signal that you are not a liability. Avoid any language in your profile or early conversations that signals financial instability, victimhood around money, or dependency. If you are actively improving your financial situation, frame it as building - not struggling. Long-term partners are evaluating whether you are someone they could build a life with, and financial behavior is a major input to that assessment.'
  },
  {
    id: 'resources_male_lifestyle',
    category: 'resources',
    gender: 'male',
    title: 'Your Lifestyle Should Be Visible in Your Profile',
    body: 'Lifestyle signals resources and experiences indirectly. Photos that show you traveling, engaged in interesting activities, or in varied environments communicate a fuller life than headshots alone. You do not need an expensive lifestyle - you need an intentional one. Even local experiences, hobbies, and social environments make for more compelling profiles than studio-style photos with no context.'
  },

  {
    id: 'safety_male_emotional',
    category: 'safety',
    gender: 'male',
    title: 'Emotional Stability Is the Most Underrated Attraction Multiplier for Men',
    body: "Women's primary safety concern in a partner is psychological - will this man be predictable, regulated, and safe to be vulnerable with? Profiles and early conversations that signal emotional reactivity, bitterness toward women or exes, or instability are disqualifying regardless of other qualities. Write your bio from a grounded, forward-looking frame. Never mention exes, relationship failures, or what you are 'not looking for' - these are red flags that signal unresolved emotional baggage."
  },
  {
    id: 'safety_male_consistency',
    category: 'safety',
    gender: 'male',
    title: 'Consistency Is How You Signal Safety Before She Knows You',
    body: 'Safety is built through pattern recognition - women are assessing whether your behavior is predictable and reliable from the first interaction. Respond within reasonable timeframes, do what you say you will do, and follow through on small commitments like suggesting a specific day for a date. Inconsistent communication patterns early on are correctly read as a preview of inconsistent behavior in a relationship.'
  },
  {
    id: 'safety_male_boundaries',
    category: 'safety',
    gender: 'male',
    title: 'Healthy Boundaries Signal Strength, Not Coldness',
    body: 'Men who have no boundaries or who immediately accommodate every preference signal low self-respect, which paradoxically reduces the sense of safety a woman feels. A man who knows what he wants, expresses preferences, and maintains them respectfully communicates that he is a stable entity to build something with. This is distinct from rigidity - it is the difference between a man with a spine and a man who is controlling.'
  },
  {
    id: 'safety_male_social',
    category: 'safety',
    gender: 'male',
    title: 'Social Proof Is a Safety Signal - Use It',
    body: 'Being visibly embedded in a social world - friends, family, community - tells a woman that other people have vetted you and found you trustworthy. Include at least one photo with friends or in a social setting. References to relationships with family or long-term friendships in your bio signal social stability. Lone-wolf framing, even when intended as independent, often reads as socially isolated which is a safety concern.'
  },
  {
    id: 'safety_male_communication',
    category: 'safety',
    gender: 'male',
    title: 'How You Communicate Early Predicts How You Will Communicate Always',
    body: 'Women are evaluating communication patterns from the first message. Messages that are overly intense, immediately sexual, or that ignore what she has written signal poor emotional calibration. Ask genuine questions, reference what she has shared, and match her investment level in early exchanges. The goal in early messaging is not to impress - it is to demonstrate that you are safe to open up to.'
  },
  {
    id: 'safety_male_kindness',
    category: 'safety',
    gender: 'male',
    title: 'Kindness Is the #1 Trait Women Are Actually Selecting For',
    body: 'Across the largest cross-cultural studies on female mate preference, kindness consistently ranks above physical attractiveness, financial status, and ambition as the most desired trait in a long-term partner. This does not mean being a pushover - it means being genuinely considerate, remembering details, following through on small gestures, and treating people around you well. Women are watching how you treat waitstaff, talk about your family, and respond when things go wrong. Kindness is not soft - it is the primary trust signal that determines whether a woman feels safe building a life with you.'
  },
  {
    id: 'safety_male_humor',
    category: 'safety',
    gender: 'male',
    title: 'Humor Is a Cognitive Signal, Not Just Entertainment',
    body: "Research classifies humor as an honest signal of intelligence, creativity, and social calibration - qualities that are hard to fake consistently. Women are not just looking for someone funny; they are filtering for someone whose mind works well and who can handle adversity lightly. Self-deprecating humor that doesn't slide into self-pity, the ability to make her laugh without trying too hard, and wit in conversation are all trainable. Start by being more present and observational in conversations rather than rehearsing jokes."
  },

  {
    id: 'reliability_male_followthrough',
    category: 'reliability',
    gender: 'male',
    title: 'Follow-Through Is Rare and Extremely Attractive',
    body: 'Most men say they will do things and do not do them. In early dating this manifests as vague plans that never materialize, messages that trail off, and dates that are suggested but never confirmed. Be the man who names a specific day, suggests a specific place, and confirms 24 hours before. This alone puts you ahead of the majority of your competition and directly signals the kind of partner you will be long-term.'
  },
  {
    id: 'reliability_male_response',
    category: 'reliability',
    gender: 'male',
    title: 'Your Response Behavior Is Being Evaluated From Message One',
    body: 'Reliability score on this platform is a direct measure of response behavior and it feeds your MPS. Beyond the platform, women are watching whether you respond, how long you take, and whether your responses match the energy of the conversation. You do not need to be available instantly - you need to be consistent. A predictable response pattern is more reassuring than an erratic one even if the average response time is longer.'
  },
  {
    id: 'reliability_male_presence',
    category: 'reliability',
    gender: 'male',
    title: 'Being Present in Conversation Is a Differentiator',
    body: 'Many men treat early dating conversations as a checkbox - they respond but do not actually engage. Reading what she wrote, referencing it, asking follow-up questions, and demonstrating that you were actually paying attention is surprisingly rare and noticed immediately. Presence in conversation is a preview of presence in a relationship - women are making exactly that inference.'
  },
  {
    id: 'reliability_male_honesty',
    category: 'reliability',
    gender: 'male',
    title: 'Profile Honesty Has a Direct Impact on Match Quality',
    body: 'Misrepresenting yourself in photos or bio produces matches with women who are attracted to someone you are not, which wastes both parties\' time and damages your reliability score when reality does not match expectation. Use recent photos, represent your lifestyle accurately, and be honest about what you are looking for. The right matches from an honest profile are worth more than more matches from a misleading one.'
  },
  {
    id: 'reliability_male_completion',
    category: 'reliability',
    gender: 'male',
    title: 'An Incomplete Profile Signals Low Effort and Low Seriousness',
    body: 'Profile completion is directly correlated with match rate and is one of the simplest things you can control. Fill out every prompt, write a bio that is more than two sentences, and upload at least three photos. A sparse profile tells the market you are either not serious or not willing to invest effort - neither is attractive. Treat your profile as the first impression you will ever make with every person who sees it.'
  },

  {
    id: 'physicality_female_photos',
    category: 'physicality',
    gender: 'female',
    title: 'Your Primary Photo Is Your Market Price Signal',
    body: 'Men are predominantly visual and make initial decisions faster than women - your primary photo is doing the majority of your marketing. Use a photo where your face is clearly visible, well-lit, and you are smiling genuinely. Avoid heavy filters, extreme angles, and group photos as your main image. A clean, bright, naturally flattering photo will outperform an artificially enhanced one because it also signals honesty, which matters to men evaluating long-term potential.'
  },
  {
    id: 'physicality_female_presentation',
    category: 'physicality',
    gender: 'female',
    title: 'Presentation Communicates Self-Respect and Femininity',
    body: 'Men are attracted to femininity as a signal - soft colors, well-kept hair, and clothes that are flattering rather than just fashionable photograph well and communicate care in presentation. This is not about conforming to a narrow standard - it is about signaling that you invest in yourself. A woman who presents herself well signals that she will bring that same care to a relationship and a home.'
  },
  {
    id: 'physicality_female_fitness',
    category: 'physicality',
    gender: 'female',
    title: 'Health Markers Are Attraction Signals - Invest in Them',
    body: 'Men are evolutionarily attuned to health indicators including clear skin, healthy weight, and physical vitality as proxies for reproductive fitness. Regular exercise, adequate sleep, and basic nutrition produce visible changes that improve how you photograph and how you present in person. This is not about achieving a specific body type - it is about signaling health and energy, which are universally attractive.'
  },
  {
    id: 'physicality_female_variety',
    category: 'physicality',
    gender: 'female',
    title: 'Photo Variety Tells a Richer Story',
    body: 'A profile with multiple photos showing different sides of your life - social, active, dressed up, casual - gives a man more to connect with and more confidence that your profile is authentic. Include a full-body photo, at least one social photo, and one that shows you doing something you enjoy. Profiles with only face-forward selfies read as either insecure or misleading about the full picture.'
  },
  {
    id: 'physicality_female_authenticity',
    category: 'physicality',
    gender: 'female',
    title: 'Authenticity in Photos Outperforms Perfection',
    body: 'Heavy editing and extreme curation creates a mismatch between your profile and reality that damages trust on a first meeting. Men who are looking for long-term partners are specifically filtering for authenticity - they want to know who they are actually meeting. A genuinely warm, natural photo will attract higher-intent men than a heavily filtered one that attracts men responding to an image rather than a person.'
  },

  {
    id: 'resources_female_independence',
    category: 'resources',
    gender: 'female',
    title: 'Independence Is Attractive - Dependency Is a Liability Signal',
    body: 'High-quality men are looking for a partner, not a dependent. Your profile should signal that you have a life, interests, and direction of your own. Women who communicate that they are looking for a man to complete them or provide their primary sense of purpose are less attractive to emotionally healthy, high-functioning men. Communicate what you bring to a partnership, not just what you are looking for in one.'
  },
  {
    id: 'resources_female_ambition',
    category: 'resources',
    gender: 'female',
    title: 'Communicate Your Drive Without Signaling Unavailability',
    body: "Ambition is attractive in women to high-quality men - it signals health, intelligence, and self-sufficiency. The nuance is framing: communicate your drive in terms of passion and purpose rather than competition or busyness. Men who are looking for a long-term partner are also assessing whether you have bandwidth for a relationship. 'I love what I do and I make time for what matters' is more attractive than 'I'm always working.'"
  },
  {
    id: 'resources_female_lifestyle',
    category: 'resources',
    gender: 'female',
    title: 'Show a Life Worth Joining',
    body: 'Your profile should communicate that your life is full, interesting, and positive - and that you are inviting someone into it rather than looking for someone to fill a void. Photos and bio content that show varied experiences, friendships, interests, and engagement with the world are more attractive than profiles focused primarily on what you are looking for in a partner. Men are evaluating whether your life is one they want to be part of.'
  },
  {
    id: 'resources_female_standards',
    category: 'resources',
    gender: 'female',
    title: 'Communicate Standards Without Communicating Hostility',
    body: "Having standards is attractive - it signals self-worth and filters for higher-quality matches. Communicating them as a list of demands or negative requirements ('no hookups,' 'don't bother if you can't hold a conversation') signals defensiveness and past negative experiences, which is a liability signal. Instead communicate what you value positively - 'looking for someone who is building something' says the same thing as 'no lazy men' without the hostility."
  },
  {
    id: 'resources_female_contribution',
    category: 'resources',
    gender: 'female',
    title: 'Signal What You Bring, Not Just What You Want',
    body: 'Profiles that are entirely focused on screening criteria and desired partner qualities read as transactional and one-sided. Balance your profile by communicating what you bring to a relationship - your warmth, loyalty, humor, curiosity, care. Men who are evaluating long-term potential are asking whether you are someone they want to invest in. Give them a clear, positive answer.'
  },

  {
    id: 'safety_female_warmth',
    category: 'safety',
    gender: 'female',
    title: 'Warmth Is a Primary Long-Term Attraction Signal for Men',
    body: 'Research on male mate preference consistently places kindness and warmth at the top of desired long-term partner traits. A bio that reads as cold, guarded, or cynical - even if intended as witty - filters out exactly the men you want. Let genuine warmth come through in your writing. Reference things you care about, people you love, experiences that light you up. Men who want a life partner are looking for someone safe to come home to.'
  },
  {
    id: 'safety_female_positivity',
    category: 'safety',
    gender: 'female',
    title: 'Profile Tone Is a Preview of Daily Experience',
    body: 'Men are making an implicit assessment of what daily life with you would feel like. Profiles that lead with complaints, dealbreakers, or cynicism about dating signal that the daily experience will be negative. Lead with what you love, what excites you, and what you are building. Positivity is not naivety - it is a signal that you are someone who adds energy to a life rather than draining it.'
  },
  {
    id: 'safety_female_emotional',
    category: 'safety',
    gender: 'female',
    title: 'Emotional Availability Signals Readiness for Partnership',
    body: 'Profiles that signal emotional unavailability - through ironic detachment, heavily guarded language, or explicit statements about not wanting anything serious - attract men who match that energy, which is rarely who you actually want. If you are ready for a real relationship, let your profile reflect that openness. Vulnerability in a profile is not weakness - it is an invitation to the right person.'
  },
  {
    id: 'safety_female_drama',
    category: 'safety',
    gender: 'female',
    title: 'Low-Drama Signals Are Extremely High Value',
    body: 'Men who have been in difficult relationships are specifically filtering for emotional stability and low conflict. Any language in your profile that hints at high maintenance, past drama, or emotional volatility is disqualifying to this cohort - which includes many of the highest-quality men on the market. Keep your bio grounded, forward-looking, and free of references to past relationship failures or warnings to potential matches.'
  },
  {
    id: 'safety_female_consistency',
    category: 'safety',
    gender: 'female',
    title: 'Consistent Engagement Signals Emotional Reliability',
    body: 'Your reliability score reflects your response and engagement behavior on the platform and it feeds your MPS directly. Beyond the score, men are watching whether you respond, whether you follow through on conversations, and whether your behavior is predictable. Disappearing mid-conversation, slow-fading, or inconsistent engagement signals emotional unavailability which is a strong filter for high-intent men seeking a stable partner.'
  },
  {
    id: 'safety_female_humor',
    category: 'safety',
    gender: 'female',
    title: 'Playfulness and Warmth Together Are Extremely Attractive to High-Quality Men',
    body: 'Men are not just evaluating whether you are attractive - they are evaluating whether being around you feels good. A woman who is warm, genuinely funny, and easy to be around is rare and highly valued. Playfulness signals low stress, social confidence, and the promise of an enjoyable daily life. You do not need to be a comedian - you need to not take yourself so seriously that there is no room for lightness. Let humor come through naturally in your bio and early conversations rather than presenting a polished but flat version of yourself.'
  },
  {
    id: 'safety_female_kindness',
    category: 'safety',
    gender: 'female',
    title: 'Men Are Filtering for Kindness Too - Especially High-Quality Men',
    body: 'Emotionally healthy men who are ready for a real partnership are specifically looking for a woman who is kind - to them, to others, and to herself. Profiles and early conversations that signal judgment, contempt, or cruelty (even toward easy targets like bad exes) are disqualifying to this cohort. Let genuine warmth and generosity of spirit come through in how you write and how you engage. A woman who makes people feel good to be around is one of the highest-value signals on the long-term partner market.'
  },

  {
    id: 'reliability_female_response',
    category: 'reliability',
    gender: 'female',
    title: 'Response Behavior Is Your Reliability Signal',
    body: 'Your reliability score is built from how consistently and promptly you engage with matches. Men who are serious about finding a partner are specifically looking for women who are equally serious - and response behavior is the most legible early signal of that. You do not need to respond instantly but you need to be consistent. Patterns of slow or dropped responses filter you out of consideration for the most intentional men on the platform.'
  },
  {
    id: 'reliability_female_intention',
    category: 'reliability',
    gender: 'female',
    title: 'Signal Your Intention Clearly and Early',
    body: "Ambiguity about what you are looking for wastes both parties' time and reduces match quality. If you are looking for a serious relationship, say so clearly in your profile. Men who are also looking for something serious will self-select in, and men who are not will self-select out - this is the intended function of a transparent market. Clarity is not desperation. It is efficiency."
  },
  {
    id: 'reliability_female_followthrough',
    category: 'reliability',
    gender: 'female',
    title: 'Follow Through on What You Signal',
    body: 'Reliability is demonstrated through the alignment between what you communicate and what you do. If you express interest in meeting, move toward it. If you ask questions, engage with the answers. If you say you are looking for something serious, behave consistently with that. Men who have been strung along before are watching for the gap between stated intention and actual behavior - close that gap and you become immediately more attractive to high-intent matches.'
  },
  {
    id: 'reliability_female_honesty',
    category: 'reliability',
    gender: 'female',
    title: 'Profile Honesty Filters for Better Matches',
    body: 'Using heavily edited photos, misrepresenting your lifestyle, or signaling a personality in your profile that does not reflect reality produces matches built on a false premise. The mismatch on a first meeting damages trust and wastes your time. Men who are looking for long-term partners are specifically trying to find someone real - give them an accurate target and you will attract men who are attracted to the actual you.'
  },
  {
    id: 'reliability_female_completion',
    category: 'reliability',
    gender: 'female',
    title: 'A Complete Profile Signals You Are Serious',
    body: 'Profile completion is one of the simplest signals of intent and one of the most overlooked. Fill out every prompt thoughtfully, write a bio that goes beyond surface-level descriptors, and upload a variety of photos. A sparse or incomplete profile signals either low seriousness or low self-awareness - neither attracts the kind of man who is genuinely ready for a relationship. Your profile is your market presence - invest in it accordingly.'
  }
];

export const ROADMAP_ADVICE_BY_ID = new Map<string, RoadmapAdviceBucket>(
  ROADMAP_ADVICE_BUCKETS.map((bucket) => [bucket.id, bucket])
);

export const ROADMAP_ADVICE_IDS = ROADMAP_ADVICE_BUCKETS.map((bucket) => bucket.id);
