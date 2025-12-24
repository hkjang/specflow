
'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { MessageSquare, Trello, Github, Mail, Slack } from 'lucide-react';

export default function IntegrationsPage() {
    const [connections, setConnections] = useState({
        slack: true,
        jira: false,
        github: false,
        email: true
    });

    const toggleConnection = (key: keyof typeof connections) => {
        setConnections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="연동 서비스 관리 (Integrations)"
                description="외부 협업 도구 및 시스템과 연동하여 업무 효율을 높입니다."
                badgeText="ADMIN"
                steps={['관리자', '시스템 설정', '연동']}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <IntegrationCard
                    title="Slack"
                    description="중요 알림, 승인 요청, 리스크 감지 이벤트를 Slack 채널로 실시간 전송합니다."
                    icon={<Slack className="w-6 h-6 text-[#4A154B]" />}
                    colorClass="bg-[#4A154B]/10"
                    isConnected={connections.slack}
                    onConnect={() => toggleConnection('slack')}
                    onDisconnect={() => toggleConnection('slack')}
                    onConfigure={() => alert('Opening Slack Configuration Modal...')}
                />

                <IntegrationCard
                    title="Jira Software"
                    description="요건이 승인되면 자동으로 Jira 이슈를 생성하고 상태를 동기화합니다."
                    icon={<Trello className="w-6 h-6 text-[#0052CC]" />} // Jira icon
                    colorClass="bg-[#0052CC]/10"
                    isConnected={connections.jira}
                    onConnect={() => toggleConnection('jira')}
                    onDisconnect={() => toggleConnection('jira')}
                />

                <IntegrationCard
                    title="GitHub / GitLab"
                    description="코드 저장소와 연동하여 커밋 메시지에서 요건 ID를 추적하고 변경사항을 감지합니다."
                    icon={<Github className="w-6 h-6 text-[#181717]" />}
                    colorClass="bg-[#181717]/10"
                    isConnected={connections.github}
                    onConnect={() => toggleConnection('github')}
                    onDisconnect={() => toggleConnection('github')}
                />

                <IntegrationCard
                    title="Email Notification"
                    description="SMTP 설정을 통해 주요 이해당사자에게 이메일 리포트를 발송합니다."
                    icon={<Mail className="w-6 h-6 text-slate-600" />}
                    colorClass="bg-slate-100"
                    isConnected={connections.email}
                    onConnect={() => toggleConnection('email')}
                    onDisconnect={() => toggleConnection('email')}
                    onConfigure={() => alert('Configure SMTP Settings')}
                />
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3 mt-4">
                <div className="bg-blue-100 p-2 rounded text-blue-600 mt-1">
                    <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="font-bold text-sm text-blue-900">엔터프라이즈 맞춤 연동이 필요하신가요?</h4>
                    <p className="text-xs text-blue-700 mt-1">
                        사내 레거시 시스템(ERP, Groupware)과의 연동은 별도 API Key 발급이나 Webhook 설정을 통해 가능합니다.
                        <br />
                        자세한 내용은 <a href="#" className="underline font-bold hover:text-blue-800">개발자 가이드</a>를 참고하세요.
                    </p>
                </div>
            </div>
        </div>
    );
}
