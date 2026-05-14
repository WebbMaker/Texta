/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Messages } from './pages/Messages';
import { About } from './pages/About';
import { Notifications } from './pages/Notifications';
import { Videos } from './pages/Videos';
import { VideoPlayer } from './pages/VideoPlayer';
import { Channel } from './pages/Channel';
import { GlobalChat } from './pages/GlobalChat';
import { Forum } from './pages/Forum';
import { TopicDetail } from './pages/TopicDetail';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="videos" element={<Videos />} />
            <Route path="watch/:id" element={<VideoPlayer />} />
            <Route path="channel/:username" element={<Channel />} />
            <Route path="forum" element={<Forum />} />
            <Route path="forum/topic/:topicId" element={<TopicDetail />} />
            <Route path="u/:username" element={<Profile />} />
            <Route path="messages" element={<Messages />} />
            <Route path="global-chat" element={<GlobalChat />} />
            <Route path="about" element={<About />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
