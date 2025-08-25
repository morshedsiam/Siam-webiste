import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type ChatMessage, MessageRole } from './types';

// --- SVG Icons (defined outside component to prevent re-creation) ---

const BotIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 13.5c-2.4 0-4.4-1.6-5-3.8l-1-.2c-.5-.1-1-.6-1-1.2 0-.7.6-1.3 1.3-1.3.1 0 .2 0 .3.1l1 .2c.6-2.2 2.6-3.8 5-3.8s4.4 1.6 5 3.8l1-.2c.7-.1 1.3.5 1.3 1.2s-.6 1.3-1.3 1.3c-.1 0-.2 0-.3-.1l-1 .2c-.6 2.2-2.6 3.8-5 3.8zM8.5 12c.83 0 1.5-.67 1.5-1.5S9.33 9 8.5 9 7 9.67 7 10.5 7.67 12 8.5 12zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 9 15.5 9s-1.5.67-1.5 1.05S14.67 12 15.5 12z" />
    </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);

const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
    </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
);

// --- Child Components ---

interface ChatMessageBubbleProps {
    message: ChatMessage;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
    const isUser = message.role === MessageRole.USER;
    return (
        <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><BotIcon className="w-5 h-5 text-gray-300" /></div>}
            <div className={`max-w-2xl p-4 rounded-2xl shadow-md prose prose-p:my-0 ${isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>
                <p>{message.content}</p>
            </div>
            {isUser && <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><UserIcon className="w-5 h-5 text-gray-300" /></div>}
        </div>
    );
};

// --- Main App Component ---

const App: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: MessageRole.MODEL,
            content: "Hello! I'm a voice-enabled AI assistant. How can I help you today?"
        }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const recognitionRef = useRef<any>(null); // Using 'any' for SpeechRecognition for cross-browser compatibility

    // Scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Speech Recognition Setup
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported by this browser.");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setUserInput(transcript);
        };
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };
        recognition.onend = () => {
            setIsListening(false);
        };
        recognitionRef.current = recognition;
    }, []);

    const speak = useCallback((text: string) => {
        if ('speechSynthesis' in window && text) {
            window.speechSynthesis.cancel(); // Cancel any ongoing speech
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    const handleSendMessage = useCallback(async (text: string) => {
        if (isLoading || !text.trim()) return;
        
        setIsLoading(true);
        setUserInput('');
        const userMessage: ChatMessage = { role: MessageRole.USER, content: text };
        const updatedMessages = [...messages, userMessage];
        
        setMessages([...updatedMessages, { role: MessageRole.MODEL, content: '' }]);

        const apiMessages = updatedMessages.map(msg => ({
            role: msg.role === MessageRole.USER ? 'user' : 'assistant',
            content: msg.content
        }));

        try {
            // WARNING: Storing API keys directly in the code is insecure and should not be done in production.
            // This is for demonstration purposes only, to allow deployment on static hosting platforms.
            const apiKey = "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";

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "deepseek/deepseek-r1-0528-qwen3-8b:free",
                    "messages": apiMessages,
                    "stream": true
                })
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
                 throw new Error(errorData.error.message || "API error");
            }
            
            if (!response.body) {
                throw new Error("Response body is null");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last, potentially incomplete line

                for (const line of lines) {
                    if (line.trim() === '' || !line.startsWith('data: ')) continue;

                    const data = line.substring(6);
                    if (data.trim() === '[DONE]') {
                        break;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content;
                        if (content) {
                            fullResponse += content;
                            setMessages(prev => {
                                const newMessages = [...prev];
                                newMessages[newMessages.length - 1].content = fullResponse;
                                return newMessages;
                            });
                        }
                    } catch (e) {
                        console.error('Error parsing stream data chunk:', data, e);
                    }
                }
            }
            speak(fullResponse);

        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage = `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please check your API key and network connection.`;
            setMessages(prev => {
                const newMessages = [...prev];
                 if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === MessageRole.MODEL) {
                    newMessages[newMessages.length - 1].content = errorMessage;
                } else {
                    newMessages.push({ role: MessageRole.MODEL, content: errorMessage });
                }
                return newMessages;
            });
            speak(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, messages, speak]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(userInput);
    };

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    return (
        <div className="bg-black text-white min-h-screen flex flex-col">
            <header className="py-4 px-6 border-b border-gray-800 backdrop-blur-sm sticky top-0 bg-black/50 z-10">
                <h1 className="text-xl font-semibold text-center text-gray-200">
                    AI Voice Chat
                </h1>
            </header>
            
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                    {messages.map((msg, index) => (
                        <ChatMessageBubble key={index} message={msg} />
                    ))}
                    {isLoading && messages.length > 0 && messages[messages.length - 1].role === MessageRole.MODEL && messages[messages.length - 1].content === '' && (
                        <div className="flex items-start gap-3 my-4 justify-start">
                           <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><BotIcon className="w-5 h-5 text-gray-300" /></div>
                           <div className="bg-gray-800 p-4 rounded-2xl rounded-bl-none shadow-md">
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                </div>
                           </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            <footer className="p-4 backdrop-blur-sm sticky bottom-0 bg-black/50 border-t border-gray-800">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-3">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Type a message or use the microphone..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-full py-3 pl-5 pr-14 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                            disabled={isLoading}
                        />
                         <button
                            type="button"
                            onClick={toggleListening}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                            title={isListening ? 'Stop Listening' : 'Start Listening'}
                            disabled={!recognitionRef.current}
                        >
                            <MicrophoneIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500 transition-colors duration-300 transform active:scale-95"
                        disabled={isLoading || !userInput.trim()}
                        title="Send Message"
                    >
                        <SendIcon className="w-6 h-6" />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default App;
