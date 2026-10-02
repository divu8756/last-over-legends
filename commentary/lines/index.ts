/**
 * Bhaskar's line bank. Placeholders: {name} batter, {bowler}, {team},
 * {opp}, {need} runs needed, {balls} balls left, {runs} team score.
 */
export type Lang = "hi" | "en";

export type CommentaryEvent =
  | "start"
  | "six"
  | "four"
  | "single"
  | "runs"
  | "dot"
  | "leave"
  | "edgeSafe"
  | "edgeFour"
  | "dropped"
  | "save"
  | "bowled"
  | "lbw"
  | "caught"
  | "caughtBehind"
  | "wide"
  | "noball"
  | "finalOver"
  | "lastBall"
  | "hotStreak"
  | "win"
  | "loss"
  | "tie";

export const LINES: Record<CommentaryEvent, string[]> = {
  start: [
    "Welcome to a night of pure madness! {team} need {need} off {balls}. Fasten your seatbelts!",
    "The floodlights are blazing, the crowd is roaring, and {name} walks out with {need} to get!",
    "{need} needed off {balls}. Simple maths, impossible nerves. Let's go!",
    "Namaste and good evening! This is Bhaskar, and my blood pressure is already rising!",
    "{team} versus {opp}. {need} to win. Somebody please hold my microphone steady!",
    "The ground is full, the drums are beating, and {name} is taking guard. Here we go!",
    "If you are just joining us, sit down, hold tight, and do not go to the kitchen!",
    "{bowler} has the ball, {name} has the bat, and I have no fingernails left already!",
  ],
  six: [
    "Oh my goodness, {name}! That ball has applied for a passport and left the country!",
    "Up, up and AWAY! Somebody inform the airport, we have unscheduled traffic!",
    "That has gone into the next postcode, and the postcode after that!",
    "SIX! Into the second tier! The crowd is catching it like it is prasad!",
    "Massive! {bowler} is looking at the sky like he lost his kite!",
    "That is not a cricket shot, that is a satellite launch! SIX!",
    "Boom! {name} has hit that so hard the ball is filing a complaint!",
    "Out of the ground! We will need a new ball and maybe a new bowler!",
    "Swing of the bat, and the ball is on its holidays! SIX more! {need} needed now!",
    "Into the night sky! Even the moon ducked for that one!",
    "Clean as a whistle, high as a kite! SIX!",
    "That one has gone to visit the parking lot! Check your windscreens!",
    "Smoked! {name} has sent that into orbit! {need} off {balls}!",
    "Maximum! The DJ is pressing every button at once!",
    "Over the rope with room to spare! Pure, beautiful violence!",
  ],
  four: [
    "Like a hot knife through monsoon butter! Four runs, and the fielder is still thinking about it!",
    "Threaded through the gap like grandmother's needle! FOUR!",
    "Crack! Racing away to the rope! The fielder is chasing a ghost!",
    "Four! Timed so sweetly I want to put it in my chai!",
    "Bisected the field like a geometry teacher! Four runs!",
    "That raced away faster than my uncle at a buffet! FOUR!",
    "Beautiful! Pure timing, zero effort, four runs! {need} off {balls} now!",
    "All along the carpet, all the way to the fence! Lovely stuff from {name}!",
    "Cracking shot! The ball reached the rope before the fielder finished blinking!",
    "Pierced the field! Four glorious runs!",
    "Cover drive from heaven! Pin that on the wall!",
    "FOUR! The ball is kissing the advertising boards!",
  ],
  single: [
    "Just a nudge and a scamper. {need} needed off {balls}. Every run is gold dust now!",
    "Tucked away for one. Smart cricket, keeps the scoreboard ticking!",
    "A quick single! Running between the wickets like they stole something!",
    "One run. Not glamorous, but my grandmother always said, little drops make an ocean!",
    "Dabbed and gone! One more to the total. {need} to get.",
    "Push and run! The fielder is half asleep, the batters are wide awake!",
    "Single taken. Strike rotated. The chess game continues!",
    "Tip and run! Very sensible from {name}!",
    "One more! {need} needed off {balls}. Keep calm and keep ticking!",
    "Worked off the pads for a single. Neat and tidy!",
  ],
  runs: [
    "They are coming back for the second! Brilliant running! {need} off {balls}!",
    "Into the gap and they will scamper two! The legs are burning, but who cares!",
    "Placed beautifully, and that is a couple more! The equation shrinks!",
    "Hard running! The fielder fumbles, and they steal an extra! Cheeky, very cheeky!",
    "Two runs, and the batters are puffing like a steam engine at Howrah!",
    "Good shot, great running! {need} needed off {balls} now!",
    "Pushed into the deep and they hare back for two! Wonderful!",
    "Two more! The fielders are sweating, the batters are flying!",
  ],
  dot: [
    "Nothing! The bowler wins that little battle, and the crowd holds its breath…",
    "Swing and a prayer, and the prayer goes unanswered!",
    "Dot ball! {bowler} is smiling like he found money in his old jeans!",
    "Beaten! Pure magic from {bowler}. {need} off {balls} now!",
    "Defended back. Silence. You could hear a samosa drop in this stadium!",
    "No run! The pressure cooker is whistling now, my friends!",
    "Missed it! {name} looks at the bat like it betrayed him!",
    "Straight to the fielder. Dot ball. The required rate is climbing a mountain!",
    "Yorker on the toes, dug out! No run!",
    "Played and missed! The ball whispered something rude as it went past!",
    "Dot! {bowler} is squeezing this chase like a lemon!",
    "Nothing doing! The scoreboard is frozen like my freezer!",
  ],
  leave: [
    "Left alone! Confident or crazy, we will find out soon enough!",
    "Shoulders arms! {name} lets that go, but the clock is ticking!",
    "No shot offered. Very calm. Too calm? {need} off {balls}!",
    "Watched it go past like a train he did not want to catch!",
    "Let it go! Watching, waiting, wondering!",
    "Not interested in that one! {name} is saving his energy!",
  ],
  edgeSafe: [
    "Off the edge! It flies, it flies, and it falls safe! The cricket gods are smiling tonight!",
    "Thick edge, and it squirts away! Ugly, but runs are runs!",
    "Edged and safe! {name} owes someone up there a coconut!",
    "Outside edge, through the vacant slip! Lucky, lucky boy!",
    "Inside edge, past the stumps! Missed the woodwork by the width of a hair!",
    "Edged, but it drops short! {name} breathes again!",
  ],
  edgeFour: [
    "Edged, and it flies past slip for FOUR! Not in the coaching manual, but who is complaining!",
    "Streaky! Very streaky! But the scoreboard does not ask how! Four runs!",
    "Off the edge, through the gap, and away to the fence! Fortune favours the brave!",
  ],
  dropped: [
    "DROPPED! He has let it slip like a wet bar of soap! {name}, you have been given a second life!",
    "Put down! Oh dear, oh dear! That could be the match right there!",
    "Spilled it! The fielder is staring at his hands like they belong to someone else!",
    "A sitter, and it goes to ground! {bowler} cannot believe it!",
    "Oh no, butterfingers! The ball has bounced out like a rubber duck!",
    "Shelled! That was a regulation catch, my friends, regulation!",
  ],
  save: [
    "WHAT A SAVE! Flying through the air like Superman at the rope!",
    "Stunning! He has plucked it back from the boundary! Athletic, acrobatic, absolutely bonkers!",
    "That was going for runs, and the fielder said, not tonight, my friend!",
    "Brilliant fielding! He has dived like a goalkeeper and saved it!",
    "Superhuman effort at the boundary! The crowd does not know whether to cheer or cry!",
  ],
  bowled: [
    "TIMBER! The stumps are cartwheeling to the boundary! What a peach of a delivery!",
    "Through the gate, and the woodwork is in pieces! The carpenter will be busy tonight!",
    "Bowled him! Middle stump is doing somersaults!",
    "Clean bowled! {bowler} roars like a tiger who found dinner!",
    "Castled! The bails have gone further than some of the sixes tonight!",
    "Knocked him over! {name} is walking back, and the stumps are lying down!",
    "Stumps shattered! That ball was a guided missile!",
    "Bowled! Through bat and pad, and the off stump is doing yoga!",
  ],
  lbw: [
    "Plumb! Absolutely plumb! That was hitting middle stump in any universe you like!",
    "Trapped in front! The finger goes up, and {name} has to go!",
    "LBW! Dead in front, no doubts, no reviews needed!",
    "Pinned on the crease! The umpire did not even think twice!",
    "Struck on the pads, and that is out! Absolutely nowhere to hide!",
    "Up goes the finger! Trapped like a mouse in front of the stumps!",
  ],
  caught: [
    "Big swing, big height, and safe hands below! {name} walks back, and the stadium goes silent.",
    "Caught! Went for glory, found the fielder instead!",
    "Up in the air… and taken! A brilliant catch under pressure!",
    "Holed out! The ball came down with snow on it, and still he held on!",
    "Caught on the rope! So close to six, so far from safety!",
    "Skied it! And the fielder settles under it like a lazy cat. Caught!",
    "Picked out the only fielder on that side! Caught, and the crowd groans!",
    "Mistimed, and it goes straight down the throat of the fielder!",
  ],
  caughtBehind: [
    "Edged and taken! The keeper says thank you very much!",
    "Feathered through to the keeper! A tickle, a nick, and {name} has to go!",
    "Caught behind! {bowler} found the edge like a heat-seeking missile!",
    "Nicked off! The keeper gobbles it up like a hot pakora!",
    "A faint tickle, a loud appeal, and {name} is on his way!",
  ],
  wide: [
    "Way down the leg side! A gift-wrapped extra run, thank you very much!",
    "Wide! The bowler has lost his radar for a moment!",
    "That's a wide! An extra run and an extra ball. Christmas has come early!",
    "Wide of off stump! The umpire stretches his arms, and the batters say thank you!",
    "Down the leg side, wide called! Free run, no questions asked!",
  ],
  noball: [
    "No-ball! Overstepped! The bowler's foot has betrayed him at the worst moment!",
    "No-ball! The umpire's arm goes out, and the batting side loves it!",
    "Overstepped by a mile! Extra run, and that ball does not count!",
    "Front foot no-ball! {bowler} has gifted a run with his big toe!",
    "No-ball! The bowler's foot is over the line, and the crowd loves it!",
  ],
  finalOver: [
    "Final over! {need} needed off six! This is what we live for!",
    "Six balls left. {need} to get. Hold on to your hats, your chairs, and your loved ones!",
    "Last over! The crowd is on its feet, the drums are going mad!",
  ],
  lastBall: [
    "It all comes down to this. One ball. {need} to win. Ladies and gentlemen… do not blink.",
    "Last ball! {need} needed! I can hardly watch, but I must commentate!",
    "One ball. One chance. {need} runs. Somebody hold me!",
    "Final delivery! The whole stadium is holding its breath. {need} to win!",
  ],
  hotStreak: [
    "The crowd is on its feet! {name} is seeing the ball like a football tonight!",
    "{name} is in the zone! Bowlers, beware, this man is on fire!",
    "Three in a row, beautifully timed! {name} is batting in a different universe!",
    "Hot streak! {bowler} is running out of ideas and running out of luck!",
  ],
  win: [
    "HE HAS DONE IT! {name}, you magnificent maniac! Write it in the history books in capital letters!",
    "{team} WIN! Unbelievable scenes! The fireworks are going off, and so am I!",
    "What a finish! {team} have pulled it off! Somebody get me a glass of water!",
    "Victory! {name} raises the bat, the crowd goes wild, and I have lost my voice!",
    "They have chased it! A night that {team} fans will never, ever forget!",
    "Mission accomplished! {name} has done it under the brightest lights!",
    "The chase is complete! Dance in the streets, {team}!",
  ],
  loss: [
    "So close, and yet a whole galaxy away. Heartbreak in the stands, but what a fight!",
    "It's over. {opp} hold their nerve. {team} will be sleeping badly tonight.",
    "Fallen short! {need} runs that will haunt {team} for a long time.",
    "{bowler} has won the battle! Hard luck, {team}, a brave effort all the same.",
    "The dream ends here. {opp} celebrate, {team} slump to the turf.",
    "Not tonight! Short of the target, but the crowd still applauds the effort!",
  ],
  tie: [
    "IT'S A TIE! Nobody wins, nobody loses, and everybody needs a lie down!",
    "Scores level! Cricket, you beautiful, cruel game! A tie!",
    "Honours even! I have commentated for years and I have never seen anything like it!",
  ],
};
