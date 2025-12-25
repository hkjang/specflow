import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
    // --- Phase 1: Industry Standards (Root Level) ---
    {
        code: 'IND-FIN', name: '금융 (Finance)', description: '금융권 표준 요구사항', level: 'Industry',
        children: [
            { 
                code: 'DOM-BNK', name: '은행 (Banking)', level: 'Domain',
                children: [
                    { name: '계좌 관리', level: 'Function' }, { name: '이체/송금', level: 'Function' }, { name: '여신/수신', level: 'Function' }
                ]
            },
            {
                code: 'DOM-SEC', name: '증권 (Securities)', level: 'Domain',
                children: [
                   { name: '주식 매매', level: 'Function' }, { name: '차트 분석', level: 'Function' }
                ]
            }
        ]
    },
    {
        code: 'FUNC', name: '기능', description: '사용자 기능 요구사항', level: 'Large', // Legacy structure support
        children: [
            {
                name: '사용자 관리',
                children: [
                    { name: '회원가입' }, { name: '로그인' }, { name: '탈퇴' }, { name: '정보수정' }
                ]
            },
            {
                name: '권한 관리',
                children: [
                    { name: '권한 부여' }, { name: '권한 회수' }, { name: 'MFA 설정' }
                ]
            },
            { name: '알림', children: [{ name: '이메일' }, { name: 'Push' }, { name: 'SMS' }] },
            { name: '검색', children: [{ name: '통합 검색' }, { name: '필터링' }] }
        ]
    },
    {
        code: 'NFR', name: '비기능', description: '성능, 안정성 등 비기능 요구사항',
        children: [
            {
                name: '성능',
                children: [
                    { name: '응답시간' }, { name: '처리량(TPS)' }, { name: '리소스 사용량' }
                ]
            },
            { name: '확장성', children: [{ name: 'Scale-out' }, { name: 'Scale-up' }] },
            { name: '가용성', children: [{ name: 'SLA 준수' }, { name: '복구 목표(RTO/RPO)' }] }
        ]
    },
    {
        code: 'UIUX', name: 'UI/UX', description: '화면 및 사용성 요구사항',
        children: [
            {
                name: '네비게이션',
                children: [
                    { name: '메뉴 구조' }, { name: 'Breadcrumbs' }
                ]
            },
            { name: '접근성', children: [{ name: '스크린 리더' }, { name: '색약 지원' }, { name: '키보드 조작' }] },
            { name: '반응형', children: [{ name: 'Mobile' }, { name: 'Tablet' }, { name: 'Desktop' }] }
        ]
    },
    {
        code: 'SEC', name: '보안', description: '인증, 권한, 암호화 보안 요구사항',
        children: [
            { name: '인증', children: [{ name: 'SSO' }, { name: 'OAuth' }, { name: 'Session' }] },
            { name: '인가', children: [{ name: 'RBAC' }, { name: 'ABAC' }] },
            { name: '암호화', children: [{ name: '전송 구간(TLS)' }, { name: '저장 데이터(AES)' }, { name: 'Hashing' }] }
        ]
    },
    {
        code: 'DATA', name: '데이터', description: '데이터 저장 및 처리 요구사항',
        children: [
            { name: '스키마', children: [{ name: '테이블 설계' }, { name: '인덱스 전략' }] },
            { name: '백업', children: [{ name: '주기적 백업' }, { name: 'PITR' }] },
            { name: '정합성', children: [{ name: '트랜잭션' }, { name: 'FK 제약' }] }
        ]
    },
    {
        code: 'INT', name: '연계', description: '외부 시스템 연계 요구사항',
        children: [
            { name: 'API', children: [{ name: 'REST' }, { name: 'GraphQL' }, { name: 'gRPC' }] },
            { name: '메시지', children: [{ name: 'Kafka' }, { name: 'RabbitMQ' }] },
            { name: '파일', children: [{ name: 'Batch' }, { name: 'FTP' }] }
        ]
    },
    {
        code: 'OPS', name: '운영', description: '배포, 모니터링 요구사항',
        children: [
            { name: '배포', children: [{ name: 'CI/CD' }, { name: '무중단 배포' }, { name: 'Rollback' }] },
            { name: '장애', children: [{ name: '장애 감지' }, { name: 'Alerting' }] },
            { name: '로그', children: [{ name: 'Audit Log' }, { name: 'App Log' }] }
        ]
    },
    {
        code: 'QA', name: '품질', description: '테스트 및 검증 요구사항',
        children: [
            { name: '테스트 자동화', children: [{ name: 'Unit Test' }, { name: 'E2E Test' }, { name: 'Integration Test' }] },
            { name: 'QA', children: [{ name: 'Bug Report' }, { name: 'Test Case' }] }
        ]
    },
    {
        code: 'POL', name: '정책', description: '내부 규칙 및 컴플라이언스',
        children: [
            { name: '감사', children: [{ name: '행위 감사' }, { name: '접속 기록' }] },
            { name: '컴플라이언스', children: [{ name: '개인정보보호법' }, { name: 'ISMS-P' }, { name: 'GDPR' }] }
        ]
    },
    {
        code: 'AI', name: 'AI', description: 'AI 모델 및 추론 기능',
        children: [
            { name: '모델 서빙', children: [{ name: 'LLM (vllm)' }, { name: 'Local (ollama)' }] },
            { name: '프롬프트', children: [{ name: 'Prompt Engineering' }, { name: 'Context Management' }] }
        ]
    }
];

async function main() {
    console.log('Seeding Categories...');

    for (const catData of categories as any[]) {
        // Upsert Category with Level Check
        const largeCategory = await prisma.category.upsert({
            where: { code: catData.code },
            // Add explicit level fallback if missing in old data
            update: { name: catData.name, description: catData.description, level: catData.level || 'Large' },
            create: {
                code: catData.code,
                name: catData.name,
                description: catData.description,
                level: catData.level || 'Large',
                isDefault: true
            }
        });

        console.log(`Processed Large: ${largeCategory.name}`);

        if (catData.children) {
            for (const midData of catData.children) {
                // Find existing or create Mid Category under Large
                // Note: We don't have unique code for children, so we check by name + parentId
                let midCategory = await prisma.category.findFirst({
                    where: { name: midData.name, parentId: largeCategory.id }
                });

                // Determine Level dynamically
                let midLevel = midData.level || 'Medium';
                if (!midData.level && catData.level === 'Industry') midLevel = 'Domain';

                if (midCategory) {
                    // Update if needed
                } else {
                    midCategory = await prisma.category.create({
                        data: {
                            code: midData.code || undefined, // Allow code if present (like DOM-BNK)
                            name: midData.name,
                            parentId: largeCategory.id,
                            level: midLevel,
                            isDefault: true
                        }
                    });
                }

                // Process Small Categories
                if (midData.children) {
                    for (const smallData of midData.children) {
                        let smallCategory = await prisma.category.findFirst({
                            where: { name: smallData.name, parentId: midCategory.id }
                        });

                        if (!smallCategory) {
                            await prisma.category.create({
                                data: {
                                    name: smallData.name,
                                    parentId: midCategory.id,
                                    level: smallData.level || 'Small',
                                    isDefault: true
                                }
                            });
                        }
                    }
                }
            }
        }
    }
    console.log('Seeding Categories Completed.');

    await seedExplanations();
}

async function seedExplanations() {
    console.log('Seeding Explanations...');
    const explanations = [
        {
            category: 'MENU',
            key: 'menu.dashboard',
            title: '대시보드',
            content: '전체 시스템의 현황을 한눈에 파악할 수 있는 대시보드입니다. 주요 지표와 알림을 확인할 수 있습니다.',
            examples: '보안 취약점 현황, 최근 배포 내역, 시스템 리소스 사용량 등'
        },
        {
            category: 'MENU',
            key: 'menu.requirements',
            title: '요구사항 관리',
            content: '프로젝트의 요구사항을 등록하고 관리하는 메뉴입니다. AI를 활용하여 요구사항을 분석하고 정제할 수 있습니다.',
            examples: '기능 요구사항, 비기능 요구사항, UI/UX 요구사항 등'
        },
        {
            category: 'MENU',
            key: 'menu.projects',
            title: '프로젝트 관리',
            content: '진행 중인 프로젝트의 목록과 상세 정보를 관리합니다.',
            examples: '신규 프로젝트 생성, 프로젝트 멤버 관리, 프로젝트 설정'
        },
        {
            category: 'SCREEN',
            key: 'screen.req_detail',
            title: '요구사항 상세',
            content: '개별 요구사항의 상세 내용과 이력을 확인하고 수정할 수 있는 화면입니다.',
            examples: '요구사항 내용 수정, 댓글 작성, 변경 이력 확인'
        },
        {
            category: 'FIELD',
            key: 'field.req_code',
            title: '요구사항 코드',
            content: '요구사항을 식별하기 위한 고유한 코드입니다. 일반적으로 "REQ-"로 시작합니다.',
            examples: 'REQ-001, REQ-AUTH-002'
        },
        {
            category: 'FIELD',
            key: 'field.req_trust_grade',
            title: '신뢰 등급',
            content: '요구사항의 신뢰도를 나타내는 점수입니다. AI 분석 및 리뷰 과정을 통해 산정됩니다.',
            examples: '0.0 ~ 1.0 사이의 실수 값'
        }
    ];

    for (const exp of explanations) {
        await prisma.explanation.upsert({
            where: { key: exp.key },
            update: {
                title: exp.title,
                content: exp.content,
                category: exp.category,
                examples: exp.examples
            },
            create: {
                key: exp.key,
                title: exp.title,
                content: exp.content,
                category: exp.category,
                examples: exp.examples,
                isAutoGenerated: false
            }
        });
    }
    console.log('Seeding Explanations Completed.');

    await seedOperationalData();
}


async function seedOperationalData() {
    console.log('Seeding Operational Data...');

    const p = prisma as any;

    // 1. Crawlers
    const crawlers = [
        { name: 'TechCrunch Bot', url: 'https://techcrunch.com', schedule: '0 0 * * *', status: 'ACTIVE' },
        { name: 'HackerNews Bot', url: 'https://news.ycombinator.com', schedule: '0 */4 * * *', status: 'PAUSED' },
        { name: 'Internal Wiki', url: 'https://wiki.internal.acme.com', schedule: '0 0 * * 1', status: 'ACTIVE' }
    ];

    for (const c of crawlers) {
        await p.crawler.create({ data: c });
    }

    // 2. Data Sources
    const sources = [
        { name: 'Legacy ERP Docs', type: 'FILE', url: 's3://bucket/docs/erp_v1.pdf', status: 'SYNCED' },
        { name: 'Regulatory PDF', type: 'FILE', url: 's3://bucket/compliance/2024_reg.pdf', status: 'PENDING' },
        { name: 'Competitor API', type: 'URL', url: 'https://api.competitor.com/v1/docs', status: 'ERROR' }
    ];

    for (const s of sources) {
        await p.dataSource.create({ data: s });
    }

    // 3. Rules
    const rules = [
        { name: 'Auto-Approve Low Risk', condition: 'risk_score < 0.2', action: 'APPROVE', isActive: true },
        { name: 'Escalate High Value', condition: 'value > 1000000', action: 'NOTIFY_ADMIN', isActive: true },
        { name: 'Archive Old Req', condition: 'days_since_update > 365', action: 'ARCHIVE', isActive: false }
    ];

    for (const r of rules) {
        await p.operationRule.create({ data: r });
    }

    // 4. Proposals
    const proposals = [
        { title: 'AI Module Integration', partner: 'DeepMind', status: 'DRAFT', content: 'Proposal for integration...' },
        { title: 'Cloud Migration Strategy', partner: 'AWS Professional Services', status: 'SENT', content: 'Initial strategy doc...' }
    ];

    for (const prop of proposals) {
        await p.partnerProposal.create({ data: prop });
    }

    // 5. System Settings
    const settings = [
        { key: 'system.name', value: 'SpecFlow Enterprise', category: 'GENERAL' },
        { key: 'system.email', value: 'admin@specflow.io', category: 'GENERAL' },
        { key: 'security.mfa_enforced', value: 'true', category: 'SECURITY' },
        { key: 'logging.level', value: 'INFO', category: 'LOGGING' }
    ];

    for (const s of settings) {
        await p.systemSetting.upsert({
            where: { key: s.key },
            update: { value: s.value },
            create: s
        });
    }

    console.log('Seeding Operational Data Completed.');

    await seedAiProviders();
}

async function seedAiProviders() {
    console.log('Seeding AI Providers...');
    const p = prisma as any;

    const providers = [
        {
            name: 'Ollama Local',
            type: 'OLLAMA',
            endpoint: 'http://localhost:11434',
            models: 'gpt-oss:20b',
            isActive: true,
            priority: 1
        },
        // Only add default OpenAI provider if not exists
        {
            name: 'OpenAI',
            type: 'OPENAI',
            endpoint: 'https://api.openai.com/v1',
            models: 'gpt-4o,gpt-3.5-turbo',
            isActive: false, // Default to inactive to avoid cost
            priority: 2
        }
    ];

    for (const provider of providers) {
        // Check if exists by name to avoid duplicates if re-seeding
        const existing = await p.aiProvider.findFirst({
            where: { name: provider.name }
        });

        if (!existing) {
            await p.aiProvider.create({
                data: provider
            });
            console.log(`Created AI Provider: ${provider.name}`);
        } else {
            console.log(`AI Provider ${provider.name} already exists.`);
        }
    }
    console.log('Seeding AI Providers Completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
