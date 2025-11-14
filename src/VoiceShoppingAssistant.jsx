import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, ShoppingCart, Plus, Trash2, Search, X, Loader2, Sparkles, TrendingUp, Calendar
} from 'lucide-react';

const VoiceShoppingAssistant = () => {
  const [items, setItems] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // New manual-add states
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState(1);

  const recognitionRef = useRef(null);

  // categories, substitutes, seasonal items (as before)
  const categories = {
    dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'almond milk', 'soy milk'],
    produce: ['apple', 'banana', 'orange', 'tomato', 'lettuce', 'carrot', 'potato', 'onion'],
    meat: ['chicken', 'beef', 'pork', 'fish', 'turkey', 'lamb'],
    bakery: ['bread', 'bagel', 'croissant', 'muffin', 'cake'],
    snacks: ['chips', 'cookies', 'candy', 'crackers', 'popcorn'],
    beverages: ['water', 'juice', 'soda', 'tea', 'coffee'],
    household: ['toothpaste', 'soap', 'shampoo', 'detergent', 'paper towels']
  };

  const substitutes = {
    milk: ['almond milk', 'soy milk', 'oat milk'],
    butter: ['margarine', 'coconut oil'],
    sugar: ['honey', 'stevia', 'maple syrup'],
    bread: ['tortillas', 'pita bread', 'bagels']
  };

  const seasonalItems = ['pumpkin', 'squash', 'cranberries', 'apples', 'sweet potato'];

  const productDetailsDB = {
    'oppo a9': { battery: '5000mAh', memory: '4GB/64GB', processor: 'Snapdragon 665' },
    'iphone 12': { battery: '2815mAh', memory: '4GB/64GB', processor: 'A14 Bionic' },
    'samsung s21': { battery: '4000mAh', memory: '8GB/128GB', processor: 'Exynos 2100' }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback('Voice recognition not supported in this browser. Use Chrome/Edge.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = language;

    rec.onresult = (event) => {
      let interim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) finalTranscript += result[0].transcript;
        else interim += result[0].transcript;
      }

      setTranscript((finalTranscript || interim).trim());

      if (finalTranscript) processVoiceCommand(finalTranscript.trim());
    };

    rec.onerror = (ev) => {
      console.error('Speech recognition error:', ev.error);
      setIsListening(false);
      setFeedback(`Voice error: ${ev.error}`);
    };

    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    generateSmartSuggestions();

    return () => {
      try { recognitionRef.current?.stop(); } catch (e) {}
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (recognitionRef.current) recognitionRef.current.lang = language;
  }, [language]);

  const categorizeItem = (itemName) => {
    const lower = itemName.toLowerCase();
    for (const [cat, keywords] of Object.entries(categories)) {
      if (keywords.some(k => lower.includes(k))) return cat;
    }
    return 'other';
  };

  const extractQuantity = (text) => {
    const dmatch = text.match(/(\d+)\s+([a-zA-Z]+)/);
    if (dmatch) return parseInt(dmatch[1], 10);
    const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
    const wmatch = text.match(/\b(one|two|three|four|five|six)\b/i);
    if (wmatch) return words[wmatch[1].toLowerCase()];
    return 1;
  };

  // Add item programmatically (used by voice and manual)
  const addItem = (itemName, quantity = 1) => {
    if (!itemName || !itemName.trim()) {
      setFeedback('Please provide an item name.');
      return;
    }
    const category = categorizeItem(itemName);
    const newItem = {
      id: Date.now() + Math.random(),
      name: itemName.trim(),
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
      category,
      addedAt: new Date().toISOString()
    };
    setItems(prev => [...prev, newItem]);
    setFeedback(`Added ${newItem.quantity} ${newItem.name}`);
    generateSmartSuggestions();
  };

  // Manual add handler
  const handleManualAdd = (e) => {
    e?.preventDefault();
    if (!manualName.trim()) {
      setFeedback('Type an item name first.');
      return;
    }
    addItem(manualName.trim(), manualQty);
    setManualName('');
    setManualQty(1);
  };

  const removeItemByName = (name) => {
    const lower = name.toLowerCase();
    const found = items.find(it => it.name.toLowerCase().includes(lower));
    if (found) {
      setItems(prev => prev.filter(it => it.id !== found.id));
      setFeedback(`Removed ${found.name}`);
    } else {
      setFeedback(`Couldn't find "${name}"`);
    }
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Update quantity for an item (inline editing)
  const updateItemQuantity = (id, newQty) => {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    setItems(prev => prev.map(i => (i.id === id ? { ...i, quantity: qty } : i)));
  };

  const incrementQty = (id) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)));
  };
  const decrementQty = (id) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i)));
  };

  const generateSmartSuggestions = () => {
    const s = [];
    if (seasonalItems.length) s.push({ type: 'seasonal', items: seasonalItems.slice(0, 3), message: 'In season now' });
    const names = items.map(i => i.name.toLowerCase());
    if (names.includes('milk') && !names.includes('cereal')) s.push({ type: 'recommendation', items: ['cereal'], message: 'Often bought together' });
    if (items.length > 0) s.push({ type: 'recommendation', items: ['bread', 'eggs', 'butter'], message: 'Commonly needed items' });
    setSuggestions(s);
  };

  const processVoiceCommand = (rawCommand) => {
    if (!rawCommand) return;
    setIsProcessing(true);
    setTranscript(rawCommand);
    setFeedback('Processing...');
    const cmd = rawCommand.toLowerCase().trim();
    const sanitize = (s) => s.replace(/\b(please|hey|ok|could you|would you)\b/gi, '').trim();

    if (/\b(add|buy|i need|i want|need|want)\b/.test(cmd)) {
      const stripped = sanitize(cmd.replace(/\b(add|buy|i need|i want|need|want|to my list|to the list)\b/gi, ''));
      const quantity = extractQuantity(stripped);
      const itemName = stripped.replace(/^\d+\s+/, '').replace(/\b(one|two|three|four|five|six)\b/gi, '').trim();
      if (itemName) addItem(itemName, quantity);
      else setFeedback('Tell me what to add, e.g., "Add 2 bananas"');
    } else if (/\b(remove|delete|take off|cancel)\b/.test(cmd)) {
      const stripped = sanitize(cmd.replace(/\b(remove|delete|remove from my list|from my list|from the list)\b/gi, ''));
      if (stripped) removeItemByName(stripped);
      else setFeedback('Which item should I remove?');
    } else if (/\b(clear|empty)\b/.test(cmd) && /\b(list|cart)\b/.test(cmd)) {
      setItems([]);
      setFeedback('Shopping list cleared');
    } else if (/\b(find|search|show me|show)\b/.test(cmd)) {
      const stripped = sanitize(cmd.replace(/\b(find|search|show me|show)\b/gi, ''));
      if (stripped) {
        setSearchQuery(stripped);
        setFeedback(`Showing results for "${stripped}"`);
      } else setFeedback('What would you like me to show?');
    } else if (/\b(scroll to|go to|navigate to)\b/.test(cmd)) {
      const stripped = sanitize(cmd.replace(/\b(scroll to|go to|navigate to)\b/gi, ''));
      if (stripped) setFeedback(`Scrolled to ${stripped}`);
      else setFeedback('Which section should I scroll to?');
    } else if (/\b(show.*cart|open.*cart|go to cart|my cart)\b/.test(cmd)) {
      setFeedback(`Cart has ${items.length} item(s).`);
    } else if (/\b(battery|memory|processor|ram|camera|price)\b/.test(cmd)) {
      let productName = null;
      for (const name of Object.keys(productDetailsDB)) if (cmd.includes(name)) { productName = name; break; }
      if (!productName && selectedProduct) productName = selectedProduct.toLowerCase();
      if (productName) {
        const details = productDetailsDB[productName];
        if (!details) setFeedback(`No details for ${productName}`);
        else {
          if (cmd.includes('battery')) setFeedback(`${productName}: battery — ${details.battery}`);
          else if (cmd.includes('memory') || cmd.includes('ram')) setFeedback(`${productName}: memory — ${details.memory}`);
          else if (cmd.includes('processor')) setFeedback(`${productName}: processor — ${details.processor}`);
          else setFeedback(`${productName}: ${JSON.stringify(details)}`);
        }
      } else setFeedback('Which product do you mean?');
    } else {
      setFeedback(`Sorry, I didn't understand: "${rawCommand}". Try "Add milk" or "Show me phones".`);
    }

    setIsProcessing(false);
    setIsListening(false);
    try { recognitionRef.current?.stop(); } catch (e) {}
  };

  const toggleListening = () => {
    if (!recognitionRef.current) { setFeedback('Voice recognition is not available.'); return; }
    if (isListening) {
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
      setTranscript('');
    } else {
      setFeedback('');
      setTranscript('');
      try { recognitionRef.current.start(); setIsListening(true); } catch (err) {
        console.error('start error', err);
        setFeedback('Cannot start microphone. Check permissions or reload.');
        setIsListening(false);
      }
    }
  };

  const viewProduct = (productName) => {
    setSelectedProduct(productName);
    setFeedback(`Viewing ${productName}`);
  };

  const filteredItems = searchQuery
    ? items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <ShoppingCart className="w-10 h-10 text-purple-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Voice Shopping Assistant
            </h1>
          </div>
          <p className="text-gray-600">Speak naturally to manage your shopping list — or type below.</p>
        </div>

        {/* Language Selector */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <label className="text-sm font-medium text-gray-700 mr-3">Language:</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="en-US">English (US)</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="it-IT">Italian</option>
            <option value="pt-BR">Portuguese</option>
            <option value="hi-IN">Hindi</option>
            <option value="zh-CN">Chinese</option>
          </select>
        </div>

        {/* Voice Control */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex flex-col items-center">
            <button
              onClick={toggleListening}
              disabled={isProcessing}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : isListening ? (
                <MicOff className="w-10 h-10 text-white" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </button>

            <p className="mt-4 text-lg font-medium text-gray-700">
              {isListening ? 'Listening...' : 'Tap to speak'}
            </p>

            {transcript && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg w-full">
                <p className="text-sm text-gray-600 mb-1">You said:</p>
                <p className="text-blue-700 font-medium">{transcript}</p>
              </div>
            )}

            {feedback && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg w-full">
                <p className="text-green-700">{feedback}</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Voice Commands:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
              <div>• "Add milk" or "I need apples"</div>
              <div>• "Add 2 bottles of water"</div>
              <div>• "Remove milk from my list"</div>
              <div>• "Find organic apples" / "Show me phones"</div>
              <div>• "Scroll to the cameras"</div>
              <div>• "Tell me about its battery" (when viewing a product)</div>
            </div>
          </div>
        </div>

        {/* Manual Add Form */}
        <form onSubmit={handleManualAdd} className="bg-white rounded-2xl shadow-lg p-4 mb-6 flex gap-2 items-center">
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Type an item (e.g., apples)"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setManualQty(q => Math.max(1, q - 1))}
              className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200"
            >-</button>
            <input
              type="number"
              min="1"
              value={manualQty}
              onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-16 text-center px-2 py-2 border border-gray-200 rounded"
            />
            <button
              type="button"
              onClick={() => setManualQty(q => q + 1)}
              className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200"
            >+</button>
          </div>
          <button
            type="submit"
            className="ml-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg"
          >
            <Plus className="w-4 h-4 inline mr-1" /> Add
          </button>
        </form>

        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h2 className="text-xl font-bold text-gray-800">Smart Suggestions</h2>
            </div>

            {suggestions.map((suggestion, idx) => (
              <div key={idx} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  {suggestion.type === 'seasonal' ? (
                    <Calendar className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  )}
                  <p className="text-sm font-medium text-gray-600">{suggestion.message}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestion.items.map((item, itemIdx) => (
                    <button
                      key={itemIdx}
                      onClick={() => addItem(item)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 rounded-lg text-sm font-medium transition-all"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your list..."
              className="flex-1 outline-none text-gray-700"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Shopping List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Shopping List ({items.length} items)</h2>
            {items.length > 0 && (
              <button onClick={() => setItems([])} className="text-sm text-red-500 hover:text-red-700 font-medium">
                Clear All
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your shopping list is empty</p>
              <p className="text-sm text-gray-400 mt-2">Use voice commands or the form above to add items</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-gray-700 capitalize mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <span className="text-lg">{item.quantity}</span>
                          </div>
                          <span className="text-gray-800 font-medium capitalize">{item.name}</span>
                        </div>

                        {/* Quantity controls + view + delete */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200">
                            <button
                              onClick={() => decrementQty(item.id)}
                              className="px-2 py-1 hover:bg-gray-100 rounded"
                            >-</button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                              className="w-16 text-center text-sm outline-none"
                            />
                            <button
                              onClick={() => incrementQty(item.id)}
                              className="px-2 py-1 hover:bg-gray-100 rounded"
                            >+</button>
                          </div>

                          <button onClick={() => viewProduct(item.name)} className="p-2 hover:bg-gray-100 rounded-lg">
                            View
                          </button>
                          <button onClick={() => removeItem(item.id)} className="p-2 hover:bg-red-100 rounded-lg">
                            <Trash2 className="w-5 h-5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected product area */}
        {selectedProduct && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
            <h3 className="text-lg font-bold text-gray-800">Selected: {selectedProduct}</h3>
            <p className="text-sm text-gray-600 mt-2">
              Details: {JSON.stringify(productDetailsDB[selectedProduct.toLowerCase()] || 'No details available')}
            </p>
            <div className="mt-3">
              <button onClick={() => setSelectedProduct(null)} className="px-3 py-1 rounded bg-gray-100">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceShoppingAssistant;
