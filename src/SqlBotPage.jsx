import React, { useEffect } from 'react';

export default function SqlBotPage() {
  useEffect(() => {
    const script = document.createElement('script');
    script.defer = true;
    script.async = true;
    script.src = `${import.meta.env.VITE_SQLBOT_BASE_URL}/xpack_static/sqlbot-embedded-dynamic.umd.js`;
    document.head.appendChild(script);

    const timer = setInterval(() => {
      if (window.sqlbot_embedded_handler?.mounted) {
        window.sqlbot_embedded_handler.mounted('.copilot', { embeddedId: '7449364213492879360' });
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <div className="copilot" style={{ height: '100vh' }} />;
}
