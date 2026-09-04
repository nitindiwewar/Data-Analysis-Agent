import React, { useState } from 'react';
import {
  MessageSquare, Database, Workflow, Terminal, Award, History, Play, Activity,
  ChevronDown, Check, Plus, Server, Loader2, Table2, Key, FileText
} from 'lucide-react';

export const TopNavbar = ({
  activeTab,
  onTabChange,
  analysisMode = 'db',
  onToggleMode,
  onRunBenchmarks,
  isBenchmarking,
  databases = [],
  activeDatabaseId,
  onSwitchDatabase,
  onConnectCustomDb,
  schema,
  isLlmActive,
  onOpenKeyModal,
  ragDocsCount = 0
}) => {
  const [showDbDropdown, setShowDbDropdown] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  
  const [dbDialect, setDbDialect] = useState('mysql');
  const [customHost, setCustomHost] = useState('localhost');
  const [customPort, setCustomPort] = useState('3306');
  const [customUser, setCustomUser] = useState('root');
  const [customPassword, setCustomPassword] = useState('');
  const [customDatabase, setCustomDatabase] = useState('');
  const [customUri, setCustomUri] = useState('');
  const [sqlitePath, setSqlitePath] = useState('');
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState(null);

  const navTabs = [
    { id: 'studio', label: 'Studio', icon: MessageSquare },
    { id: 'schema', label: 'Schema', icon: Table2 },
    { id: 'flowise', label: 'Workflow', icon: Workflow },
    { id: 'console', label: 'Console', icon: Terminal },
    { id: 'benchmarks', label: 'Benchmarks', icon: Award },
    { id: 'logs', label: 'Logs', icon: History }
  ];

  const currentDb = databases.find(d => d.id === activeDatabaseId) || {
    name: schema?.databaseName || 'sales_analytics.sqlite', dialect: schema?.dialect || 'sqlite'
  };

  const handleDialectChange = (dialect) => {
    setDbDialect(dialect);
    if (dialect === 'postgres') setCustomPort('5432');
    else if (dialect === 'mysql') setCustomPort('3306');
  };

  const handleCustomConnect = async (e) => {
    e.preventDefault();
    setIsConnecting(true);
    setConnectMsg(null);
    try {
      const payload = {
        dialect: dbDialect,
        name: customDatabase || sqlitePath || 'Custom Database',
        host: customHost,
        port: parseInt(customPort) || 3306,
        user: customUser,
        password: customPassword,
        database: customDatabase,
        databasePath: sqlitePath,
        connectionUri: customUri
      };
      const res = await onConnectCustomDb(payload);
      setConnectMsg({ type: 'success', text: res.message || 'Connected successfully!' });
      setTimeout(() => {
        setShowConnectModal(false);
        setConnectMsg(null);
      }, 1500);
    } catch (err) {
      setConnectMsg({ type: 'error', text: err.message || 'Connection failed' });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <header className="shrink-0 h-11 bg-slate-900 text-slate-200 border-b border-slate-800 px-3 flex items-center justify-between gap-2 select-none z-30">
        {/* Left: Brand & Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
            <div className="h-6 w-6 rounded bg-blue-600 text-white flex items-center justify-center font-bold">
              <Database className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-white tracking-tight">Data Analyst</span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-md border border-slate-800 text-xs">
            <button
              onClick={() => onToggleMode('db')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                analysisMode === 'db'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="h-3 w-3" />
              <span>SQL DB</span>
            </button>
            <button
              onClick={() => onToggleMode('rag')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                analysisMode === 'rag'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="h-3 w-3" />
              <span>RAG Files</span>
              {ragDocsCount > 0 && (
                <span className="text-[9px] font-mono px-1 rounded bg-purple-950 text-purple-200">
                  {ragDocsCount}
                </span>
              )}
            </button>
          </div>

          {/* DB Selector */}
          {analysisMode === 'db' && (
            <div className="relative hidden xl:block">
              <button
                onClick={() => setShowDbDropdown(!showDbDropdown)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-slate-200 cursor-pointer"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span className="font-semibold max-w-[120px] truncate">{currentDb.name}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {showDbDropdown && (
                <div className="absolute left-0 top-8 z-50 w-60 rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-xl space-y-0.5 animate-in fade-in">
                  <div className="px-2 py-0.5 text-[10px] font-semibold text-slate-400 uppercase">Connected Databases</div>
                  {databases.map(db => (
                    <button
                      key={db.id}
                      onClick={() => {
                        onSwitchDatabase(db.id);
                        setShowDbDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-xs cursor-pointer ${activeDatabaseId === db.id ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-750 text-slate-300'}`}
                    >
                      <span className="truncate">{db.name}</span>
                      {activeDatabaseId === db.id && <Check className="h-3 w-3 text-white shrink-0" />}
                    </button>
                  ))}

                  <button
                    onClick={() => {
                      setShowDbDropdown(false);
                      setShowConnectModal(true);
                    }}
                    className="w-full flex items-center gap-1 px-2 py-1 rounded text-left text-xs font-semibold text-blue-400 hover:bg-slate-750 border-t border-slate-700 cursor-pointer mt-0.5"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Connect Database</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-0.5 bg-slate-950/60 p-0.5 rounded-md border border-slate-800">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${isActive ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Icon className={`h-3 w-3 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: API Key & Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenKeyModal}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold cursor-pointer transition-colors ${
              isLlmActive
                ? 'border-emerald-800 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                : 'border-amber-800 bg-amber-950/60 text-amber-300 hover:bg-amber-900/60'
            }`}
          >
            <Key className="h-3 w-3" />
            <span>{isLlmActive ? 'Key Active' : 'Set Key'}</span>
          </button>

          <button
            onClick={onRunBenchmarks}
            disabled={isBenchmarking}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
          >
            {isBenchmarking ? <Activity className="h-3 w-3 animate-spin text-white" /> : <Play className="h-2.5 w-2.5 fill-current text-white" />}
            <span className="hidden sm:inline">{isBenchmarking ? 'Running...' : 'Benchmarks'}</span>
          </button>
        </div>
      </header>

      {/* Database Connection Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-slate-800" />
                <h3 className="text-xs font-bold text-slate-900">Connect Remote Database</h3>
              </div>
              <button onClick={() => setShowConnectModal(false)} className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer">✕</button>
            </div>

            <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
              {[
                { id: 'mysql', label: 'MySQL' },
                { id: 'postgres', label: 'PostgreSQL' },
                { id: 'sqlite', label: 'SQLite' },
                { id: 'uri', label: 'URI' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleDialectChange(tab.id)}
                  className={`flex-1 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${dbDialect === tab.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleCustomConnect} className="space-y-2.5 text-xs">
              {dbDialect === 'uri' ? (
                <div>
                  <label className="font-semibold text-slate-700">Connection URI</label>
                  <input
                    type="text"
                    required
                    value={customUri}
                    onChange={e => setCustomUri(e.target.value)}
                    placeholder="postgresql://user:pass@host:5432/dbname"
                    className="w-full mt-1 p-1.5 rounded border border-slate-200 font-mono text-xs focus:outline-none focus:border-slate-400"
                  />
                </div>
              ) : dbDialect === 'sqlite' ? (
                <div>
                  <label className="font-semibold text-slate-700">SQLite File Path</label>
                  <input
                    type="text"
                    required
                    value={sqlitePath}
                    onChange={e => setSqlitePath(e.target.value)}
                    placeholder="database/sales_analytics.sqlite"
                    className="w-full mt-1 p-1.5 rounded border border-slate-200 font-mono text-xs focus:outline-none focus:border-slate-400"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="font-semibold text-slate-700">Host</label>
                      <input type="text" required value={customHost} onChange={e => setCustomHost(e.target.value)} placeholder="localhost" className="w-full mt-0.5 p-1.5 rounded border border-slate-200 font-mono text-xs" />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Port</label>
                      <input type="text" value={customPort} onChange={e => setCustomPort(e.target.value)} placeholder={dbDialect === 'postgres' ? '5432' : '3306'} className="w-full mt-0.5 p-1.5 rounded border border-slate-200 font-mono text-xs" />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Database Name</label>
                    <input type="text" required value={customDatabase} onChange={e => setCustomDatabase(e.target.value)} placeholder="database_name" className="w-full mt-0.5 p-1.5 rounded border border-slate-200 font-mono text-xs" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-slate-700">User</label>
                      <input type="text" required value={customUser} onChange={e => setCustomUser(e.target.value)} placeholder="root" className="w-full mt-0.5 p-1.5 rounded border border-slate-200 font-mono text-xs" />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Password</label>
                      <input type="password" value={customPassword} onChange={e => setCustomPassword(e.target.value)} placeholder="••••••" className="w-full mt-0.5 p-1.5 rounded border border-slate-200 font-mono text-xs" />
                    </div>
                  </div>
                </>
              )}

              {connectMsg && (
                <div className={`p-2 rounded border text-xs font-semibold ${connectMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  {connectMsg.text}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowConnectModal(false)} className="flex-1 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={isConnecting} className="flex-1 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer">
                  {isConnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  <span>{isConnecting ? 'Connecting...' : 'Connect'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
export const SidebarNav = TopNavbar;
