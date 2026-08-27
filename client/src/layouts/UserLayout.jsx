import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

const SIDEBAR_COLLAPSED_WIDTH = 72;
const SIDEBAR_EXPANDED_WIDTH = 240;
const HEADER_HEIGHT = 64;

const UserLayout = () => {
  const [pinned, setPinned] = useState(false);

  // Content only shifts when pinned open; otherwise the sidebar
  // stays visually 72px and expands as a hover overlay on top of content.
  const contentOffset = pinned ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Fixed sidebar — CSS handles hover-expand internally */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1030
        }}
      >
        <Sidebar pinned={pinned} onTogglePin={() => setPinned((p) => !p)} />
      </div>

      {/* Fixed header */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: `${contentOffset}px`,
          right: 0,
          height: `${HEADER_HEIGHT}px`,
          zIndex: 1020,
          transition: 'left 0.25s ease'
        }}
      >
        <Header />
      </div>

      {/* Scrollable content */}
      <main
        style={{
          marginLeft: `${contentOffset}px`,
          marginTop: `${HEADER_HEIGHT}px`,
          minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
          padding: '20px',
          position: 'relative',
          zindex: 1,
          background: '#f8fafc',
          transition: 'margin-left 0.25s ease',
          paddingBottom: '80px'
        }}
      >
        <Outlet />

        {/* Fixed footer */}
      <div
        style={{
          position: 'relative',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 4,
          transition: 'left 0.25s ease',
          // maxHeight: '45vh',
          // overflowY: 'auto'
        }}
      >
        <Footer />
      </div>
      </main>

      
    </div>
  );
};

export default UserLayout;