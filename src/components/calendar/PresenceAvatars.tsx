'use client';

interface PresenceAvatarsProps {
  users: string[];
  size?: 'md' | 'sm';
}

const AVATAR_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6'];

const colorFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

// "jane.smith@acme.com" -> JS, "bob@acme.com" -> BO
const initialsFor = (name: string) => {
  const local = name.split('@')[0];
  const parts = local.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase() || '?';
};

const MAX_SHOWN = 6;

export default function PresenceAvatars({ users, size = 'md' }: PresenceAvatarsProps) {
  if (users.length === 0) return null;

  // Under a view tab: up to 3 people get their own dots; more collapse into
  // one dot showing the headcount
  if (size === 'sm' && users.length > 3) {
    return (
      <div className="flex items-center" title={users.join('\n')}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white bg-gray-800 border border-white">
          {users.length}
        </div>
      </div>
    );
  }

  const shown = users.slice(0, MAX_SHOWN);
  const overflow = users.length - shown.length;
  const dot =
    size === 'sm'
      ? 'w-5 h-5 text-[10px] border'
      : 'w-6 h-6 text-[10px] border-2';
  return (
    <div className="flex items-center" title={`${users.length} online`}>
      <div className="flex -space-x-1">
        {shown.map(name => (
          <div
            key={name}
            title={name}
            className={`${dot} rounded-full flex items-center justify-center font-semibold text-white border-white flex-shrink-0`}
            style={{ backgroundColor: colorFor(name) }}
          >
            {initialsFor(name)}
          </div>
        ))}
        {overflow > 0 && (
          <div className={`${dot} rounded-full flex items-center justify-center font-medium text-gray-600 bg-gray-200 border-white flex-shrink-0`}>
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}
