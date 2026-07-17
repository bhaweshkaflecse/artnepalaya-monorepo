import { useState } from 'react';
import { Cpu, Play, ChevronDown, ChevronUp, Clock, Sparkles, Shuffle, Target, BarChart3, Zap } from 'lucide-react';
import { api } from '../services/api';

interface SignalDetail {
  raw: number;
  weight: number;
  contribution: number;
  error?: string;
}

interface ScoreBreakdown {
  postId: string;
  caption: string;
  authorUsername: string;
  createdAt: string;
  finalScore: number;
  signals: Record<string, SignalDetail>;
  selectionReasons: string[];
}

interface DebugInfo {
  candidatesEvaluated: number;
  executionTimeMs: number;
  averageScore: number;
  freshPostCount: number;
  explorationPostCount: number;
  diversitySwaps: number;
  scoreBreakdowns: ScoreBreakdown[];
  fallbackReason?: string;
}

interface SimulationResult {
  data: unknown[];
  meta: { nextCursor: string | null; hasNextPage: boolean };
  debug: DebugInfo | null;
}

export const RecommendationEngine = () => {
  const [userId, setUserId] = useState('');
  const [mode, setMode] = useState<'user' | 'guest'>('user');
  const [limit, setLimit] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  const handleSimulate = async () => {
    setError('');
    setLoading(true);
    setResult(null);
    setExpandedPosts(new Set());

    try {
      const params = new URLSearchParams();
      if (userId.trim()) params.set('userId', userId.trim());
      params.set('mode', mode);
      params.set('limit', String(limit));

      const res = await api.get(`/admin/recommendation/simulate?${params.toString()}`);
      setResult(res.data);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to simulate recommendation feed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (postId: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const debug = result?.debug;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Cpu size={20} className="text-purple-600" />
          Recommendation Engine
        </h3>
        <p className="text-sm text-gray-500">
          Simulate feed generation to inspect scoring signals, selection reasons, and ranking behavior.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID (optional for guest mode)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'user' | 'guest')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="user">User</option>
              <option value="guest">Guest</option>
            </select>
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(50, parseInt(e.target.value) || 15)))}
              min={1}
              max={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSimulate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={16} />
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Fallback reason */}
      {debug?.fallbackReason && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
          <strong>Note:</strong> {debug.fallbackReason}. Using explore feed fallback.
        </div>
      )}

      {/* Summary Cards */}
      {debug && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryCard
            icon={<Target size={18} className="text-blue-500" />}
            label="Candidates Evaluated"
            value={debug.candidatesEvaluated}
          />
          <SummaryCard
            icon={<BarChart3 size={18} className="text-green-500" />}
            label="Returned"
            value={debug.scoreBreakdowns.length}
          />
          <SummaryCard
            icon={<Sparkles size={18} className="text-yellow-500" />}
            label="Fresh Posts"
            value={debug.freshPostCount}
          />
          <SummaryCard
            icon={<Shuffle size={18} className="text-purple-500" />}
            label="Exploration"
            value={debug.explorationPostCount}
          />
          <SummaryCard
            icon={<Zap size={18} className="text-orange-500" />}
            label="Avg Score"
            value={debug.averageScore.toFixed(2)}
          />
          <SummaryCard
            icon={<Clock size={18} className="text-gray-500" />}
            label="Execution Time"
            value={`${debug.executionTimeMs}ms`}
          />
        </div>
      )}

      {/* Ranked Posts */}
      {debug && debug.scoreBreakdowns.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-800">
              Ranked Feed Results ({debug.scoreBreakdowns.length} posts)
            </h4>
          </div>
          <div className="divide-y divide-gray-100">
            {debug.scoreBreakdowns.map((item, idx) => (
              <PostRow
                key={item.postId}
                rank={idx + 1}
                item={item}
                expanded={expandedPosts.has(item.postId)}
                onToggle={() => toggleExpand(item.postId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {result && debug && debug.scoreBreakdowns.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          No posts returned from the simulation. The candidate pool may be empty.
        </div>
      )}
    </div>
  );
};

// --- Sub-components ---

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function PostRow({
  rank,
  item,
  expanded,
  onToggle,
}: {
  rank: number;
  item: ScoreBreakdown;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-3 hover:bg-gray-50 transition-colors flex items-center gap-4"
      >
        <span className="text-sm font-bold text-gray-400 w-8">#{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">
              {item.authorUsername || 'Unknown'}
            </span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-sm text-gray-500 truncate">
              {item.caption || '(no caption)'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {item.selectionReasons.map((reason) => (
              <span
                key={reason}
                className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-gray-900">{item.finalScore.toFixed(2)}</div>
          <div className="text-[11px] text-gray-400">score</div>
        </div>
        <div className="ml-2 text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-1">
              Post ID: <span className="font-mono">{item.postId}</span>
              {' | '}
              Created: {new Date(item.createdAt).toLocaleString()}
            </div>
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-600">Signal</th>
                  <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-600">Raw</th>
                  <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-600">Weight</th>
                  <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-600">Contribution</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(item.signals)
                  .sort(([, a], [, b]) => b.contribution - a.contribution)
                  .map(([name, signal]) => (
                    <tr key={name} className="border-b border-gray-100">
                      <td className="py-1.5 px-2 font-medium text-gray-700">{name}</td>
                      <td className="py-1.5 px-2 text-right text-gray-600 font-mono text-xs">
                        {signal.raw.toFixed(3)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-gray-600 font-mono text-xs">
                        {signal.weight}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs font-semibold text-gray-900">
                        {signal.contribution.toFixed(3)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
