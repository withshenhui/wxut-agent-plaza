import React, { createContext, useContext, useState, useEffect } from 'react';
import { getPublicConfig } from '../api/config';

const SiteConfigContext = createContext({
  siteName: 'AI中台',
  siteSubtitle: '无锡职业技术大学校级AI中台',
  siteFooter: '© 无锡职业技术大学    Powered By 信息化与数据服务中心',
});

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState({
    siteName: 'AI中台',
    siteSubtitle: '无锡职业技术大学校级AI中台',
    siteFooter: '© 无锡职业技术大学    Powered By 信息化与数据服务中心',
  });

  useEffect(() => {
    const extract = (res, fallback) => {
      if (typeof res === 'string') return res;
      if (res && res.configValue) return res.configValue;
      return fallback;
    };
    Promise.all([
      getPublicConfig('site_name').catch(() => null),
      getPublicConfig('site_subtitle').catch(() => null),
      getPublicConfig('site_footer').catch(() => null),
    ]).then(([name, subtitle, footer]) => {
      setConfig({
        siteName: extract(name, config.siteName),
        siteSubtitle: extract(subtitle, config.siteSubtitle),
        siteFooter: extract(footer, config.siteFooter),
      });
    });
  }, []);

  return (
    <SiteConfigContext.Provider value={config}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
