
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Check, ExternalLink, Settings } from 'lucide-react';
import clsx from 'clsx';

interface IntegrationCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    isConnected: boolean;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onConfigure?: () => void;
    colorClass?: string;
}

export function IntegrationCard({
    title,
    description,
    icon,
    isConnected,
    onConnect,
    onDisconnect,
    onConfigure,
    colorClass = "bg-slate-50"
}: IntegrationCardProps) {
    return (
        <Card className="flex flex-col h-full border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className={clsx("h-2 w-full", isConnected ? "bg-emerald-500" : "bg-slate-200")} />
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className={clsx("p-2 rounded-lg mb-3 shadow-sm", colorClass)}>
                        {icon}
                    </div>
                    {isConnected ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Connected
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200">
                            Not Connected
                        </Badge>
                    )}
                </div>
                <CardTitle className="text-lg font-bold text-slate-800">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
                <p className="text-sm text-slate-500 leading-relaxed">
                    {description}
                </p>
            </CardContent>
            <CardFooter className="pt-0 flex gap-2 border-t border-slate-50 p-4 bg-slate-50/50">
                {isConnected ? (
                    <>
                        <Button variant="outline" size="sm" className="flex-1 bg-white" onClick={onConfigure}>
                            <Settings className="w-3.5 h-3.5 mr-2 text-slate-500" /> Configure
                        </Button>
                        <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2" onClick={onDisconnect}>
                            Disconnect
                        </Button>
                    </>
                ) : (
                    <Button size="sm" className="w-full flex items-center gap-2" onClick={onConnect}>
                        <ExternalLink className="w-3.5 h-3.5" /> Connect
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
