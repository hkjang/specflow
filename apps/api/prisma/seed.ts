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
    
    // 0. Ensure Creator User Exists
    const creatorId = 'sys-admin';
    await prisma.user.upsert({
        where: { id: creatorId },
        update: {},
        create: {
            id: creatorId,
            email: 'admin@specflow.io',
            name: 'System Admin',
            password: 'hashed-password-placeholder', // In real app, hash this
            role: 'ADMIN',
            organizationId: projects[0]?.organizationId || 'org-001' // Fallback
        }
    });

    console.log('Cleaning up old requirements...');
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

        generatedReqs.push(req);
        if (i % 20 === 0) console.log(`Generated ${i} requirements...`);
    }

    console.log(`Successfully generated ${generatedReqs.length} realistic requirements.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
