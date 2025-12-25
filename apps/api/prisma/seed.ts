import { PrismaClient } from '@prisma/client';

console.log('--- FRESH RUN: Seeding realistic data ---');

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
    await seedProjectsAndPartners();
}


async function seedOperationalData() {
    console.log('Seeding Operational Data...');

    const p = prisma as any;
    
    // Cleanup existing
    await p.crawlHistory.deleteMany({});
    await p.crawler.deleteMany({});
    await p.dataSource.deleteMany({});
    await p.operationRule.deleteMany({});
    await p.partnerProposal.deleteMany({});
    await p.systemSetting.deleteMany({});

    // 1. Enhanced Crawlers - Korean Government & Industry Sites
    const crawlersData = [
        { 
            name: '국가법령정보센터', 
            url: 'https://law.go.kr', 
            schedule: '0 2 * * *', // 매일 새벽 2시
            status: 'ACTIVE',
            category: 'REGULATION',
            description: '대한민국 법률, 시행령, 시행규칙 수집',
            lastRunAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6시간 전
            successCount: 125,
            errorCount: 3
        },
        { 
            name: '금융감독원 규정', 
            url: 'https://fss.or.kr/fss/kr/rules', 
            schedule: '0 3 * * 1', // 매주 월요일 새벽 3시
            status: 'ACTIVE',
            category: 'REGULATION',
            description: '금융감독원 고시, 규정, 가이드라인 수집',
            lastRunAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2일 전
            successCount: 48,
            errorCount: 1
        },
        { 
            name: '개인정보보호위원회', 
            url: 'https://pipc.go.kr', 
            schedule: '0 4 * * *',
            status: 'ACTIVE',
            category: 'REGULATION',
            description: '개인정보보호법, 가이드라인, 결정례 수집',
            lastRunAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
            successCount: 67,
            errorCount: 0
        },
        { 
            name: '국가인권위원회', 
            url: 'https://humanrights.go.kr', 
            schedule: '0 5 * * 3', // 매주 수요일
            status: 'PAUSED',
            category: 'REGULATION',
            description: '인권위 결정례 및 권고문 수집',
            successCount: 23,
            errorCount: 0
        },
        { 
            name: 'IT Daily Tech News', 
            url: 'https://itdaily.kr/tech', 
            schedule: '0 */2 * * *', // 2시간마다
            status: 'ACTIVE',
            category: 'NEWS',
            description: 'IT 기술 동향 및 신기술 뉴스 수집',
            lastRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            successCount: 890,
            errorCount: 12
        },
        { 
            name: '경쟁사 API 문서', 
            url: 'https://competitor.example.com/docs/api', 
            schedule: '0 6 * * 0', // 매주 일요일
            status: 'ERROR',
            category: 'COMPETITOR',
            description: '경쟁사 공개 API 스펙 변경 모니터링',
            lastRunAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            successCount: 15,
            errorCount: 8
        },
        { 
            name: '사내 위키', 
            url: 'https://wiki.company.internal/requirements', 
            schedule: '0 1 * * *', // 매일 새벽 1시
            status: 'ACTIVE',
            category: 'INTERNAL',
            description: '사내 요건 정의서 및 기술 문서 동기화',
            lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            successCount: 234,
            errorCount: 2
        },
        { 
            name: 'KISA 보안 가이드', 
            url: 'https://kisa.or.kr/public/laws', 
            schedule: '0 5 * * 5', // 매주 금요일
            status: 'ACTIVE',
            category: 'REGULATION',
            description: 'KISA 보안 가이드라인 및 취약점 정보 수집',
            lastRunAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            successCount: 56,
            errorCount: 1
        },
        // === RSS NEWS FEEDS ===
        { 
            name: 'ZDNet Korea RSS', 
            url: 'https://zdnet.co.kr/rss/all.rss', 
            schedule: '0 */1 * * *', // 매시간
            status: 'ACTIVE',
            category: 'NEWS',
            description: 'ZDNet Korea IT/기술 뉴스 RSS 피드 수집',
            lastRunAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            successCount: 1250,
            errorCount: 5
        },
        { 
            name: 'Bloter 테크 뉴스', 
            url: 'https://www.bloter.net/feed', 
            schedule: '0 */2 * * *', // 2시간마다
            status: 'ACTIVE',
            category: 'NEWS',
            description: 'Bloter 기술/스타트업 뉴스 RSS 수집',
            lastRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            successCount: 890,
            errorCount: 3
        },
        { 
            name: '전자신문 RSS', 
            url: 'https://www.etnews.com/rss/Section901.xml', 
            schedule: '0 */3 * * *', // 3시간마다
            status: 'ACTIVE',
            category: 'NEWS',
            description: '전자신문 IT/과학 섹션 RSS 피드 수집',
            lastRunAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
            successCount: 1560,
            errorCount: 8
        },
        { 
            name: '보안뉴스 RSS', 
            url: 'https://www.boannews.com/rss/news.xml', 
            schedule: '0 */4 * * *', // 4시간마다
            status: 'ACTIVE',
            category: 'NEWS',
            description: '보안뉴스 정보보안 뉴스 RSS 수집 (보안 요건 모니터링)',
            lastRunAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
            successCount: 720,
            errorCount: 2
        },
        { 
            name: 'Hacker News RSS', 
            url: 'https://hnrss.org/frontpage', 
            schedule: '0 */6 * * *', // 6시간마다
            status: 'ACTIVE',
            category: 'NEWS',
            description: 'Hacker News 프론트페이지 기술 트렌드 수집',
            lastRunAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
            successCount: 2100,
            errorCount: 10
        }
    ];

    const createdCrawlers: any[] = [];
    for (const c of crawlersData) {
        const crawler = await p.crawler.create({ data: c });
        createdCrawlers.push(crawler);
    }
    console.log(`Created ${createdCrawlers.length} crawlers.`);
    
    // 2. Crawl History for each active crawler
    const historyStatuses = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED', 'SUCCESS'];
    for (const crawler of createdCrawlers.filter((c: any) => c.status === 'ACTIVE')) {
        for (let h = 0; h < 5; h++) {
            const daysAgo = h * 7; // Weekly history
            const startTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
            const duration = 5000 + Math.floor(Math.random() * 30000);
            const status = historyStatuses[h];
            
            await p.crawlHistory.create({
                data: {
                    crawlerId: crawler.id,
                    status: status,
                    duration: duration,
                    pagesFound: status === 'SUCCESS' ? 10 + Math.floor(Math.random() * 50) : 0,
                    itemsExtracted: status === 'SUCCESS' ? 3 + Math.floor(Math.random() * 15) : 0,
                    errorMessage: status === 'FAILED' ? 'Connection timeout after 30s' : null,
                    startedAt: startTime,
                    completedAt: new Date(startTime.getTime() + duration)
                }
            });
        }
    }
    console.log('Created crawl history.');

    // 3. Enhanced Data Sources
    const sources = [
        { name: '2024 금융소비자보호법 시행령', type: 'FILE', url: 's3://specflow-docs/regulations/fss_2024.pdf', status: 'SYNCED', lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        { name: '개인정보 처리 가이드라인', type: 'FILE', url: 's3://specflow-docs/compliance/pipc_guide.pdf', status: 'SYNCED', lastSync: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        { name: '차세대 시스템 RFP 문서', type: 'FILE', url: 's3://specflow-docs/rfp/next_gen_rfp_v3.docx', status: 'SYNCED', lastSync: new Date() },
        { name: 'ISMS-P 인증 체크리스트', type: 'FILE', url: 's3://specflow-docs/security/isms_p_checklist.xlsx', status: 'PENDING' },
        { name: '경쟁사 API 스펙', type: 'URL', url: 'https://api.competitor.com/v2/openapi.json', status: 'ERROR' },
        { name: '사내 표준 요건 템플릿', type: 'FILE', url: 's3://specflow-docs/templates/req_template.docx', status: 'SYNCED', lastSync: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        { name: '법률용어 사전', type: 'FILE', url: 's3://specflow-docs/dict/legal_terms.json', status: 'SYNCED', lastSync: new Date() },
        { name: '공공데이터포털 API', type: 'URL', url: 'https://data.go.kr/api/openapi', status: 'SYNCED', lastSync: new Date(Date.now() - 12 * 60 * 60 * 1000) }
    ];

    for (const s of sources) {
        await p.dataSource.create({ data: s });
    }
    console.log(`Created ${sources.length} data sources.`);

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

    await seedExtractionJobs();
    await seedMarketplace();
    await seedKnowledgeBase();
    await seedAiProviders();
}

async function seedExtractionJobs() {
    console.log('Seeding Extraction Jobs...');
    const p = prisma as any;
    
    // Clean up existing
    await p.requirementDraft.deleteMany({});
    await p.extractionJob.deleteMany({});
    await p.extractionSource.deleteMany({});
    
    // Create extraction sources (only type, content, metadata)
    const sources = [
        { 
            type: 'FILE', 
            content: '금융소비자보호법 시행령 제23조에 따라 금융상품 판매 시 적합성 원칙을 준수해야 한다. 고객의 투자성향을 파악하고 그에 맞는 상품을 권유해야 하며, 부적합한 상품 권유 시 경고를 제공해야 한다.',
            metadata: { name: '금융감독원 규정 문서', fileName: 'financial_regulation_2024.pdf', size: 1024000 }
        },
        { 
            type: 'FILE',
            content: '배송 추적 시스템은 실시간으로 위치 정보를 제공해야 한다. GPS 기반 추적이 가능해야 하며, 배송 상태 변경 시 즉시 알림을 발송해야 한다. 일일 처리량은 최소 100만 건 이상을 지원해야 한다.',
            metadata: { name: '물류 시스템 RFP', fileName: 'logistics_rfp_2024.docx', size: 512000 }
        },
        {
            type: 'URL',
            content: '환자 개인정보는 암호화하여 저장해야 한다. 의료 데이터 접근 시 2단계 인증을 필수로 적용한다. 진료 기록 조회 시 접근 로그를 남기고 6개월간 보관한다.',
            metadata: { name: '의료정보 보안 가이드라인', url: 'https://hira.or.kr/security/2024' }
        },
        {
            type: 'FILE',
            content: '생산 라인 모니터링 시스템은 센서 데이터를 100ms 이내에 수집해야 한다. 이상 감지 시 즉시 알람을 발생시키고, 설비 가동 현황을 대시보드에 실시간 표시해야 한다.',
            metadata: { name: '스마트팩토리 요구사항 정의서', fileName: 'smart_factory_spec.pdf', size: 2048000 }
        },
    ];
    
    const createdSources = [];
    for (const s of sources) {
        const src = await p.extractionSource.create({ data: s });
        createdSources.push(src);
    }
    
    // Create extraction jobs
    const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PROCESSING'];
    const models = ['gpt-4o', 'qwen3:8b', 'claude-3-opus'];
    
    for (let i = 0; i < createdSources.length; i++) {
        const source = createdSources[i];
        const status = statuses[i];
        
        const job = await p.extractionJob.create({
            data: {
                sourceId: source.id,
                status: status,
                progress: status === 'COMPLETED' ? 100 : 45,
                result: status === 'COMPLETED' ? {
                    modelName: models[i % models.length],
                    extractedCount: 3 + Math.floor(Math.random() * 5),
                    processingTime: 5000 + Math.floor(Math.random() * 10000)
                } : null
            }
        });
        
        // Create drafts for completed jobs
        if (status === 'COMPLETED') {
            const draftStatuses = ['APPROVED', 'APPROVED', 'PENDING', 'REJECTED'];
            const draftTitles = [
                '적합성 원칙 준수 기능',
                '고객 투자성향 분석',
                '부적합 상품 경고 표시',
                '실시간 위치 추적',
                '배송 상태 알림 발송',
                '센서 데이터 수집',
                '이상 감지 알람'
            ];
            
            for (let d = 0; d < 4; d++) {
                await p.requirementDraft.create({
                    data: {
                        jobId: job.id,
                        sourceId: source.id,
                        title: draftTitles[Math.floor(Math.random() * draftTitles.length)],
                        content: `추출된 요건 내용입니다. 원문에서 자동으로 파싱되었습니다.`,
                        type: d % 2 === 0 ? 'Functional' : 'Non-Functional',
                        confidence: 0.7 + Math.random() * 0.25,
                        status: draftStatuses[d]
                    }
                });
            }
        }
    }
    
    console.log('Seeding Extraction Jobs Completed.');
}

async function seedMarketplace() {
    console.log('Seeding Marketplace...');
    const p = prisma as any;
    
    // Clean up
    await p.marketplaceItem.deleteMany({});
    
    const items = [
        {
            name: '금융권 표준 요건 템플릿 팩',
            description: '국내 주요 금융사에서 사용하는 검증된 요건 템플릿 150개 세트입니다. 계좌 관리, 이체, 대출, 카드 등 핵심 도메인을 포함합니다.',
            type: 'Dataset',
            price: '₩299,000',
            rating: 4.8,
            downloads: 1250,
            provider: 'SpecFlow Official'
        },
        {
            name: 'AI 추출 성능 향상 프롬프트 세트',
            description: '요건 추출 정확도를 15% 향상시키는 최적화된 프롬프트 컬렉션입니다. GPT-4, Claude 호환.',
            type: 'Model',
            price: '₩99,000',
            rating: 4.5,
            downloads: 890,
            provider: 'AI Labs Korea'
        },
        {
            name: '공공기관 SI 프로젝트 분류 체계',
            description: '정부 및 공공기관 SI 사업에 최적화된 카테고리 분류 체계입니다. KMAC 표준 준거.',
            type: 'Dataset',
            price: '₩149,000',
            rating: 4.2,
            downloads: 456,
            provider: '공공IT연구소'
        },
        {
            name: 'IoT/스마트팩토리 도메인 사전',
            description: '제조업 스마트팩토리 프로젝트용 용어 사전과 도메인 지식베이스입니다.',
            type: 'Dataset',
            price: '₩199,000',
            rating: 4.6,
            downloads: 234,
            provider: '스마트제조혁신센터'
        },
        {
            name: 'ISMS-P 보안 요건 체크리스트',
            description: 'ISMS-P 인증 획득을 위한 필수 보안 요건 항목 120개와 자동 매핑 규칙입니다.',
            type: 'API',
            price: '₩399,000',
            rating: 4.9,
            downloads: 678,
            provider: 'SecureTech Partners'
        },
        {
            name: '무료 스타터 템플릿',
            description: '소규모 프로젝트를 위한 기본 요건 템플릿 20개 세트입니다.',
            type: 'Dataset',
            price: 'Free',
            rating: 4.0,
            downloads: 5600,
            provider: 'SpecFlow Community'
        }
    ];
    
    for (const item of items) {
        await p.marketplaceItem.create({ data: item });
    }
    
    console.log('Seeding Marketplace Completed.');
}

async function seedKnowledgeBase() {
    console.log('Seeding Knowledge Base...');
    const p = prisma as any;
    
    // Clean up
    await p.knowledgeArticle.deleteMany({});
    
    const articles = [
        {
            title: '요건 정의 Best Practice 가이드',
            content: `# 요건 정의 Best Practice

## 1. 명확한 목적 정의
요건은 반드시 비즈니스 목적과 연결되어야 합니다.

## 2. SMART 원칙 적용
- Specific: 구체적으로 작성
- Measurable: 측정 가능하게 
- Achievable: 달성 가능하게
- Relevant: 관련성 있게
- Time-bound: 기한 명시

## 3. 이해관계자 검토
모든 이해관계자의 검토와 승인을 받아야 합니다.`,
            category: 'GUIDE',
            tags: ['가이드', '요건정의', 'Best Practice'],
            author: '김관리',
            views: 1250,
            isPublished: true
        },
        {
            title: 'AI 추출 기능 활용법',
            content: `# AI 추출 기능 활용법

## 문서 준비
- PDF, Word, 텍스트 파일 지원
- 파일 크기 최대 50MB

## 추출 과정
1. 문서 업로드
2. AI 모델 선택
3. 추출 시작
4. 결과 검토 및 수정
5. 승인/반려

## 팁
- 명확한 문서일수록 정확도 향상
- 표 형식 데이터는 자동 인식됨`,
            category: 'TUTORIAL',
            tags: ['AI', '추출', '튜토리얼'],
            author: '박개발',
            views: 980,
            isPublished: true
        },
        {
            title: '금융권 규제 요건 요약',
            content: `# 금융권 주요 규제 요건

## 금융소비자보호법
- 적합성 원칙
- 적정성 원칙
- 설명의무
- 불공정 행위 금지

## 전자금융거래법
- 이용자 보호
- 전자금융사고 책임
- 접근 매체 관리

## ISMS-P 인증
- 관리체계 수립
- 보호 대책 요구사항
- 개인정보 처리 단계별 요구사항`,
            category: 'DOMAIN',
            tags: ['금융', '규제', '컴플라이언스'],
            author: '이기획',
            views: 2100,
            isPublished: true
        },
        {
            title: '요건 품질 점수 이해하기',
            content: `# 품질 점수 가이드

## 점수 구성
- **명확성 (Clarity)**: 모호한 표현 없음
- **간결성 (Conciseness)**: 중복 없는 표현
- **완전성 (Completeness)**: 필수 요소 포함
- **정확성 (Correctness)**: 용어/문법 준수

## 점수 해석
- 90점 이상: 우수
- 70-89점: 양호
- 50-69점: 보통
- 50점 미만: 개선 필요

## 개선 방법
1. AI 제안 사항 검토
2. 템플릿 활용
3. 피어 리뷰 진행`,
            category: 'GUIDE',
            tags: ['품질', '점수', '개선'],
            author: '한품질',
            views: 756,
            isPublished: true
        }
    ];
    
    for (const article of articles) {
        await p.knowledgeArticle.create({ data: article });
    }
    
    console.log('Seeding Knowledge Base Completed.');
}

async function seedAiProviders() {
    console.log('Seeding AI Providers...');
    const p = prisma as any;

    // Cleanup legacy 'Ollama Local' if it exists to replace with specific ones
    await p.aiProvider.deleteMany({
        where: { name: 'Ollama Local' }
    });
    console.log('Cleaned up legacy "Ollama Local" provider.');

    const providers = [
        {
            name: 'Ollama (gpt-oss:20b)',
            type: 'OLLAMA',
            endpoint: 'http://localhost:11434',
            models: 'gpt-oss:20b',
            isActive: true,
            priority: 1
        },
        {
            name: 'Ollama (qwen3:8b)',
            type: 'OLLAMA',
            endpoint: 'http://localhost:11434',
            models: 'qwen3:8b',
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
        const existing = await p.aiProvider.findFirst({
            where: { name: provider.name }
        });

        if (!existing) {
            await p.aiProvider.create({
                data: provider
            });
            console.log(`Created AI Provider: ${provider.name}`);
        } else {
            await p.aiProvider.update({
                where: { id: existing.id },
                data: {
                    models: provider.models,
                    endpoint: provider.endpoint,
                    isActive: provider.isActive
                }
            });
            console.log(`Updated AI Provider: ${provider.name}`);
        }
    }
    console.log('Seeding AI Providers Completed.');
}

async function seedProjectsAndPartners() {
    console.log('Seeding Projects and Partners...');
    const p = prisma as any;

    // 0. Ensure Organizations exist
    const orgs = [
        { id: 'org-001', name: 'Acme Corp', domain: 'acme.com', plan: 'ENTERPRISE' },
        { id: 'org-002', name: 'BioTech Inc', domain: 'biotech.com', plan: 'STANDARD' }
    ];

    for (const org of orgs) {
        await p.organization.upsert({
            where: { id: org.id },
            update: {},
            create: org
        });
    }

    // 1. Projects
    const projectsData = [
        { name: '차세대 뱅킹 시스템 구축', description: 'MSA 기반의 코어 뱅킹 현대화 프로젝트', organizationId: 'org-001' },
        { name: '글로벌 물류 플랫폼 고도화', description: '실시간 트래킹 및 AI 최적화 물류 시스템', organizationId: 'org-001' },
        { name: '공공 데이터 포털 리뉴얼', description: '대국민 서비스 접근성 향상 및 데이터 개방 확대', organizationId: 'org-001' },
        { name: 'AI 기반 신약 개발 플랫폼', description: '바이오 데이터 분석 및 후보 물질 발굴 가속화', organizationId: 'org-002' },
        { name: '스마트 팩토리 통합 관제', description: 'IoT 센서 연동 및 실시간 생산 라인 모니터링', organizationId: 'org-002' }
    ];

    const projects: any[] = [];
    for (const proj of projectsData) {
        // Upsert to avoid duplicates
        const existing = await p.project.findFirst({ where: { name: proj.name } });
        if (existing) {
            projects.push(existing);
        } else {
            console.log(`Creating Project: ${proj.name}`);
            const newProj = await p.project.create({ data: proj });
            projects.push(newProj);
        }
    }

    // 2. Partners
    const partnersData = [
        { 
            name: 'Samsung SDS', type: 'Technology', status: 'Active', 
            email: 'contact@samsung.com', region: 'Seoul', 
            description: 'Global IT Solutions Provider' 
        },
        { 
            name: 'LG CNS', type: 'Technology', status: 'Active', 
            email: 'biz@lgcns.com', region: 'Seoul', 
            description: 'Digital Transformation Partner' 
        },
        { 
            name: 'SK C&C', type: 'Technology', status: 'Active', 
            email: 'info@skcc.com', region: 'Seoul', 
            description: 'Smart ICT Business Partner' 
        },
        { 
            name: 'PwC Consulting', type: 'Consulting', status: 'Active', 
            email: 'kr_consulting@pwc.com', region: 'Global', 
            description: 'Strategy & Management Consulting' 
        },
        { 
            name: 'Deloitte Korea', type: 'Consulting', status: 'Pending', 
            email: 'audit@deloitte.com', region: 'Global', 
            description: 'Audit, Consulting, Tax, Advisory' 
        },
        { 
            name: 'AWS Korea', type: 'Technology', status: 'Active', 
            email: 'aws-kr@amazon.com', region: 'Global', 
            description: 'Cloud Infrastructure Provider' 
        },
        { 
            name: 'Wanted HRLab', type: 'Resource', status: 'Active', 
            email: 'hr@wanted.com', region: 'Seoul', 
            description: 'Tech Talent Application Platform' 
        }
    ];

    const partners: any[] = [];
    for (const part of partnersData) {
        const existing = await p.partner.findFirst({ where: { name: part.name } });
        if (existing) {
            partners.push(existing);
        } else {
            console.log(`Creating Partner: ${part.name}`);
            const newPart = await p.partner.create({ data: part });
            partners.push(newPart);
        }
    }

    // 3. Link Partners to Projects (Randomly for Demo)
    // - 차세대 뱅킹: SDS, LG CNS, AWS, PwC
    // - 물류 플랫폼: SK C&C, AWS
    // - 공공 데이터: LG CNS
    // - AI 신약: Deloitte, AWS
    
    // Helper to find ID by name
    const getP = (name: string) => partners.find((x: any) => x.name === name);
    const getProj = (name: string) => projects.find((x: any) => x.name === name);

    const links = [
        { proj: '차세대 뱅킹 시스템 구축', parts: ['Samsung SDS', 'PwC Consulting', 'AWS Korea'] },
        { proj: '글로벌 물류 플랫폼 고도화', parts: ['SK C&C', 'AWS Korea', 'Wanted HRLab'] },
        { proj: '공공 데이터 포털 리뉴얼', parts: ['LG CNS'] },
        { proj: 'AI 기반 신약 개발 플랫폼', parts: ['Deloitte Korea', 'AWS Korea', 'Samsung SDS'] },
        { proj: '스마트 팩토리 통합 관제', parts: ['SK C&C', 'LG CNS'] }
    ];

    for (const link of links) {
        const targetProj = getProj(link.proj);
        if (!targetProj) continue;

        const targetPartnerIds = link.parts
            .map(name => getP(name)?.id)
            .filter(id => !!id)
            .map(id => ({ id }));

        if (targetPartnerIds.length > 0) {
            await p.project.update({
                where: { id: targetProj.id },
                data: {
                    partners: {
                        connect: targetPartnerIds
                    }
                }
            });
            console.log(`Linked ${link.parts.length} partners to ${link.proj}`);
        }
    }

    console.log('Seeding Projects and Partners Completed.');

    await seedRequirements(prisma);
}

// --- Realistic Requirement Generation ---

async function seedRequirements(prisma: any) {
    console.log('Seeding Realistic Requirements (100+)...');

    // 1. Fetch Context Data
    const projects = await prisma.project.findMany();
    const categories = await prisma.category.findMany();
    
    // 0. Seed Realistic Users with different roles (ADMIN, PM, PLANNER, DEVELOPER, QA)
    const usersData = [
        { email: 'admin@specflow.io', name: '김관리', password: 'hashed', role: 'ADMIN' },
        { email: 'pm.kim@specflow.io', name: '김프로', password: 'hashed', role: 'PM' },
        { email: 'pm.lee@specflow.io', name: '이기획', password: 'hashed', role: 'PLANNER' },
        { email: 'dev.park@specflow.io', name: '박개발', password: 'hashed', role: 'DEVELOPER' },
        { email: 'dev.choi@specflow.io', name: '최코딩', password: 'hashed', role: 'DEVELOPER' },
        { email: 'dev.jung@specflow.io', name: '정분석', password: 'hashed', role: 'DEVELOPER' },
        { email: 'qa.han@specflow.io', name: '한품질', password: 'hashed', role: 'QA' },
        { email: 'qa.yoon@specflow.io', name: '윤테스트', password: 'hashed', role: 'QA' },
        { email: 'biz.song@specflow.io', name: '송비즈', password: 'hashed', role: 'PLANNER' },
        { email: 'system@specflow.io', name: 'System', password: 'hashed', role: 'ADMIN' },
    ];
    
    const orgId = projects[0]?.organizationId || 'org-001';
    const createdUsers: any[] = [];
    for (const u of usersData) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: { name: u.name },
            create: { email: u.email, name: u.name, password: u.password, role: u.role as any, organizationId: orgId }
        });
        createdUsers.push(user);
    }
    console.log(`Created/Updated ${createdUsers.length} users.`);
    
    const userIds = createdUsers.map(u => u.id);

    console.log('Cleaning up old requirements...');
    await prisma.requirementHistory.deleteMany({});
    await prisma.qualityMetric.deleteMany({});
    await prisma.requirementClassification.deleteMany({});
    await prisma.aiMetadata.deleteMany({});
    await prisma.requirement.deleteMany({});
    console.log('Old requirements cleaned up.');

    // Helper to get random item
    // Helper to get random item
    const rand = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    // 2. Domain Vocabulary
    const vocabulary: Record<string, any> = {
        'Finance': {
            nouns: ['계좌', '이체', '대출', '신용한도', '자산', '투자', '환율', '결제', '정산', '카드'],
            verbs: ['조회', '생성', '갱신', '삭제', '승인', '거절', '검증', '계산', '분석', '리포트'],
            contexts: ['실시간', '배치', '모바일', '웹', 'API', '레거시 연동', '보안 강화', '규제 준수']
        },
        'Logistics': {
            nouns: ['배송', '주문', '재고', '창고', '운송장', '기사', '경로', '위치', '입고', '출고'],
            verbs: ['추적', '할당', '최적화', '스캔', '검수', '포장', '반품', '취소', '예약', '알림'],
            contexts: ['GPS 기반', '바코드', 'RFID', '자동화', '드론', '당일 배송', '콜드체인']
        },
        'Public': {
            nouns: ['민원', '증명서', '공고', '접수', '심사', '복지', '세금', '예산', '통계', '정책'],
            verbs: ['신청', '발급', '열람', '제출', '동의', '인증', '고객센터', '연계', '보존', '폐기'],
            contexts: ['대국민 서비스', '접근성 준수', '본인 인증', '전자 문서', '공공 데이터']
        },
        'Bio': {
            nouns: ['유전체', '임상', '후보물질', '실험', '데이터', '연구', '논문', '특허', '시약', '샘플'],
            verbs: ['분석', '시각화', '저장', '공유', '탐색', '대조', '필터링', '예측', '모델링', '검증'],
            contexts: ['대용량 처리', 'AI 추론', '보안 필수', '클라우드', '고성능 연산']
        },
        'Factory': {
            nouns: ['설비', '라인', '센서', '온도', '압력', '불량률', '생산량', '자재', '작업자', '경보'],
            verbs: ['모니터링', '제어', '수집', '감지', '예지보전', '스케줄링', '리포팅', '동기화', '교체', '점검'],
            contexts: ['실시간 스트리밍', 'IoT', '엣지 컴퓨팅', '안전 관리', '수율 최적화']
        }
    };

    // Map Projects to likely domains based on name
    const getDomain = (projName: string) => {
        if (projName.includes('뱅킹')) return 'Finance';
        if (projName.includes('물류')) return 'Logistics';
        if (projName.includes('공공')) return 'Public';
        if (projName.includes('신약')) return 'Bio';
        if (projName.includes('팩토리')) return 'Factory';
        return 'Finance'; // Default
    };

    const generatedReqs = [];
    const targetCount = 120; // Aim for 120 reqs

    for (let i = 0; i < targetCount; i++) {
        const project = rand(projects);
        const domainKey = getDomain(project.name);
        const vocab = vocabulary[domainKey];

        // Generate Title & Content
        const noun = rand(vocab.nouns);
        const verb = rand(vocab.verbs);
        const context = rand(vocab.contexts);
        
        const title = `${context} 환경에서의 ${noun} ${verb} 기능`;
        const content = `사용자가 시스템을 통해 ${noun} 정보를 ${verb}할 수 있어야 한다. 
주요 요구사항:
1. ${context} 기술을 활용하여 안정성을 확보할 것.
2. ${noun} 데이터의 무결성을 보장할 것.
3. 처리 결과에 대한 즉각적인 피드백을 제공할 것.`;

        // Pick Categories (1 Main, maybe 1 secondary)
        // Try to pick meaningful category based on context keywords? Or random for variety.
        // Let's bias: '보안' context -> SEC category. '성능' -> NFR.
        
        let targetCatCode = 'FUNC'; // Default Function
        if (title.includes('보안') || title.includes('인증')) targetCatCode = 'SEC';
        else if (title.includes('전송') || title.includes('API')) targetCatCode = 'INT';
        else if (title.includes('데이터') || title.includes('DB')) targetCatCode = 'DATA';
        else if (title.includes('모니터링') || title.includes('운영')) targetCatCode = 'OPS';
        else if (title.includes('UI') || title.includes('화면')) targetCatCode = 'UIUX';

        // Find the actual Category object (try to find specific child if possible, else parent)
        const candidates = categories.filter((c: any) => c.code?.startsWith(targetCatCode) || c.parentId === categories.find((p: any) => p.code === targetCatCode)?.id);
        const mainCategory = candidates.length > 0 ? rand(candidates) : categories[0];

        // Random Properties
        const statusList = ['DRAFT', 'REVIEW', 'APPROVED', 'DEPRECATED'];
        const priorityList = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        
        const status = rand(statusList);
        const priority = rand(priorityList);
        // Biased trust grade based on status
        let trustGrade = Math.random(); 
        if (status === 'APPROVED' || status === 'DONE') trustGrade = 0.8 + (Math.random() * 0.2); // 0.8 ~ 1.0

        // Random Model Source
        const models = ['gpt-4o', 'gpt-3.5-turbo', 'claude-3-opus', 'llama-3-70b', 'mistral-large'];
        const genModel = rand(models);

        // Create Requirement
        const req = await prisma.requirement.create({
            data: {
                code: `REQ-${domainKey.substring(0, 3).toUpperCase()}-${1000 + i}`,
                title,
                content: content,
                status: status as any,
                creatorId: 'sys-admin', // Assuming we have no proper users yet, or use NULL if optional
                trustGrade: parseFloat(trustGrade.toFixed(2)),
                version: 1,
                
                // Add AI Metadata
                aiMetadata: {
                    create: {
                        modelName: genModel,
                        reasoning: 'Automated extraction from legacy docs',
                        biasScore: Math.random() * 0.2
                    }
                }
            }
        });

        // Add Classification (Explicit Tags)
        // Scenario 1: Pure AI (Status DRAFT/PENDING)
        // Scenario 2: Mixed (Human verified some)
        
        const isVerified = (status === 'APPROVED' || status === 'DONE');
        const classModel = rand(models); // Classification might be done by a different model
        
        // 1. Add Main Category Classification
        await prisma.requirementClassification.create({
            data: {
                requirementId: req.id,
                categoryId: mainCategory.id,
                source: isVerified ? 'HUMAN' : 'AI',
                model: isVerified ? null : classModel, // Only AI has model
                confidence: isVerified ? 1.0 : (0.5 + Math.random() * 0.45) // 0.5 ~ 0.95
            }
        });

        // 2. Chance for Secondary Category (Pure AI suggestion usually)
        if (Math.random() > 0.7) {
            const secondary = rand(categories.filter((c:any) => c.id !== mainCategory.id));
            await prisma.requirementClassification.create({
                data: {
                    requirementId: req.id,
                    categoryId: secondary.id,
                    source: 'AI',
                    model: rand(models),
                    confidence: 0.3 + Math.random() * 0.4
                }
            });
        }
        
        // 3. Create Quality Metric for each requirement
        const ambiguity = 10 + Math.random() * 40; // 10-50 (lower is better for ambiguity)
        const redundancy = 5 + Math.random() * 35; // 5-40
        const completenessVal = 60 + Math.random() * 40; // 60-100
        const correctnessVal = 70 + Math.random() * 30; // 70-100
        const overallScore = (100 - ambiguity + 100 - redundancy + completenessVal + correctnessVal) / 4;
        
        await prisma.qualityMetric.create({
            data: {
                requirementId: req.id,
                ambiguityScore: parseFloat(ambiguity.toFixed(2)),
                redundancyScore: parseFloat(redundancy.toFixed(2)),
                completeness: parseFloat(completenessVal.toFixed(2)),
                correctness: parseFloat(correctnessVal.toFixed(2)),
                overallScore: parseFloat(overallScore.toFixed(2))
            }
        });
        
        // 4. Create Requirement History (simulate recent changes)
        const historyActions = ['status', 'content', 'title', 'priority'];
        const historyCount = randInt(0, 3);
        for (let h = 0; h < historyCount; h++) {
            const field = rand(historyActions);
            const changer = rand(userIds);
            const daysAgo = randInt(0, 30);
            
            await prisma.requirementHistory.create({
                data: {
                    requirementId: req.id,
                    changerId: changer,
                    field: field,
                    oldValue: field === 'status' ? 'DRAFT' : null,
                    newValue: field === 'status' ? status : null,
                    version: 1 + h,
                    createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
                }
            });
        }

        generatedReqs.push(req);
        if (i % 20 === 0) console.log(`Generated ${i} requirements...`);
    }

    console.log(`Successfully generated ${generatedReqs.length} realistic requirements with quality metrics and history.`);
    
    // 5. Seed Admin Alerts
    console.log('Seeding Admin Alerts...');
    const alertsData = [
        { title: '품질 점수 하락 경고', message: '최근 7일간 평균 품질 점수가 15% 하락했습니다.', severity: 'WARNING', isRead: false },
        { title: '리뷰 대기 요건 증가', message: '현재 25건의 요건이 리뷰 대기 중입니다. 처리가 필요합니다.', severity: 'INFO', isRead: false },
        { title: '중복 요건 감지', message: 'REQ-FIN-1023과 REQ-FIN-1045가 85% 유사합니다.', severity: 'WARNING', isRead: true },
        { title: 'AI 모델 업데이트 완료', message: 'GPT-4o 모델이 활성화되었습니다.', severity: 'INFO', isRead: true },
    ];
    
    for (const alert of alertsData) {
        await prisma.adminAlert.create({ data: alert });
    }
    console.log('Admin Alerts seeded.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
