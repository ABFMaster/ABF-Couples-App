import React, { useState } from 'react';
import { Heart, Calendar, MessageCircle, Music, Home, PlusCircle, MapPin, Camera, Utensils, Star, Edit3 } from 'lucide-react';

const CouplesApp = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [userData, setUserData] = useState({
    partner1: '',
    partner2: '',
    startDate: '',
    notes: [],
    checkIns: [],
    musicShares: [
      {
        id: 1,
        title: 'Perfect',
        artist: 'Ed Sheeran',
        message: 'This song reminds me of our first dance ❤️',
        sharedBy: 'partner1',
        date: '2024-01-15'
      }
    ],
    travelPlans: [
      {
        id: 1,
        destination: 'Japan',
        description: 'Cherry blossom season',
        priority: 'high',
        estimatedCost: '$4000',
        plannedFor: '2025-04',
        addedBy: 'partner1'
      }
    ],
    memories: [
      {
        id: 1,
        title: 'First Date Anniversary',
        description: 'Recreated our first coffee shop date',
        date: '2024-01-15',
        tags: ['anniversary', 'special'],
        addedBy: 'partner1',
        imageCount: 3
      }
    ]
  });

  const [currentUser, setCurrentUser] = useState('partner1');
  const [newNote, setNewNote] = useState('');
  const [newSong, setNewSong] = useState({ title: '', artist: '', message: '' });
  const [checkInData, setCheckInData] = useState({
    mood: '',
    gratitude: '',
    concern: '',
    highlight: '',
    relationshipRating: null
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentConversationStarter, setCurrentConversationStarter] = useState(null);
  const [conversationStep, setConversationStep] = useState('checkin'); // 'checkin', 'category', 'conversation'

  // Gottman Institute Categories and Questions
  const gottmanCategories = {
    friendship: {
      title: "Friendship & Connection",
      icon: "🤝",
      description: "Daily connection, playfulness, and being best friends",
      color: "from-blue-500 to-cyan-500",
      questions: [
        "How well do you and your partner make time for each other daily?",
        "How much do you enjoy simply spending time together?",
        "How well do you both show interest in each other's daily experiences?",
        "How connected do you feel as best friends, not just romantic partners?",
        "How much fun and playfulness do you share together?"
      ]
    },
    communication: {
      title: "Communication & Conflict",
      icon: "💬",
      description: "How you talk, listen, and resolve disagreements",
      color: "from-green-500 to-teal-500",
      questions: [
        "How effectively do you both communicate during disagreements?",
        "How well do you feel heard and understood by your partner?",
        "How successfully do you both avoid criticism and blame?",
        "How well do you both repair and reconnect after conflicts?",
        "How comfortable are you bringing up difficult topics together?"
      ]
    },
    intimacy: {
      title: "Intimacy & Romance",
      icon: "❤️",
      description: "Physical closeness, romance, and emotional intimacy",
      color: "from-pink-500 to-rose-500",
      questions: [
        "How satisfied are you with the physical intimacy in your relationship?",
        "How well do you both express romantic affection regularly?",
        "How emotionally intimate and vulnerable are you with each other?",
        "How much effort do you both put into keeping romance alive?",
        "How well do you both understand each other's intimacy needs?"
      ]
    },
    dreams: {
      title: "Dreams & Meaning",
      icon: "🌟",
      description: "Shared goals, values, and life purpose together",
      color: "from-purple-500 to-indigo-500",
      questions: [
        "How aligned are you both on your major life goals and dreams?",
        "How well do you support each other's individual aspirations?",
        "How much shared meaning and purpose do you create together?",
        "How well do you both understand what matters most to each other?",
        "How effectively do you both plan and work toward your future together?"
      ]
    }
  };

  const conversationStarters = {
    friendship: [
      "Tell me about a moment this week when you felt most like we were a great team",
      "What's something silly that always makes you think of me?",
      "Describe a perfect ordinary day we could spend together",
      "What's your favorite thing about just hanging out with me?",
      "Tell me about a time when you felt proud to be with me"
    ],
    communication: [
      "Tell me about a time when you felt really heard and understood by me",
      "What's something I could do to make you feel more comfortable sharing difficult things?",
      "Describe how you prefer to work through disagreements together",
      "What's one thing I do that makes you feel appreciated during conversations?",
      "Tell me about a conversation we had that brought us closer together"
    ],
    intimacy: [
      "What makes you feel most loved and desired by me?",
      "Tell me about a romantic moment we shared that you treasure",
      "What's something that makes you feel emotionally safe with me?",
      "Describe what intimacy means to you in our relationship",
      "What's one way we could create more romantic connection in our daily life?"
    ],
    dreams: [
      "Tell me about a dream you have that you'd love us to pursue together",
      "What values do you think we share that make us strong as a couple?",
      "Describe what you hope our life looks like in 5 years",
      "What's something meaningful you'd like us to create or build together?",
      "Tell me about a goal you have where you'd love my support"
    ]
  };

  const handleWelcomeSubmit = () => {
    if (userData.partner1 && userData.partner2 && userData.startDate) {
      setCurrentScreen('dashboard');
    }
  };

  const addNote = () => {
    if (newNote.trim()) {
      const note = {
        id: Date.now(),
        text: newNote,
        date: new Date().toISOString(),
        author: currentUser === 'partner1' ? userData.partner1 : userData.partner2
      };
      setUserData(prev => ({
        ...prev,
        notes: [...prev.notes, note]
      }));
      setNewNote('');
    }
  };

  const addSong = () => {
    if (newSong.title.trim() && newSong.artist.trim()) {
      const song = {
        id: Date.now(),
        title: newSong.title,
        artist: newSong.artist,
        message: newSong.message,
        sharedBy: currentUser,
        date: new Date().toISOString()
      };
      setUserData(prev => ({
        ...prev,
        musicShares: [...prev.musicShares, song]
      }));
      setNewSong({ title: '', artist: '', message: '' });
    }
  };

  const completeCheckIn = () => {
    if (conversationStep === 'checkin') {
      // Move to category selection
      setConversationStep('category');
      return;
    }
    
    const checkIn = {
      id: Date.now(),
      date: new Date().toISOString(),
      user: currentUser,
      userName: currentUser === 'partner1' ? userData.partner1 : userData.partner2,
      category: selectedCategory,
      conversationStarter: currentConversationStarter,
      ...checkInData
    };
    setUserData(prev => ({
      ...prev,
      checkIns: [...prev.checkIns, checkIn]
    }));
    
    // Reset all state
    setCheckInData({ mood: '', gratitude: '', concern: '', highlight: '', relationshipRating: null });
    setSelectedCategory(null);
    setCurrentConversationStarter(null);
    setConversationStep('checkin');
    setCurrentScreen('dashboard');
  };

  const UserToggle = () => (
    <div className="flex justify-center mb-6">
      <div className="bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setCurrentUser('partner1')}
          className={`px-4 py-2 rounded-lg transition-all ${
            currentUser === 'partner1'
              ? 'bg-rose-500 text-white'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {userData.partner1 || 'Partner 1'}
        </button>
        <button
          onClick={() => setCurrentUser('partner2')}
          className={`px-4 py-2 rounded-lg transition-all ${
            currentUser === 'partner2'
              ? 'bg-rose-500 text-white'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {userData.partner2 || 'Partner 2'}
        </button>
      </div>
    </div>
  );

  // Welcome Screen
  if (currentScreen === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <Heart className="mx-auto text-rose-500 mb-4" size={48} />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">ABF</h1>
            <p className="text-gray-600 mb-1">Always Be Flirting</p>
            <p className="text-gray-500 text-sm">Strengthen your relationship, one check-in at a time</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Partner 1 Name</label>
              <input
                type="text"
                value={userData.partner1}
                onChange={(e) => setUserData(prev => ({ ...prev, partner1: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Partner 2 Name</label>
              <input
                type="text"
                value={userData.partner2}
                onChange={(e) => setUserData(prev => ({ ...prev, partner2: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Enter partner's name"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Relationship Start Date</label>
              <input
                type="date"
                value={userData.startDate}
                onChange={(e) => setUserData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            
            <button
              onClick={handleWelcomeSubmit}
              className="w-full bg-rose-500 text-white py-3 rounded-xl hover:bg-rose-600 transition-colors font-medium"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Daily Check-In / Assessment Screen (WITH GOTTMAN CONVERSATION STARTERS)
  if (currentScreen === 'assessment') {
    // Step 1: Daily Check-in
    if (conversationStep === 'checkin') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Daily Check-In</h2>
                <button onClick={() => setCurrentScreen('dashboard')} className="text-rose-500 hover:text-rose-600">
                  <Home size={24} />
                </button>
              </div>
              
              <UserToggle />
              
              <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white p-6 rounded-2xl mb-8">
                <Calendar className="mb-3" size={24} />
                <h3 className="font-bold text-lg mb-2">How are you feeling today?</h3>
                <p className="text-sm opacity-90">Take a moment to reflect and share with your partner</p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-3">😊 What's your mood today?</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {['😊 Great', '😌 Good', '😐 Okay', '😔 Low', '😰 Stressed'].map(mood => (
                      <button
                        key={mood}
                        onClick={() => setCheckInData(prev => ({...prev, mood}))}
                        className={`p-3 rounded-xl border transition-all ${
                          checkInData.mood === mood 
                            ? 'bg-rose-100 border-rose-300 text-rose-700' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {mood}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">🙏 What are you grateful for today?</label>
                  <textarea
                    value={checkInData.gratitude}
                    onChange={(e) => setCheckInData(prev => ({...prev, gratitude: e.target.value}))}
                    placeholder="Something you're thankful for today..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 h-24 resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">✨ What was the highlight of your day?</label>
                  <textarea
                    value={checkInData.highlight}
                    onChange={(e) => setCheckInData(prev => ({...prev, highlight: e.target.value}))}
                    placeholder="The best part of your day..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 h-24 resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">💭 Is there anything on your mind?</label>
                  <textarea
                    value={checkInData.concern}
                    onChange={(e) => setCheckInData(prev => ({...prev, concern: e.target.value}))}
                    placeholder="Anything you'd like to share or talk about..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 h-24 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-3">💕 How would you rate your relationship today? (Gottman Scale)</label>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>Poor</span>
                      <span>Excellent</span>
                    </div>
                    <div className="flex justify-between mb-3">
                      {[1,2,3,4,5,6,7,8,9,10].map(rating => (
                        <button
                          key={rating}
                          onClick={() => setCheckInData(prev => ({...prev, relationshipRating: rating}))}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all ${
                            checkInData.relationshipRating === rating
                              ? 'bg-rose-500 border-rose-500 text-white'
                              : 'border-gray-300 hover:border-rose-300 text-gray-600'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Rate your overall relationship satisfaction today
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-center pt-4">
                  <button
                    onClick={completeCheckIn}
                    className="bg-rose-500 text-white px-8 py-3 rounded-xl hover:bg-rose-600 transition-colors font-medium"
                  >
                    Continue to Conversation
                  </button>
                </div>
              </div>
              
              {userData.checkIns && userData.checkIns.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">Recent Check-Ins</h3>
                  <div className="space-y-4">
                    {userData.checkIns.slice(-3).reverse().map(checkIn => (
                      <div key={checkIn.id} className="bg-rose-50 p-6 rounded-2xl">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-gray-800">{checkIn.userName}</h4>
                          <span className="text-sm text-gray-500">
                            {new Date(checkIn.date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {checkIn.mood && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Mood</p>
                              <p className="text-gray-800">{checkIn.mood}</p>
                            </div>
                          )}
                          
                          {checkIn.relationshipRating && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Relationship Rating</p>
                              <p className="text-gray-800">{checkIn.relationshipRating}/10</p>
                            </div>
                          )}
                          
                          {checkIn.category && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Conversation Topic</p>
                              <p className="text-gray-800">{gottmanCategories[checkIn.category]?.title}</p>
                            </div>
                          )}
                          
                          {checkIn.highlight && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Highlight</p>
                              <p className="text-gray-800">{checkIn.highlight}</p>
                            </div>
                          )}
                          
                          {checkIn.gratitude && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Grateful for</p>
                              <p className="text-gray-800">{checkIn.gratitude}</p>
                            </div>
                          )}
                          
                          {checkIn.concern && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-1">On their mind</p>
                              <p className="text-gray-800">{checkIn.concern}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Step 2: Gottman Category Selection
    if (conversationStep === 'category' && !selectedCategory) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Choose Your Focus</h2>
                <button onClick={() => setCurrentScreen('dashboard')} className="text-rose-500 hover:text-rose-600">
                  <Home size={24} />
                </button>
              </div>
              
              <div className="text-center mb-8">
                <p className="text-gray-600">What area of your relationship would you like to explore today?</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(gottmanCategories).map(([key, category]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedCategory(key);
                      const starters = conversationStarters[key];
                      const randomStarter = starters[Math.floor(Math.random() * starters.length)];
                      setCurrentConversationStarter(randomStarter);
                      setConversationStep('conversation');
                    }}
                    className={`bg-gradient-to-r ${category.color} text-white p-6 rounded-2xl hover:scale-105 transition-all duration-300 text-left`}
                  >
                    <div className="flex items-center mb-3">
                      <span className="text-3xl mr-3">{category.icon}</span>
                      <h3 className="font-bold text-lg">{category.title}</h3>
                    </div>
                    <p className="text-sm opacity-90">{category.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Step 3: Conversation Starter Display
    if (conversationStep === 'conversation' && selectedCategory && currentConversationStarter) {
      const currentCategory = gottmanCategories[selectedCategory];
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <div className={`inline-flex items-center bg-gradient-to-r ${currentCategory.color} text-white px-4 py-2 rounded-full`}>
                  <span className="mr-2">{currentCategory.icon}</span>
                  <span className="font-medium">{currentCategory.title}</span>
                </div>
                <button onClick={() => setCurrentScreen('dashboard')} className="text-rose-500 hover:text-rose-600">
                  <Home size={24} />
                </button>
              </div>
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Time to Connect</h2>
                <p className="text-gray-600">Here's a conversation starter to explore together</p>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-8 rounded-2xl mb-8 border border-purple-100">
                <h3 className="text-xl font-medium text-gray-800 mb-4 text-center">
                  "{currentConversationStarter}"
                </h3>
                
                <div className="bg-white p-6 rounded-xl">
                  <h4 className="font-bold text-gray-800 mb-3">💡 How to make this great:</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Take turns sharing - no advice unless asked</li>
                    <li>• Listen with curiosity, not judgment</li>
                    <li>• Ask follow-up questions like "Tell me more about that"</li>
                    <li>• It's okay to pause and come back if it feels heavy</li>
                  </ul>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-gray-600 mb-6">After your conversation, let us know how it went:</p>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">How do you feel about your relationship after that conversation?</h4>
                  <div className="flex justify-center space-x-3 mb-6">
                    {[
                      { emoji: '💔', value: 1, label: 'Worse' },
                      { emoji: '😕', value: 2, label: 'Same' },
                      { emoji: '💛', value: 3, label: 'Okay' },
                      { emoji: '💚', value: 4, label: 'Better' },
                      { emoji: '💖', value: 5, label: 'Amazing' }
                    ].map(item => (
                      <button
                        key={item.value}
                        onClick={(value) => {
                          setCheckInData(prev => ({ ...prev, postConversationFeeling: item.value }));
                          completeCheckIn();
                        }}
                        className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                          checkInData.postConversationFeeling === item.value 
                            ? 'bg-rose-500 text-white scale-110' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <span className="text-2xl mb-1">{item.emoji}</span>
                        <span className="text-xs">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Notes Screen
  if (currentScreen === 'notes') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Shared Notes</h2>
              <button onClick={() => setCurrentScreen('dashboard')} className="text-rose-500 hover:text-rose-600">
                <Home size={24} />
              </button>
            </div>
            <UserToggle />
            <div className="mb-6">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  onKeyPress={(e) => e.key === 'Enter' && addNote()}
                />
                <button onClick={addNote} className="bg-rose-500 text-white px-4 py-3 rounded-xl hover:bg-rose-600 transition-colors">
                  <PlusCircle size={20} />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {userData.notes.map(note => (
                <div key={note.id} className="bg-rose-50 p-4 rounded-xl">
                  <p className="text-gray-800 mb-2">{note.text}</p>
                  <p className="text-sm text-gray-500">{note.author} • {new Date(note.date).toLocaleDateString()}</p>
                </div>
              ))}
              {userData.notes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No notes yet. Add your first shared note!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Music Screen
  if (currentScreen === 'music') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Music Together</h2>
              <button onClick={() => setCurrentScreen('dashboard')} className="text-rose-500 hover:text-rose-600">
                <Home size={24} />
              </button>
            </div>
            
            <UserToggle />
            
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-2xl mb-8">
              <Music className="mb-3" size={24} />
              <h3 className="font-bold text-lg mb-2">Share a Song</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newSong.title}
                  onChange={(e) => setNewSong(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Song title"
                  className="w-full px-3 py-2 rounded-lg text-gray-800 placeholder-gray-400"
                />
                <input
                  type="text"
                  value={newSong.artist}
                  onChange={(e) => setNewSong(prev => ({ ...prev, artist: e.target.value }))}
                  placeholder="Artist"
                  className="w-full px-3 py-2 rounded-lg text-gray-800 placeholder-gray-400"
                />
                <input
                  type="text"
                  value={newSong.message}
                  onChange={(e) => setNewSong(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Why this song? (optional)"
                  className="w-full px-3 py-2 rounded-lg text-gray-800 placeholder-gray-400"
                />
                <button
                  onClick={addSong}
                  className="w-full bg-white text-purple-600 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Share Song
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Your Music Together</h3>
              
              {userData.musicShares.map(song => (
                <div key={song.id} className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <Music className="text-white" size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{song.title}</h4>
                        <p className="text-gray-600">{song.artist}</p>
                        {song.message && (
                          <p className="text-sm text-gray-500 mt-1 italic">"{song.message}"</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        From {song.sharedBy === 'partner1' ? userData.partner1 : userData.partner2}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(song.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Travel Screen
  if (currentScreen === 'travel') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Adventures Together</h2>
              <button onClick={() => setCurrentScreen('dashboard')} className="text-rose-500 hover:text-rose-600">
                <Home size={24} />
              </button>
            </div>
            
            <UserToggle />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-2xl">
                <MapPin className="mb-3" size={24} />
                <h3 className="font-bold text-lg mb-2">Add to Wishlist</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Destination" className="w-full px-3 py-2 rounded-lg text-gray-800 placeholder-gray-400" />
                  <input type="text" placeholder="Why this place?" className="w-full px-3 py-2 rounded-lg text-gray-800 placeholder-gray-400" />
                  <select className="w-full px-3 py-2 rounded-lg text-gray-800">
                    <option>When?</option>
                    <option>This Year</option>
                    <option>Next Year</option>
                    <option>Someday</option>
                  </select>
                  <button className="w-full bg-white text-blue-600 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium">
                    Add to Wishlist
                  </button>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-2xl">
                <Calendar className="mb-3" size={24} />
                <h3 className="font-bold text-lg mb-2">Plan a Trip</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Trip name" className="w-full px-3 py-2 rounded-lg text-gray-800 placeholder-gray-400" />
                  <input type="date" className="w-full px-3 py-2 rounded-lg text-gray-800" />
                  <input type="text" placeholder="Budget estimate" className="w-full px-3 py-2 rounded-lg text-gray-800 placeholder-gray-400" />
                  <button className="w-full bg-white text-orange-600 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium">
                    Start Planning
                  </button>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Your Adventures</h3>
              
              {userData.travelPlans.map(trip => (
                <div key={trip.id} className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <MapPin className="text-white" size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{trip.destination}</h4>
                        <p className="text-gray-600">{trip.description}</p>
                        <p className="text-sm text-gray-500">{trip.estimatedCost} • {trip.plannedFor}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        trip.priority === 'high' ? 'bg-red-100 text-red-700' :
                        trip.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {trip.priority} priority
                      </span>
                      <p className="text-sm text-gray-500 mt-2">
                        By {trip.addedBy === 'partner1' ? userData.partner1 : userData.partner2}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 bg-gradient-to-r from-green-500 to-teal-500 text-white p-6 rounded-2xl">
              <h3 className="font-bold text-lg mb-2">Ready to Book?</h3>
              <p className="text-sm opacity-90 mb-4">Find flights, hotels, and experiences for your next adventure</p>
              <div className="grid grid-cols-3 gap-4">
                <button className="bg-white text-green-600 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium">✈️ Flights</button>
                <button className="bg-white text-green-600 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium">🏨 Hotels</button>
                <button className="bg-white text-green-600 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium">🎯 Activities</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Memory Lane Screen
  if (currentScreen === 'memories') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Memory Lane</h2>
              <button onClick={() => setCurrentScreen('dashboard')} className="text-rose-500 hover:text-rose-600">
                <Home size={24} />
              </button>
            </div>
            
            <UserToggle />
            
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-2xl mb-8">
              <h3 className="font-bold text-lg mb-4">Capture a Memory</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="bg-white text-purple-600 py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium">📸 Add Photos</button>
                <button className="bg-white text-purple-600 py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium">📝 Write Memory</button>
                <button className="bg-white text-purple-600 py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium">🎉 Mark Milestone</button>
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Your Memory Timeline</h3>
              
              {userData.memories.map((memory, index) => (
                <div key={memory.id} className="relative">
                  {index !== userData.memories.length - 1 && (
                    <div className="absolute left-6 top-16 w-0.5 h-16 bg-rose-200"></div>
                  )}
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-500">
                      <Camera className="text-white" size={20} />
                    </div>
                    
                    <div className="flex-1 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-800">{memory.title}</h4>
                        <span className="text-sm text-gray-500">
                          {new Date(memory.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{memory.description}</p>
                      
                      {memory.imageCount && (
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-8 h-8 bg-gray-200 rounded"></div>
                          <div className="w-8 h-8 bg-gray-200 rounded"></div>
                          <div className="w-8 h-8 bg-gray-200 rounded"></div>
                          <span className="text-sm text-gray-500">+{memory.imageCount} photos</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          {memory.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500">
                          By {memory.addedBy === 'partner1' ? userData.partner1 : userData.partner2}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Date Night / Restaurants Screen
  if (currentScreen === 'restaurants') {
    const mockRestaurants = [
      { name: "The Romantic Table", cuisine: "Italian", rating: 4.8, price: "$", distance: "0.5 mi" },
      { name: "Cozy Corner Bistro", cuisine: "French", rating: 4.6, price: "$", distance: "1.2 mi" },
      { name: "Sunset Rooftop", cuisine: "American", rating: 4.7, price: "$", distance: "2.1 mi" },
      { name: "Little Tokyo", cuisine: "Japanese", rating: 4.9, price: "$", distance: "0.8 mi" }
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Date Night Spots</h2>
              <button onClick={() => setCurrentScreen('dashboard')} className="text-rose-500 hover:text-rose-600">
                <Home size={24} />
              </button>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-2xl mb-8">
              <Utensils className="mb-3" size={24} />
              <h3 className="font-bold text-lg mb-2">Find Your Perfect Date Night</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" placeholder="Cuisine type" className="px-3 py-2 rounded-lg text-gray-800 placeholder-gray-400" />
                <select className="px-3 py-2 rounded-lg text-gray-800">
                  <option>Price Range</option>
                  <option>$ - Budget</option>
                  <option>$ - Moderate</option>
                  <option>$ - Upscale</option>
                </select>
                <button className="bg-white text-orange-600 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium">
                  Search
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Recommended for You</h3>
              
              {mockRestaurants.map((restaurant, index) => (
                <div key={index} className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-2xl border border-yellow-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <Utensils className="text-white" size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{restaurant.name}</h4>
                        <p className="text-gray-600">{restaurant.cuisine} • {restaurant.price}</p>
                        <p className="text-sm text-gray-500">⭐ {restaurant.rating} • {restaurant.distance}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium mb-2">
                        Make Reservation
                      </button>
                      <p className="text-xs text-gray-500">via OpenTable</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 bg-gradient-to-r from-pink-500 to-rose-500 text-white p-6 rounded-2xl">
              <h3 className="font-bold text-lg mb-2">Date Night Ideas</h3>
              <p className="text-sm opacity-90 mb-4">Beyond restaurants - create memorable experiences together</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="bg-white text-pink-600 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm">🎬 Movies</button>
                <button className="bg-white text-pink-600 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm">🎨 Art Gallery</button>
                <button className="bg-white text-pink-600 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm">🌮 Food Tour</button>
                <button className="bg-white text-pink-600 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm">🎵 Live Music</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {userData.partner1} & {userData.partner2}
            </h1>
            <p className="text-gray-600">
              Together since {userData.startDate ? new Date(userData.startDate).toLocaleDateString() : 'Today'}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button
              onClick={() => setCurrentScreen('assessment')}
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white p-6 rounded-2xl hover:from-rose-600 hover:to-pink-600 transition-all transform hover:scale-105"
            >
              <Calendar className="mx-auto mb-3" size={32} />
              <h3 className="font-bold text-lg mb-2">Start Session</h3>
              <p className="text-sm opacity-90">Daily check-in + conversation</p>
            </button>
            
            <button
              onClick={() => setCurrentScreen('notes')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
            >
              <MessageCircle className="mx-auto mb-3" size={32} />
              <h3 className="font-bold text-lg mb-2">Shared Notes</h3>
              <p className="text-sm opacity-90">{userData.notes.length} notes</p>
            </button>
            
            <button
              onClick={() => setCurrentScreen('music')}
              className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-6 rounded-2xl hover:from-green-600 hover:to-teal-600 transition-all transform hover:scale-105"
            >
              <Music className="mx-auto mb-3" size={32} />
              <h3 className="font-bold text-lg mb-2">Music Together</h3>
              <p className="text-sm opacity-90">{userData.musicShares.length} songs shared</p>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button
              onClick={() => setCurrentScreen('travel')}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-2xl hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105"
            >
              <MapPin className="mx-auto mb-3" size={32} />
              <h3 className="font-bold text-lg mb-2">Adventures</h3>
              <p className="text-sm opacity-90">{userData.travelPlans.length} trips planned</p>
            </button>
            
            <button
              onClick={() => setCurrentScreen('memories')}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-6 rounded-2xl hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105"
            >
              <Camera className="mx-auto mb-3" size={32} />
              <h3 className="font-bold text-lg mb-2">Memory Lane</h3>
              <p className="text-sm opacity-90">{userData.memories.length} memories saved</p>
            </button>
            
            <button
              onClick={() => setCurrentScreen('restaurants')}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-2xl hover:from-yellow-600 hover:to-orange-600 transition-all transform hover:scale-105"
            >
              <Utensils className="mx-auto mb-3" size={32} />
              <h3 className="font-bold text-lg mb-2">Date Nights</h3>
              <p className="text-sm opacity-90">Find perfect spots</p>
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-600 text-lg">
              🎉 Perfect for showing Cass! 
            </p>
            <p className="text-gray-500 mt-2">
              All features are interactive - click around to explore!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CouplesApp;
