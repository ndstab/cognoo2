import React from 'react';

function ChatComponent({ messages }) {
  return (
    <div className="chat-container">
      {messages.map((msg, index) => (
        <div key={index} className="message">
          <div className="message-sender">{msg.sender}</div>
          <div className="message-content">
            {msg.sources && (
              <div className="message-sources">
                <strong>Sources:</strong>
                <ul>
                  {msg.sources.map((source, i) => (
                    <li key={i}><a href={source.url}>{source.title}</a></li>
                  ))}
                </ul>
              </div>
            )}
            {msg.images && (
              <div className="message-images">
                <strong>Images:</strong>
                <div className="images-container">
                  {msg.images.map((image, i) => (
                    <img key={i} src={image} alt={`Image ${i}`} />
                  ))}
                </div>
              </div>
            )}
            <div className="message-text">{msg.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ChatComponent;