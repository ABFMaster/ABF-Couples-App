-- Date Night Feature Database Schema
-- Includes curated date suggestions and couple date plans

-- ============================================
-- DATE SUGGESTIONS TABLE (Curated Ideas)
-- ============================================
CREATE TABLE date_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Core details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('dinner', 'museum', 'music', 'outdoor', 'activity', 'show', 'cozy', 'adventure', 'creative')),

  -- Logistics
  budget_level INTEGER NOT NULL CHECK (budget_level BETWEEN 1 AND 4), -- 1=$, 2=$$, 3=$$$, 4=$$$$
  location_type TEXT NOT NULL CHECK (location_type IN ('restaurant', 'venue', 'outdoor', 'home', 'virtual', 'various')),
  estimated_duration INTEGER NOT NULL, -- in minutes

  -- Future monetization (NULL for now)
  affiliate_url TEXT DEFAULT NULL,
  booking_url TEXT DEFAULT NULL,

  -- Helpful info
  external_link TEXT DEFAULT NULL, -- Generic link (Google Maps search, etc.)
  tips TEXT, -- How to make it special

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for filtering
CREATE INDEX idx_date_suggestions_category ON date_suggestions(category);
CREATE INDEX idx_date_suggestions_budget ON date_suggestions(budget_level);
CREATE INDEX idx_date_suggestions_active ON date_suggestions(is_active);

-- ============================================
-- DATE PLANS TABLE (Couple's Planned Dates)
-- ============================================
CREATE TABLE date_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggested_to UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if planned together

  -- Link to curated suggestion (NULL if custom)
  date_suggestion_id UUID REFERENCES date_suggestions(id) ON DELETE SET NULL,

  -- Date details (can override suggestion values)
  title TEXT NOT NULL,
  description TEXT,
  date_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  budget_level INTEGER CHECK (budget_level BETWEEN 1 AND 4),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('suggested', 'accepted', 'declined', 'planned', 'completed', 'cancelled')),

  -- Link to timeline when completed
  timeline_event_id UUID REFERENCES timeline_events(id) ON DELETE SET NULL,

  -- Response tracking
  responded_at TIMESTAMP WITH TIME ZONE,
  decline_reason TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_date_plans_couple_id ON date_plans(couple_id);
CREATE INDEX idx_date_plans_status ON date_plans(status);
CREATE INDEX idx_date_plans_date_time ON date_plans(date_time);
CREATE INDEX idx_date_plans_created_by ON date_plans(created_by);

-- Enable RLS
ALTER TABLE date_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for date_plans
CREATE POLICY "Users can view their couple's date plans"
  ON date_plans
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can create date plans for their couple"
  ON date_plans
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their couple's date plans"
  ON date_plans
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their couple's date plans"
  ON date_plans
  FOR DELETE
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_date_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_date_plans_updated_at
  BEFORE UPDATE ON date_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_date_plans_updated_at();

-- ============================================
-- SEED DATA: 50+ Curated Date Ideas
-- ============================================

-- DINNER DATES (8)
INSERT INTO date_suggestions (title, description, category, budget_level, location_type, estimated_duration, tips) VALUES
('Tasting Menu Adventure', 'Experience a multi-course tasting menu at a fine dining restaurant. Let the chef surprise you with each course.', 'dinner', 4, 'restaurant', 180, 'Ask about wine pairings and mention any dietary restrictions upfront. Take photos of each course!'),
('Food Truck Crawl', 'Explore your city''s food truck scene. Share small bites from 3-4 different trucks while walking around.', 'dinner', 1, 'outdoor', 120, 'Check social media for food truck locations. Bring cash and wet wipes!'),
('Cook Together at Home', 'Pick a challenging recipe you''ve never made before and cook it together. Make it an event with music and wine.', 'dinner', 2, 'home', 150, 'Prep ingredients beforehand. Put phones away and enjoy the process together.'),
('Ethnic Cuisine Exploration', 'Pick a cuisine neither of you has tried before. Research authentic restaurants and go all in.', 'dinner', 2, 'restaurant', 120, 'Ask the server for recommendations on must-try dishes.'),
('Sunset Picnic Dinner', 'Pack a gourmet picnic with cheese, charcuterie, and wine. Find the perfect sunset spot.', 'dinner', 2, 'outdoor', 120, 'Bring a cozy blanket, candles, and a portable speaker for music.'),
('Breakfast for Dinner', 'Go to a 24-hour diner or make an elaborate breakfast spread at home. Pancakes, bacon, the works!', 'dinner', 1, 'restaurant', 90, 'Order way too much food. It''s part of the experience.'),
('Chef''s Table Experience', 'Book a seat at the chef''s table or an open kitchen restaurant where you can watch the magic happen.', 'dinner', 4, 'restaurant', 150, 'Engage with the chef! Ask questions about techniques and ingredients.'),
('Fondue Night', 'Find a fondue restaurant or make it at home. Cheese, chocolate, or both!', 'dinner', 2, 'restaurant', 120, 'The chocolate fondue dessert is non-negotiable.');

-- MUSEUM & CULTURE (7)
INSERT INTO date_suggestions (title, description, category, budget_level, location_type, estimated_duration, tips) VALUES
('Museum After Hours', 'Many museums offer special evening hours with drinks, music, and fewer crowds. A totally different vibe.', 'museum', 2, 'venue', 180, 'Check for themed nights or special exhibitions. Some offer cocktails!'),
('Art Gallery Hopping', 'Visit 3-4 small galleries in an arts district. Most are free! Discuss which pieces you''d buy if you could.', 'museum', 1, 'venue', 150, 'Ask gallery staff about the artists. They love sharing the stories.'),
('Science Museum Date', 'Channel your inner kids at a science museum. Play with interactive exhibits and learn something new together.', 'museum', 2, 'venue', 180, 'Don''t skip the gift shop. Get matching astronaut ice cream.'),
('Historical Walking Tour', 'Take a guided historical tour of your city. Learn secrets about places you walk by every day.', 'museum', 1, 'outdoor', 120, 'Tip your guide well if they''re good! Ask about lesser-known facts.'),
('Botanical Garden Stroll', 'Wander through beautiful gardens, take photos, and find a quiet bench to just talk.', 'museum', 1, 'outdoor', 120, 'Go during golden hour for the best photos together.'),
('Planetarium Show', 'Lie back under the stars and learn about the universe together. Incredibly romantic.', 'museum', 2, 'venue', 90, 'Sit in the back row for the best viewing angle and privacy.'),
('Aquarium Visit', 'Watch mesmerizing jellyfish, playful otters, and majestic sharks. Many have evening adult-only events.', 'museum', 2, 'venue', 150, 'Find the viewing tunnel and just stand there for a while. It''s magical.');

-- MUSIC & ENTERTAINMENT (7)
INSERT INTO date_suggestions (title, description, category, budget_level, location_type, estimated_duration, tips) VALUES
('Jazz Club Night', 'Find a intimate jazz club. Dress up a little, order cocktails, and let the music wash over you.', 'music', 2, 'venue', 180, 'Arrive early for good seats. Don''t talk during solos!'),
('Outdoor Concert', 'Pack a blanket and snacks for an outdoor concert in the park. From symphony to indie bands.', 'music', 2, 'outdoor', 180, 'Bring layers - it gets cold when the sun goes down.'),
('Open Mic Night', 'Find a local open mic and cheer on brave performers. Maybe even sign up yourselves!', 'music', 1, 'venue', 120, 'Sit near the front to show support. The performers notice.'),
('Karaoke Night', 'Belt out your favorite songs together. Bonus points for a duet!', 'music', 1, 'venue', 120, 'Pick songs you both know the words to for duets. Journey always works.'),
('Symphony or Orchestra', 'Get dressed up for a night of classical music. Even if you''re not classical fans, it''s an experience.', 'music', 3, 'venue', 150, 'Read about the pieces beforehand. It makes it more engaging.'),
('Dance Class', 'Take a beginner salsa, swing, or ballroom class together. Laugh at yourselves and have fun.', 'music', 2, 'venue', 90, 'Don''t worry about being good. The laughing together is the point.'),
('Live Comedy Show', 'Laugh together at a comedy club. Shared laughter is scientifically proven to bond couples.', 'music', 2, 'venue', 120, 'Don''t sit in the front row unless you want to be part of the show!');

-- OUTDOOR & ADVENTURE (8)
INSERT INTO date_suggestions (title, description, category, budget_level, location_type, estimated_duration, tips) VALUES
('Sunrise Hike', 'Wake up early and hike to a scenic viewpoint for sunrise. Bring coffee and pastries.', 'outdoor', 1, 'outdoor', 180, 'Scout the trail beforehand. Bring headlamps and arrive 30 min before sunrise.'),
('Beach Day', 'Classic for a reason. Swim, build sandcastles, read books, nap in the sun.', 'outdoor', 1, 'outdoor', 300, 'Bring a beach umbrella, cooler with drinks, and reef-safe sunscreen.'),
('Kayaking or Paddleboarding', 'Rent kayaks or paddleboards and explore a lake or bay together.', 'outdoor', 2, 'outdoor', 180, 'Tandem kayak = communication exercise. Single kayaks = race!'),
('Bike Ride & Picnic', 'Rent bikes, ride a scenic trail, and stop for a picnic lunch at the prettiest spot.', 'outdoor', 1, 'outdoor', 180, 'Pack light snacks in a backpack. Nothing that''ll get crushed.'),
('Stargazing Night', 'Drive away from city lights, bring blankets, and watch the stars. Download a constellation app.', 'outdoor', 1, 'outdoor', 180, 'Check the moon phase - new moon = best star visibility.'),
('Hot Air Balloon Ride', 'Splurge on a sunrise hot air balloon ride. Unforgettable views and romance.', 'outdoor', 4, 'outdoor', 180, 'Book the sunrise flight. The light is magical and it''s less windy.'),
('Horseback Riding', 'Trail ride through beautiful scenery. No experience needed for most beginner rides.', 'outdoor', 3, 'outdoor', 120, 'Wear long pants and closed-toe shoes. Be patient with your horse.'),
('Farmers Market Morning', 'Stroll through a farmers market, sample everything, and buy ingredients for dinner.', 'outdoor', 1, 'outdoor', 120, 'Go early for the best selection. Bring reusable bags.');

-- ACTIVITIES & GAMES (8)
INSERT INTO date_suggestions (title, description, category, budget_level, location_type, estimated_duration, tips) VALUES
('Escape Room Challenge', 'Work together to solve puzzles and escape. Great for teamwork and communication!', 'activity', 2, 'venue', 90, 'Pick a theme you both find interesting. Horror? Mystery? Adventure?'),
('Bowling & Arcade', 'Classic date night! Bowl a few games and challenge each other at arcade games.', 'activity', 2, 'venue', 150, 'Make a friendly wager on bowling. Loser buys ice cream!'),
('Mini Golf', 'Putt-putt golf is never not fun. Get competitive or just enjoy the silly obstacles.', 'activity', 1, 'venue', 90, 'Take goofy photos at the best holes.'),
('Board Game Cafe', 'Find a cafe with hundreds of board games. Order drinks and play for hours.', 'activity', 1, 'venue', 180, 'Pick cooperative games if you get too competitive with each other!'),
('Pottery Class', 'Channel your inner Ghost movie moment. Make something together you can keep.', 'activity', 2, 'venue', 120, 'The instructor will help. Don''t expect perfection - expect fun.'),
('Axe Throwing', 'Surprisingly fun and satisfying. Most venues have instructors for beginners.', 'activity', 2, 'venue', 90, 'Listen to the safety instructions. It''s actually pretty easy!'),
('Go-Kart Racing', 'Live out your Mario Kart fantasies. Race each other on a real track.', 'activity', 2, 'venue', 90, 'Don''t let them win. True love survives competition.'),
('Trivia Night', 'Find a local bar trivia night. Team up against other couples.', 'activity', 1, 'venue', 120, 'Pick a funny team name. Order appetizers to share.');

-- SHOWS & PERFORMANCES (6)
INSERT INTO date_suggestions (title, description, category, budget_level, location_type, estimated_duration, tips) VALUES
('Broadway/Theater Show', 'See a live theater production. The magic of live performance is unmatched.', 'show', 3, 'venue', 180, 'Read a brief synopsis beforehand. Dress up a bit!'),
('Drive-In Movie', 'Classic Americana! Find a drive-in theater and cozy up in your car with snacks.', 'show', 1, 'outdoor', 180, 'Bring blankets, pillows, and make your own snacks to save money.'),
('Outdoor Movie in the Park', 'Bring a picnic blanket and watch a movie under the stars with your community.', 'show', 1, 'outdoor', 150, 'Arrive early for a good spot. Bring bug spray!'),
('Improv Comedy Show', 'Watch talented comedians make up scenes on the spot. Interactive and hilarious.', 'show', 2, 'venue', 120, 'Yell out creative suggestions when they ask. Be part of the show!'),
('Magic Show', 'Be amazed together! Many cities have great magic shows from intimate to theatrical.', 'show', 2, 'venue', 120, 'Don''t try to figure out the tricks. Just enjoy the wonder.'),
('Cirque-Style Performance', 'Acrobatics, artistry, and awe. These shows are visually stunning date experiences.', 'show', 3, 'venue', 150, 'Splurge on good seats. The spectacle is worth it.');

-- COZY & INTIMATE (8)
INSERT INTO date_suggestions (title, description, category, budget_level, location_type, estimated_duration, tips) VALUES
('Spa Day Together', 'Book couples massages or spend a day at a spa together. Relaxation and romance.', 'cozy', 3, 'venue', 240, 'Book treatments side by side. Use the sauna and hot tub too.'),
('Movie Marathon at Home', 'Pick a trilogy or franchise and commit to watching all of them. Order takeout, wear pajamas.', 'cozy', 1, 'home', 360, 'No phones during movies. Make themed snacks for extra fun.'),
('Wine & Cheese Night', 'Set up a tasting at home with 4-5 wines and paired cheeses. Learn together.', 'cozy', 2, 'home', 150, 'Watch a YouTube video on wine tasting basics first.'),
('Puzzle Night', 'Work on a big jigsaw puzzle together with music, snacks, and conversation.', 'cozy', 1, 'home', 180, 'Pick a puzzle of somewhere you want to travel together.'),
('Book Club for Two', 'Read the same book and discuss it over dinner. Like a book club, but more romantic.', 'cozy', 1, 'home', 120, 'Pick a book with discussion questions. Or a romance novel!'),
('Baking Challenge', 'Pick a Great British Bake Off technical challenge and try to make it together.', 'cozy', 1, 'home', 180, 'Don''t look up tutorials. Struggle together. It''s funnier.'),
('At-Home Spa Night', 'Face masks, foot soaks, candles, robes. Create a spa experience at home.', 'cozy', 1, 'home', 120, 'Put phones in another room. Play relaxing music.'),
('Couples Video Games', 'Play cooperative or competitive video games together. From Mario Kart to It Takes Two.', 'cozy', 1, 'home', 180, 'Try games designed for couples like It Takes Two or Overcooked.');

-- CREATIVE & UNIQUE (6)
INSERT INTO date_suggestions (title, description, category, budget_level, location_type, estimated_duration, tips) VALUES
('Paint & Sip Class', 'Follow along with an instructor while enjoying wine. Take home matching paintings.', 'creative', 2, 'venue', 150, 'Don''t worry about talent. The wine helps with confidence!'),
('Photography Walk', 'Grab your phones or cameras and take artsy photos of each other and your surroundings.', 'creative', 1, 'outdoor', 120, 'Pick a photogenic neighborhood. Golden hour is your friend.'),
('Write Love Letters', 'Sit together but write separate letters to each other about your relationship. Then exchange.', 'creative', 1, 'home', 60, 'Be sincere. These become treasured keepsakes.'),
('Vision Board Date', 'Create vision boards together for your future. Dreams, goals, places to visit.', 'creative', 1, 'home', 120, 'Get magazines, scissors, glue, and poster boards. Dream big!'),
('Learn Something New Together', 'Pick a skill on YouTube (origami, card tricks, cocktail making) and learn it together.', 'creative', 1, 'home', 120, 'Celebrate small victories. Laugh at failures.'),
('Volunteer Together', 'Give back together at a local food bank, animal shelter, or community garden.', 'creative', 1, 'various', 180, 'Doing good together strengthens your bond. Schedule it in advance.');

-- Verify count
-- SELECT COUNT(*) FROM date_suggestions; -- Should be 58
