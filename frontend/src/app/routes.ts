import { createBrowserRouter } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './pages/Layout';
import { Landing } from './pages/Landing';
import { Home } from './pages/Home';
import { Patients } from './pages/Patients';
import { Eligibility } from './pages/Eligibility';
import { PARequests } from './pages/PARequests';
import { AgentActivity } from './pages/AgentActivity';
import { MockPortal } from './pages/MockPortal';
import { Settings } from './pages/Settings';
import { SignIn } from './pages/SignIn';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  { path: '/', Component: Landing },
  { path: '/signin', Component: SignIn },
  {
    path: '/dashboard',
    Component: ProtectedRoute,
    children: [
      {
        Component: Layout,
        children: [
          { index: true, Component: Home },
          { path: 'patients', Component: Patients },
          { path: 'eligibility', Component: Eligibility },
          { path: 'pa-requests', Component: PARequests },
          { path: 'agent-activity', Component: AgentActivity },
          { path: 'mock-portal', Component: MockPortal },
          { path: 'settings', Component: Settings },
          { path: '*', Component: NotFound },
        ],
      },
    ],
  },
]);
