
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INDUSTRIES = [
    { code: 'IND-FIN', name: '금융', description: '은행, 보험, 증권, 핀테크', keywords: ['은행', '보험', '증권', '계좌', '송금'] },
    { code: 'IND-MED', name: '의료', description: '병원, 의료기관, 의료정보', keywords: ['환자', '진료', '처방', '병원', '의사'] },
    { code: 'IND-BIO', name: '의학', description: '임상, 연구, 제약', keywords: ['임상', '연구', '실험', '제약', '신약'] },
    { code: 'IND-AUTO', name: '자동차', description: '완성차, 모빌리티, 자율주행', keywords: ['차량', '주행', '모빌리티', '센서'] },
    { code: 'IND-EST', name: '부동산', description: '중개, 분양, 자산관리', keywords: ['매물', '계약', '분양', '임대', '건물'] },
    { code: 'IND-RET', name: '유통', description: '커머스, 물류', keywords: ['주문', '배송', '재고', '상품', '물류'] },
    { code: 'IND-MAN', name: '제조', description: '공정, 설비', keywords: ['공정', '생산', '설비', '품질', '라인'] },
    { code: 'IND-PUB', name: '공공', description: '행정, 민원', keywords: ['민원', '행정', '서류', '신청', '정부'] },
    { code: 'IND-EDU', name: '교육', description: '학사, 학습', keywords: ['학생', '강의', '성적', '수강', '학교'] },
    { code: 'IND-TEL', name: '통신', description: '네트워크, 요금', keywords: ['요금', '데이터', '네트워크', '가입', '통화'] },
];

const DOMAINS = [
    { code: 'DOM-PROC', name: '업무 프로세스', description: '실제 업무 흐름' },
    { code: 'DOM-CUST', name: '고객 관리', description: '고객, 환자, 계약자' },
    { code: 'DOM-DATA', name: '데이터 관리', description: '마스터, 이력' },
    { code: 'DOM-REG', name: '규제 준수', description: '법, 가이드라인' },
    { code: 'DOM-SEC', name: '보안 인증', description: '접근 통제' },
    { code: 'DOM-BILL', name: '정산 과금', description: '요금, 수납' },
    { code: 'DOM-RPT', name: '리포트', description: '통계, 분석' },
    { code: 'DOM-INT', name: '연계 인터페이스', description: '외부 시스템' },
];

const FUNCTIONS = [
    { code: 'FUNC-READ', name: '조회', type: 'Function' },
    { code: 'FUNC-CREATE', name: '등록', type: 'Function' },
    { code: 'FUNC-UPDATE', name: '변경', type: 'Function' },
    { code: 'FUNC-DELETE', name: '삭제', type: 'Function' },
    { code: 'TECH-API', name: 'API', type: 'Technology' },
    { code: 'TECH-BATCH', name: '배치', type: 'Technology' },
    { code: 'TECH-REAL', name: '실시간', type: 'Technology' },
    { code: 'DATA-STR', name: '구조화 데이터', type: 'Data' },
    { code: 'DATA-UNSTR', name: '비정형 데이터', type: 'Data' },
    { code: 'AI-CLS', name: '분류', type: 'AI' },
    { code: 'AI-PRED', name: '예측', type: 'AI' },
    { code: 'UI-DASH', name: '대시보드', type: 'UI' },
    { code: 'OPS-MON', name: '모니터링', type: 'Operation' },
];

async function main() {
    console.log('Start seeding categories...');

    // 1. Seed Industries (Level 1)
    for (const ind of INDUSTRIES) {
        const industry = await prisma.category.upsert({
            where: { code: ind.code },
            update: {
                name: ind.name,
                description: ind.description,
                level: 'Industry',
                keywords: ind.keywords,
            },
            create: {
                code: ind.code,
                name: ind.name,
                description: ind.description,
                level: 'Industry',
                keywords: ind.keywords,
            },
        });
        console.log(`Upserted Industry: ${industry.name}`);

        // 2. Seed Domains (Level 2) - Children of this Industry
        // Ideally domains are reusable, but in a tree structure they depend on the parent.
        // However, the requirement 2-2 implies these are "Shared" or "Standard" domains.
        // If our Category model is a strict tree, we need to duplicate domains under each industry 
        // OR have a separate "Domain" root. 
        // The user request says "2차 업무 도메인" (Secondary Business Domain). 
        // Usually "Customer Management" in Finance vs Medical is different context but same category logic.
        // Let's create them as children of EACH industry for now to ensure the specific 3-level tree structure 
        // requested: "Industry -> Domain -> Function".
        // Or does the user mean a faceted classification? 
        // HIERARCHY PLAN: 
        // If I select "Finance" (L1), I then see "Customer" (L2), then "Register" (L3).
        // Yes, putting them under each Industry allows specific metadata if needed later.

        // BUT sharing them makes querying "All Customer Management requirements" easier.
        // Let's stick to the tree structure as implied by "1차", "2차".

        for (const dom of DOMAINS) {
            // Unique code per industry? E.g. IND-FIN-DOM-CUST
            // Or just link? Prisma Category uses `id`. `code` is unique.
            // If code is unique, we CANNOT reuse "DOM-CUST" for multiple parents.
            // So we must append Industry Code.
            const domainCode = `${ind.code}-${dom.code}`;

            const domain = await prisma.category.upsert({
                where: { code: domainCode },
                update: {
                    name: dom.name,
                    description: dom.description,
                    level: 'Domain',
                    parentId: industry.id
                },
                create: {
                    code: domainCode,
                    name: dom.name,
                    description: dom.description,
                    level: 'Domain',
                    parentId: industry.id
                }
            });

            // 3. Seed Functions (Level 3) - Children of Domain
            for (const func of FUNCTIONS) {
                const funcCode = `${domainCode}-${func.code}`;
                await prisma.category.upsert({
                    where: { code: funcCode },
                    update: {
                        name: func.name,
                        level: 'Function', // Or 'Function', 'Tech', etc. based on type
                        parentId: domain.id,
                        keywords: [func.type] // Store type in keywords for now or description?
                    },
                    create: {
                        code: funcCode,
                        name: func.name,
                        level: 'Function',
                        parentId: domain.id,
                        keywords: [func.type]
                    }
                });
            }
        }
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
