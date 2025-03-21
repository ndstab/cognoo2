import React from 'react';
import ReactMarkdown from 'react-markdown';
import './ChatMessage.css';

const ChatMessage = ({ message }) => {
  // Check if the message contains markdown with image links
  const containsImages = message.message && message.message.includes('![');
  
  // Parse markdown content
  const renderContent = () => {
    if (!message.message) return null;
    
    return (
      <ReactMarkdown
        components={{
          img: ({ node, ...props }) => (
            <img 
              {...props} 
              className="chat-image" 
              alt={props.alt || "Image"} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/placeholder-image.png';
              }}
            />
          ),
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="chat-link" />
          )
        }}
      >
        {message.message}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`message-container ${message.sender === 'Cogni' ? 'ai-message' : 'user-message'}`}>
      <div className="message-header">
        <span className="message-sender">{message.sender}</span>
        {message.timestamp && (
          <span className="message-time">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className={`message-content ${containsImages ? 'with-images' : ''}`}>
        {renderContent()}
      </div>
    </div>
  );
};

export default ChatMessage;