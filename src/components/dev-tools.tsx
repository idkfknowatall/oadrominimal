'use client';

import { useState, useEffect } from 'react';
import {
  Crown,
  ShieldCheck,
  Users,
  RefreshCw,
  Code,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

interface DevToolsProps {
  isVisible: boolean;
  currentUser: {
    uid: string;
    displayName: string | null;
    email: string | null;
  } | null;
  isVip: boolean;
  isModerator: boolean;
  isGuildMember: boolean;
  onRoleChange: (roles: {
    isVip: boolean;
    isModerator: boolean;
    isGuildMember: boolean;
  }) => void;
  onRefreshRoles: () => void;
  isRefreshing: boolean;
}

export default function DevTools({
  isVisible,
  currentUser,
  isVip,
  isModerator,
  isGuildMember,
  onRoleChange,
  onRefreshRoles,
  isRefreshing,
}: DevToolsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localRoles, setLocalRoles] = useState({
    isVip,
    isModerator,
    isGuildMember,
  });

  // Update local state when props change
  useEffect(() => {
    setLocalRoles({ isVip, isModerator, isGuildMember });
  }, [isVip, isModerator, isGuildMember]);

  if (!isVisible || !currentUser) return null;

  const handleRoleToggle = (role: keyof typeof localRoles) => {
    const newRoles = { ...localRoles, [role]: !localRoles[role] };
    setLocalRoles(newRoles);
    onRoleChange(newRoles);
  };

  const applyPreset = (preset: 'regular' | 'vip' | 'moderator' | 'admin') => {
    let newRoles;
    switch (preset) {
      case 'regular':
        newRoles = { isVip: false, isModerator: false, isGuildMember: true };
        break;
      case 'vip':
        newRoles = { isVip: true, isModerator: false, isGuildMember: true };
        break;
      case 'moderator':
        newRoles = { isVip: false, isModerator: true, isGuildMember: true };
        break;
      case 'admin':
        newRoles = { isVip: true, isModerator: true, isGuildMember: true };
        break;
    }
    setLocalRoles(newRoles);
    onRoleChange(newRoles);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 bg-black/90 border-orange-500/50 shadow-2xl">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-white/5 transition-colors">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-500">Dev Tools</span>
                  <Badge
                    variant="outline"
                    className="text-xs border-orange-500/50 text-orange-400"
                  >
                    EMULATOR
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-orange-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-orange-500" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* User Info */}
              <div className="text-xs text-muted-foreground">
                <p className="font-medium">{currentUser.displayName}</p>
                <p className="truncate">{currentUser.email}</p>
                <p className="font-mono text-xs opacity-75">
                  UID: {currentUser.uid.slice(0, 8)}...
                </p>
              </div>

              {/* Current Status */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-orange-400">
                  Current Status
                </h4>
                <div className="flex flex-wrap gap-1">
                  {localRoles.isGuildMember && (
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      Guild Member
                    </Badge>
                  )}
                  {localRoles.isVip && (
                    <Badge
                      variant="secondary"
                      className="text-xs text-vip border-vip/30"
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      VIP
                    </Badge>
                  )}
                  {localRoles.isModerator && (
                    <Badge
                      variant="secondary"
                      className="text-xs text-moderator border-moderator/30"
                    >
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Moderator
                    </Badge>
                  )}
                  {!localRoles.isGuildMember &&
                    !localRoles.isVip &&
                    !localRoles.isModerator && (
                      <Badge variant="outline" className="text-xs opacity-60">
                        No Special Roles
                      </Badge>
                    )}
                </div>
              </div>

              {/* Role Toggles */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-orange-400">
                  Role Controls
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-sm">Guild Member</span>
                    </div>
                    <Switch
                      checked={localRoles.isGuildMember}
                      onCheckedChange={() => handleRoleToggle('isGuildMember')}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-vip" />
                      <span className="text-sm">VIP Member</span>
                    </div>
                    <Switch
                      checked={localRoles.isVip}
                      onCheckedChange={() => handleRoleToggle('isVip')}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-moderator" />
                      <span className="text-sm">Moderator</span>
                    </div>
                    <Switch
                      checked={localRoles.isModerator}
                      onCheckedChange={() => handleRoleToggle('isModerator')}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-orange-400">
                  Quick Presets
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => applyPreset('regular')}
                  >
                    Regular User
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-vip/30 text-vip hover:bg-vip/10"
                    onClick={() => applyPreset('vip')}
                  >
                    VIP Only
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-moderator/30 text-moderator hover:bg-moderator/10"
                    onClick={() => applyPreset('moderator')}
                  >
                    Mod Only
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                    onClick={() => applyPreset('admin')}
                  >
                    Admin
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={onRefreshRoles}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Refresh
                </Button>
              </div>

              {/* Environment Info */}
              <div className="text-xs text-muted-foreground/60 pt-2 border-t border-white/10">
                <p>🔧 Development mode</p>
                <p>Changes are temporary and reset on refresh</p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
