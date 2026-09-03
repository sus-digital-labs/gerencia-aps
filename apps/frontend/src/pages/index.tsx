import Layout from "./Layout";

import Dashboard from "./Dashboard";

import IndicatorDetail from "./IndicatorDetail";

import Gamification from "./Gamification";

import DataQuality from "./DataQuality";

import Teams from "./Teams";

import ACSManagement from "./ACSManagement";

import TerritoryMapping from "./TerritoryMapping";

import Reports from "./Reports";

import PendingTasks from "./PendingTasks";

import TerritoryRemapping from "./TerritoryRemapping";

import ACSTimeline from "./ACSTimeline";

import ACSRanking from "./ACSRanking";

import AedesVigilance from "./AedesVigilance";

import CardiovascularRisk from "./CardiovascularRisk";

import Settings from "./Settings";

import CustomReports from "./CustomReports";

import WomensHealth from "./WomensHealth";

import HealthInsights from "./HealthInsights";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    IndicatorDetail: IndicatorDetail,
    
    Gamification: Gamification,
    
    DataQuality: DataQuality,
    
    Teams: Teams,
    
    ACSManagement: ACSManagement,
    
    TerritoryMapping: TerritoryMapping,
    
    Reports: Reports,
    
    PendingTasks: PendingTasks,
    
    TerritoryRemapping: TerritoryRemapping,
    
    ACSTimeline: ACSTimeline,
    
    ACSRanking: ACSRanking,
    
    AedesVigilance: AedesVigilance,
    
    CardiovascularRisk: CardiovascularRisk,
    
    Settings: Settings,
    
    CustomReports: CustomReports,
    
    WomensHealth: WomensHealth,
    
    HealthInsights: HealthInsights,
    
}

function _getCurrentPage(url: string) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/IndicatorDetail" element={<IndicatorDetail />} />
                
                <Route path="/Gamification" element={<Gamification />} />
                
                <Route path="/DataQuality" element={<DataQuality />} />
                
                <Route path="/Teams" element={<Teams />} />
                
                <Route path="/ACSManagement" element={<ACSManagement />} />
                
                <Route path="/TerritoryMapping" element={<TerritoryMapping />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/PendingTasks" element={<PendingTasks />} />
                
                <Route path="/TerritoryRemapping" element={<TerritoryRemapping />} />
                
                <Route path="/ACSTimeline" element={<ACSTimeline />} />
                
                <Route path="/ACSRanking" element={<ACSRanking />} />
                
                <Route path="/AedesVigilance" element={<AedesVigilance />} />
                
                <Route path="/CardiovascularRisk" element={<CardiovascularRisk />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/CustomReports" element={<CustomReports />} />
                
                <Route path="/WomensHealth" element={<WomensHealth />} />
                
                <Route path="/HealthInsights" element={<HealthInsights />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
